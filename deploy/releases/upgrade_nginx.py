#!/usr/bin/env python3
"""OPS-19: replace one snapshotted nginx container, preserving host settings and rollback."""
import argparse
import copy
import http.client
import json
import os
from pathlib import Path
import socket
import subprocess
import time
import urllib.parse

NAMES = ['napominalky_stage_web', 'reminders_web', 'napominalky_landing',
         'mafin-recovery', 'jemsoft-landing', 'nginx-proxy']


def docker(*args):
    return subprocess.check_output(['docker', *args], text=True).strip()


class UnixHTTP(http.client.HTTPConnection):
    def connect(self):
        self.sock = socket.socket(socket.AF_UNIX, socket.SOCK_STREAM)
        self.sock.connect('/var/run/docker.sock')


def api(method, path, payload=None):
    conn = UnixHTTP('localhost', timeout=45)
    conn.request(method, path, None if payload is None else json.dumps(payload),
                 {'Content-Type': 'application/json'})
    response = conn.getresponse()
    data = response.read().decode()
    conn.close()
    if response.status >= 300:
        raise RuntimeError(f'Docker {method} {path}: {response.status} {data}')
    return json.loads(data) if data else None


def write(path, data):
    tmp = path.with_suffix('.tmp')
    tmp.write_text(json.dumps(data, indent=2) + '\n')
    tmp.chmod(0o600)
    tmp.replace(path)


def endpoint(network, original, name, preserve_ip):
    result = {}
    if network != 'bridge':
        result['Aliases'] = original.get('Aliases') or [name]
        if preserve_ip:
            result['IPAMConfig'] = {'IPv4Address': original['IPAddress']}
            if original.get('GlobalIPv6Address'):
                result['IPAMConfig']['IPv6Address'] = original['GlobalIPv6Address']
        else:
            result['Aliases'] = [name]
    return result


def specification(old, image, candidate=False):
    config = copy.deepcopy(old['Config'])
    config['Image'] = image
    # Replace inherited image environment defaults; preserve explicit overrides.
    before = json.loads(docker('image', 'inspect', old['Image']))[0]['Config']
    after = json.loads(docker('image', 'inspect', image))[0]['Config']
    original_env = dict(v.split('=', 1) for v in before.get('Env') or [])
    target_env = dict(v.split('=', 1) for v in after.get('Env') or [])
    target_env.update({k: v for k, v in (e.split('=', 1) for e in config.get('Env') or [])
                       if original_env.get(k) != v})
    config['Env'] = [k + '=' + v for k, v in target_env.items()]
    labels = config.setdefault('Labels', {})
    labels['ops19.nginx_image'] = image
    if old['Name'] == '/napominalky_landing':
        labels['com.docker.compose.project.config_files'] = '/home/vselug/workspace/Napominalky-control/deploy/landing/compose.yml'
        labels['com.docker.compose.project.working_dir'] = '/home/vselug/workspace/Napominalky-control/deploy/landing'
    if 'com.docker.compose.image' in labels:
        labels['com.docker.compose.image'] = json.loads(docker('image', 'inspect', image))[0]['Id']
    config['HostConfig'] = copy.deepcopy(old['HostConfig'])
    host = config['HostConfig']
    if candidate:
        host['RestartPolicy'] = {'Name': 'no', 'MaximumRetryCount': 0}
        host['PortBindings'] = {port: [{'HostIp': '127.0.0.1', 'HostPort': ''}]
                                for port in host.get('PortBindings') or {}}
    name = old['Name'].lstrip('/') + ('-ops19-candidate' if candidate else '')
    config['NetworkingConfig'] = {'EndpointsConfig': {
        network: endpoint(network, settings, name, not candidate)
        for network, settings in old['NetworkSettings']['Networks'].items()}}
    return name, config


def restore(root, name):
    old = json.loads((root / (name + '.before.json')).read_text())
    backup = name + '-before-ops19'
    current = api('GET', '/containers/json?all=1')
    names = {n.lstrip('/'): row['Id'] for row in current for n in row['Names']}
    if backup not in names:
        raise RuntimeError('No OPS-19 backup; refusing to remove current container')
    if name in names:
        now = json.loads(docker('inspect', name))[0]
        if now['Config'].get('Labels', {}).get('ops19.nginx_image') is None:
            raise RuntimeError('Current container is not an OPS-19 replacement')
        docker('rm', '-f', name)
    attached = json.loads(docker('inspect', backup))[0]['NetworkSettings']['Networks']
    for network, settings in old['NetworkSettings']['Networks'].items():
        if network not in attached:
            api('POST', '/networks/' + network + '/connect', {
                'Container': backup, 'EndpointConfig': endpoint(network, settings, name, True)})
    docker('rename', backup, name)
    docker('start', name)
    docker('exec', name, 'nginx', '-t')
    write(root / (name + '.state.json'), {'phase': 'restored', 'time': time.time()})


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('action', choices=['snapshot', 'candidate', 'apply', 'rollback'])
    parser.add_argument('--root', type=Path, required=True)
    parser.add_argument('--image')
    parser.add_argument('--name', choices=NAMES)
    args = parser.parse_args()
    root = args.root
    if args.action == 'snapshot':
        root.mkdir(mode=0o700, parents=True, exist_ok=False)
        rows = json.loads(docker('inspect', *NAMES))
        for old in rows:
            if not old['State']['Running']:
                raise RuntimeError('All source containers must be running')
            write(root / (old['Name'].lstrip('/') + '.before.json'), old)
        write(root / 'all-containers.before.json', json.loads(docker('inspect', *docker('ps', '-q').split())))
        print('Saved private snapshots:', root)
        return
    if not args.name:
        parser.error('--name required')
    if args.action == 'rollback':
        restore(root, args.name)
        return
    if not args.image or '@sha256:' not in args.image:
        parser.error('Use a registry image pinned by digest')
    old = json.loads((root / (args.name + '.before.json')).read_text())
    name, spec = specification(old, args.image, args.action == 'candidate')
    if args.action == 'candidate':
        new = api('POST', '/containers/create?name=' + name, spec)
        try:
            docker('start', name)
            docker('exec', name, 'nginx', '-t')
            version = docker('exec', name, 'nginx', '-v')
            write(root / (args.name + '.candidate.json'), {'id': new['Id'], 'image': args.image,
                                                          'version': version, 'passed': True})
            print(json.dumps({'candidate': name, 'ports': docker('port', name)}))
        except BaseException:
            docker('rm', '-f', new['Id'])
            raise
        return
    preflight = json.loads((root / (name + '.candidate.json')).read_text())
    if preflight['image'] != args.image or not preflight['passed']:
        raise RuntimeError('Matching candidate validation required')
    current = json.loads(docker('inspect', name))[0]
    if current['Id'] != old['Id'] or not current['State']['Running']:
        raise RuntimeError('Source changed since snapshot')
    backup = name + '-before-ops19'
    write(root / (name + '.desired.json'), spec)
    write(root / (name + '.state.json'), {'phase': 'prepared', 'backup': backup, 'time': time.time()})
    renamed = False
    try:
        docker('stop', '--time', '20', name)
        docker('rename', name, backup)
        renamed = True
        for network in old['NetworkSettings']['Networks']:
            docker('network', 'disconnect', network, backup)
        new = api('POST', '/containers/create?name=' + urllib.parse.quote(name), spec)
        docker('start', name)
        docker('exec', name, 'nginx', '-t')
        write(root / (name + '.state.json'), {'phase': 'active', 'backup': backup,
                                             'id': new['Id'], 'image': args.image, 'time': time.time()})
        print(json.dumps({'updated': name, 'id': new['Id'], 'image': args.image}))
    except BaseException:
        if renamed:
            restore(root, name)
        else:
            docker('start', name)
        raise


if __name__ == '__main__':
    os.umask(0o077)
    main()
