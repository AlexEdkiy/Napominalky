#!/usr/bin/env python3
"""OPS-22: guarded patch upgrade of reminders_redis, using its current data volume."""
import argparse
import hashlib
import json
import os
from pathlib import Path
import re
import shutil
import subprocess
import time

from upgrade_nginx import api, docker, endpoint, specification, write

NAME = 'reminders_redis'
BACKUP = NAME + '-before-ops22'
CANDIDATE = NAME + '-ops22-candidate'
IMAGE = 'redis:7.4.12-alpine@sha256:7f7d30b7fdd09467bac58198a1f166dd69789d348d4fe859cccb20e0cf287fbe'


def redis(name, *args):
    return subprocess.check_output(['docker', 'exec', name, 'redis-cli', '--json', *args], text=True)


def inventory(name):
    info = docker('exec', name, 'redis-cli', 'INFO', 'keyspace')
    rows = []
    for db in re.findall(r'^db(\d+):', info, re.M):
        cursor = '0'
        while True:
            cursor, keys = json.loads(redis(name, '-n', db, 'SCAN', cursor, 'COUNT', '100'))
            for key in keys:
                value = subprocess.check_output(['docker', 'exec', name, 'redis-cli',
                                                 '-n', db, '--raw', 'DUMP', key])
                rows.append({'db': db, 'key_hash': hashlib.sha256(key.encode()).hexdigest(),
                             'dump_hash': hashlib.sha256(value).hexdigest(),
                             'pttl': json.loads(redis(name, '-n', db, 'PTTL', key))})
            if str(cursor) == '0':
                break
    return sorted(rows, key=lambda x: (x['db'], x['key_hash']))


def verify_preserved(before, after, elapsed=0):
    actual = {(r['db'], r['key_hash']): r for r in after}
    for row in before:
        if 0 <= row['pttl'] <= elapsed * 1000:
            continue  # A normally expired key need not survive.
        now = actual.get((row['db'], row['key_hash']))
        if now is None or now['dump_hash'] != row['dump_hash']:
            raise RuntimeError('Redis data fingerprint mismatch')


def ready(name):
    deadline = time.monotonic() + 20
    while time.monotonic() < deadline:
        try:
            if json.loads(redis(name, 'PING')) == 'PONG':
                return
        except (subprocess.CalledProcessError, ValueError):
            pass
        time.sleep(0.25)
    raise RuntimeError('Redis did not become ready')


def candidate(root, image):
    data = root / 'candidate-data'
    data.mkdir(mode=0o700)
    shutil.copy2(root / 'dump.preflight.rdb', data / 'dump.rdb')
    os.chown(data, 999, 1000)
    os.chown(data / 'dump.rdb', 999, 1000)
    before = inventory(NAME)
    write(root / 'candidate-source-inventory.json', before)
    docker('run', '-d', '--name', CANDIDATE, '--network', 'none', '--user', '999:1000',
           '--cap-drop', 'ALL', '--security-opt', 'no-new-privileges', '--read-only',
           '--mount', f'type=bind,src={data},dst=/data', image,
           'redis-server', '--dir', '/data', '--save', '', '--appendonly', 'no')
    ready(CANDIDATE)
    after = inventory(CANDIDATE)
    verify_preserved(before, after)
    version = docker('exec', CANDIDATE, 'redis-server', '--version')
    if 'v=7.4.12 ' not in version:
        raise RuntimeError('Unexpected Redis version')
    write(root / 'candidate.json', {'passed': True, 'image': image, 'version': version,
                                     'data_keys': len(after), 'network': 'none'})
    print('Isolated candidate loaded and preserved', len(after), 'keys;', version)


def apply(root, image):
    old = json.loads((root / 'reminders_redis.before.private.json').read_text())
    preflight = json.loads((root / 'candidate.json').read_text())
    integration = json.loads((root / 'laravel-candidate.json').read_text())
    if not preflight['passed'] or preflight['image'] != image or not integration['passed']:
        raise RuntimeError('Matching candidate and Laravel checks required')
    current = json.loads(docker('inspect', NAME))[0]
    if current['Id'] != old['Id'] or not current['State']['Running']:
        raise RuntimeError('Source changed since snapshot')
    if current['HostConfig']['PortBindings']:
        raise RuntimeError('Expected Redis without published ports')
    names = {n for row in api('GET', '/containers/json?all=1') for n in row['Names']}
    if '/' + BACKUP in names:
        raise RuntimeError('Backup container already exists')
    _, spec = specification(old, image)
    spec['Labels'].pop('ops19.nginx_image', None)
    spec['Labels']['ops22.redis_image'] = image
    write(root / 'desired.private.json', spec)
    write(root / 'state.json', {'phase': 'prepared', 'time': time.time()})
    renamed = False
    new_id = None
    started = time.monotonic()
    try:
        # Briefly queue writes so the before-fingerprint and shutdown snapshot agree.
        redis(NAME, 'CLIENT', 'PAUSE', '60000', 'WRITE')
        before = inventory(NAME)
        write(root / 'cutover-inventory-before.json', before)
        if json.loads(redis(NAME, 'SAVE')) != 'OK':
            raise RuntimeError('Final Redis snapshot failed')
        docker('stop', '--timeout', '30', NAME)
        docker('cp', NAME + ':/data/dump.rdb', str(root / 'dump.cutover.rdb'))
        docker('rename', NAME, BACKUP)
        renamed = True
        docker('update', '--restart=no', BACKUP)
        for network in old['NetworkSettings']['Networks']:
            docker('network', 'disconnect', network, BACKUP)
        new_id = api('POST', '/containers/create?name=' + NAME, spec)['Id']
        docker('start', NAME)
        ready(NAME)
        after = inventory(NAME)
        verify_preserved(before, after, time.monotonic() - started)
        write(root / 'cutover-inventory-after.json', after)
        write(root / 'state.json', {'phase': 'active', 'id': new_id, 'image': image,
                                    'keys_preserved': len(before),
                                    'cutover_seconds': time.monotonic() - started,
                                    'time': time.time()})
        print('Redis upgraded; current volume and key fingerprints preserved.')
    except BaseException:
        # Roll back the executable only; never replace live data with an old snapshot.
        if new_id:
            docker('stop', '--timeout', '20', new_id)
            for network in old['NetworkSettings']['Networks']:
                docker('network', 'disconnect', network, new_id)
            docker('update', '--restart=no', new_id)
            docker('rename', new_id, NAME + '-failed-ops22-' + str(int(time.time())))
        if renamed:
            attached = json.loads(docker('inspect', BACKUP))[0]['NetworkSettings']['Networks']
            for network, settings in old['NetworkSettings']['Networks'].items():
                if network not in attached:
                    api('POST', '/networks/' + network + '/connect', {
                        'Container': BACKUP, 'EndpointConfig': endpoint(network, settings, NAME, True)})
            docker('rename', BACKUP, NAME)
        docker('update', '--restart=' + old['HostConfig']['RestartPolicy']['Name'], NAME)
        docker('start', NAME)
        redis(NAME, 'CLIENT', 'UNPAUSE')
        ready(NAME)
        write(root / 'state.json', {'phase': 'restored', 'time': time.time()})
        raise


if __name__ == '__main__':
    os.umask(0o077)
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('action', choices=['candidate', 'apply'])
    parser.add_argument('--root', type=Path, required=True)
    parser.add_argument('--image', required=True)
    args = parser.parse_args()
    if args.image != IMAGE:
        parser.error('Use the verified official Redis 7.4.12 Alpine digest')
    (candidate if args.action == 'candidate' else apply)(args.root.resolve(), args.image)
