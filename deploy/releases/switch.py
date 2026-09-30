#!/usr/bin/env python3
"""Switch a managed deployment, retaining the previous pair and restoring it on failure."""
import argparse
import fcntl
import json
import os
from pathlib import Path
import subprocess
import time
import uuid

from runtime import docker, smoke, start, verify


def write_state(path, value):
    temporary = path.with_suffix('.tmp')
    temporary.write_text(json.dumps(value, indent=2) + '\n')
    os.replace(temporary, path)


def reload_proxy(config):
    if config.get('proxy_container'):
        docker('exec', config['proxy_container'], 'nginx', '-t')
        docker('exec', config['proxy_container'], 'nginx', '-s', 'reload')


def switch(config, release, state_file):
    manifest = verify(release)
    names = [config['api_name'], config['web_name']]
    previous = [json.loads(docker('inspect', name))[0] for name in names]
    previous_releases = set()
    for old in previous:
        labels = old['Config'].get('Labels') or {}
        if labels.get('napominalky.managed') != 'release' or not old['State']['Running']:
            raise ValueError('switch only accepts a running managed pair; use the migration runbook for legacy')
        previous_releases.add(labels['napominalky.release'])
    if len(previous_releases) != 1:
        raise ValueError('API and web must be on the same release before switching')
    old_release = previous_releases.pop()
    suffix = '-previous-' + uuid.uuid4().hex[:8]
    backups = {name: name + suffix for name in names}
    journal = {'phase': 'prepared', 'previous': old_release, 'target': manifest['release'],
               'backups': backups, 'config_names': names, 'started_at': time.time()}
    write_state(state_file, journal)
    renamed = []
    new_ready = False
    try:
        for name in names:
            docker('stop', '--time', '20', name)
            docker('rename', name, backups[name])
            renamed.append(name)
        start(config, release)
        new_ready = True
        reload_proxy(config)
        if config.get('public_web_url'):
            from runtime import request
            body, _ = request(config['public_web_url'] + '/napominalki/release.json', 200)
            if json.loads(body)['release'] != manifest['release']:
                raise RuntimeError('Public proxy still serves the wrong release')
        journal['phase'] = 'active'
        journal['finished_at'] = time.time()
        write_state(state_file, journal)
    except BaseException:
        # start() removes its own partially created containers. After successful start,
        # remove only this newly created pair; never delete the saved deployment.
        if new_ready:
            for name in reversed(names):
                docker('rm', '-f', name)
        for name in reversed(renamed):
            docker('rename', backups[name], name)
        for name in names:
            docker('start', name)
        reload_proxy(config)
        smoke(config['api_url'], config['web_url'], old_release)
        journal['phase'] = 'restored_after_failure'
        journal['finished_at'] = time.time()
        write_state(state_file, journal)
        raise
    print(json.dumps(journal))


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--release', type=Path, required=True)
    parser.add_argument('--config', type=Path, required=True)
    args = parser.parse_args()
    config_path = args.config.resolve()
    with config_path.with_suffix('.lock').open('w') as lock:
        fcntl.flock(lock, fcntl.LOCK_EX | fcntl.LOCK_NB)
        switch(json.loads(config_path.read_text()), args.release.resolve(),
               config_path.with_suffix('.state.json'))
