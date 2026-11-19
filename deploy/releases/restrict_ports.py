#!/usr/bin/env python3
"""OPS-20: recreate only approved containers with private loopback publications."""
import argparse
import copy
import json
from pathlib import Path
import subprocess
import time
from upgrade_nginx import api, docker, endpoint, write

NAMES = ['insure_postgres', 'insure_redis', 'insure_api', 'insure_gateway',
         'insure_web', 'reminders_serve', 'jemsoft-landing']


def spec(old):
    name = old['Name'].lstrip('/')
    result = copy.deepcopy(old['Config'])
    result['Image'] = old['Image']
    result.setdefault('Labels', {})['ops20.private_ports'] = 'true'
    host = result['HostConfig'] = copy.deepcopy(old['HostConfig'])
    for bindings in host['PortBindings'].values():
        for binding in bindings:
            binding['HostIp'] = '127.0.0.1'
    # Docker must reuse anonymous volumes too, not silently allocate empty data.
    explicit = {bind.split(':')[1] for bind in host.get('Binds') or []}
    explicit.update(m['Target'] for m in host.get('Mounts') or [])
    for mount in old['Mounts']:
        if mount['Type'] == 'volume' and mount['Destination'] not in explicit:
            host.setdefault('Mounts', []).append({
                'Type': 'volume', 'Source': mount['Name'], 'Target': mount['Destination'],
                'ReadOnly': not mount['RW']})
    result['NetworkingConfig'] = {'EndpointsConfig': {
        network: endpoint(network, settings, name, True)
        for network, settings in old['NetworkSettings']['Networks'].items()}}
    return result


def check(name):
    deadline = time.monotonic() + 45
    while time.monotonic() < deadline:
        current = json.loads(docker('inspect', name))[0]
        if not current['State']['Running']:
            time.sleep(0.5)
            continue
        if current['State'].get('Health', {}).get('Status', 'healthy') == 'healthy':
            return current
        time.sleep(1)
    raise RuntimeError('Container did not become ready: ' + name)


def rollback(root, name):
    if name == 'insure_redis':
        raise RuntimeError('Old Redis contains suspicious files; do not restart it. Keep evidence and recover from the clean image using the preserved data volume.')
    old = json.loads((root / (name + '.before.json')).read_text())
    backup = name + '-before-ops20'
    saved = json.loads(docker('inspect', backup))[0]
    assert saved['Id'] == old['Id']
    running = subprocess.run(['docker', 'inspect', name], capture_output=True, text=True)
    if running.returncode == 0:
        current = json.loads(running.stdout)[0]
        assert current['Config'].get('Labels', {}).get('ops20.private_ports') == 'true'
        docker('rm', '-f', name)
    attached = json.loads(docker('inspect', backup))[0]['NetworkSettings']['Networks']
    for network, settings in old['NetworkSettings']['Networks'].items():
        if network not in attached:
            api('POST', '/networks/' + network + '/connect', {
                'Container': backup, 'EndpointConfig': endpoint(network, settings, name, True)})
    docker('rename', backup, name)
    docker('start', name)
    check(name)
    write(root / (name + '.state.json'), {'phase': 'restored', 'time': time.time()})


def apply(root, name):
    old = json.loads((root / (name + '.before.json')).read_text())
    current = json.loads(docker('inspect', name))[0]
    assert current['Id'] == old['Id'] and current['State']['Running'], 'Source changed'
    desired = spec(old)
    write(root / (name + '.desired.json'), desired)
    backup = name + '-before-ops20'
    write(root / (name + '.state.json'), {'phase': 'prepared', 'backup': backup})
    renamed = False
    try:
        docker('stop', '--time', '30', name)
        docker('rename', name, backup)
        renamed = True
        for network in old['NetworkSettings']['Networks']:
            docker('network', 'disconnect', network, backup)
        new = api('POST', '/containers/create?name=' + name, desired)
        docker('start', name)
        actual = check(name)
        # Verify the exact existing storage, not just mount destinations.
        signature = lambda i: sorted((m['Type'], m['Source'], m['Destination'], m['RW']) for m in i['Mounts'])
        assert signature(actual) == signature(old), 'Storage changed'
        write(root / (name + '.state.json'), {'phase': 'active', 'id': new['Id'],
                                             'backup': backup, 'time': time.time()})
        print(json.dumps({'updated': name, 'ports': actual['HostConfig']['PortBindings'],
                          'storage_preserved': True}), flush=True)
    except BaseException:
        if renamed and name != 'insure_redis':
            rollback(root, name)
        elif not renamed:
            docker('start', name)
        raise


if __name__ == '__main__':
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument('action', choices=['apply', 'rollback'])
    p.add_argument('--root', type=Path, required=True)
    p.add_argument('--name', choices=NAMES, required=True)
    args = p.parse_args()
    (apply if args.action == 'apply' else rollback)(args.root, args.name)
