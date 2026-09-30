#!/usr/bin/env python3
"""One-time migration from the inspected legacy pair to versioned artifacts.

Application schema and database volumes are left unchanged. Before routing any
requests, failure restores the legacy pair. Once the new API can accept writes, recovery uses the
baseline artifact with the NEW shared storage, preserving concurrent user writes.
"""
import argparse
import fcntl
import json
from pathlib import Path
import shutil
import subprocess
import time

from runtime import docker, request, start, verify
from switch import reload_proxy, write_state


def read_cron(config):
    if config.get('cron_file'):
        return Path(config['cron_file']).read_text()
    return subprocess.check_output(['crontab', '-l'], text=True)


def install_cron(config, contents):
    if config.get('cron_file'):
        Path(config['cron_file']).write_text(contents)
    else:
        subprocess.run(['crontab', '-'], input=contents, text=True, check=True)


def remove_pair(config):
    for role in ('web', 'api'):
        name = config[role + '_name']
        result = subprocess.run(['docker', 'inspect', name], capture_output=True, text=True)
        if result.returncode == 0:
            info = json.loads(result.stdout)[0]
            if (info['Config'].get('Labels') or {}).get('napominalky.managed') != 'release':
                raise RuntimeError('Refusing to remove an unmanaged container')
            docker('rm', '-f', name)


def public_check(config, release_id):
    body, _ = request(config['public_web_url'] + '/napominalki/release.json', 200)
    if json.loads(body)['release'] != release_id:
        raise RuntimeError('Public endpoint serves a different release')
    request(config['public_web_url'] + '/napominalki/api/v1/auth/me', 401)


def migrate(config, release, baseline, legacy, expected_api, expected_web, directory):
    manifest, fallback = verify(release), verify(baseline)
    names = [config['api_name'], config['web_name']]
    old = [json.loads(docker('inspect', name))[0] for name in names]
    for info, expected in zip(old, [expected_api, expected_web]):
        if info['Id'] != expected or not info['State']['Running']:
            raise ValueError('Legacy container identity/state changed; inspect again')
        if (info['Config'].get('Labels') or {}).get('napominalky.managed') == 'release':
            raise ValueError('Already managed: use switch.py')
    expected_mounts = [(legacy / 'backend', '/var/www/html'),
                       (legacy / 'web/dist', '/usr/share/nginx/html/napominalki')]
    for info, (source, destination) in zip(old, expected_mounts):
        if not any(m['Source'] == str(source) and m['Destination'] == destination for m in info['Mounts']):
            raise ValueError('Unexpected legacy bind mount')
    if Path(config['storage']).exists() or Path(config['env_file']).exists():
        raise ValueError('Initial destination must be empty; no existing runtime data is overwritten')
    cron = read_cron(config)
    lines = [line for line in cron.splitlines() if line.startswith(f'* * * * * docker exec {config["api_name"]} ')]
    if len(lines) != 1 or 'schedule:run' not in lines[0]:
        raise ValueError('Expected exactly one known scheduler entry')
    stamp = time.strftime('%Y%m%d-%H%M%S', time.gmtime())
    backups = {name: name + '-legacy-' + stamp for name in names}
    old_cron = directory / ('crontab-before-' + stamp)
    old_cron.write_text(cron)
    old_cron.chmod(0o600)
    env_file = Path(config['env_file'])
    shutil.copyfile(legacy / 'backend/.env', env_file)
    env_file.chmod(0o600)
    log = directory / 'schedule.log'
    log.touch(mode=0o600)
    new_line = f'* * * * * docker exec {config["api_name"]} php artisan schedule:run >> {log} 2>&1'
    new_cron = cron.replace(lines[0], new_line)
    state_file = directory / 'migration.state.json'
    state = {'phase': 'prepared', 'target': str(release), 'baseline': str(baseline),
             'backups': backups, 'started_at': time.time(), 'old_cron': str(old_cron)}
    write_state(state_file, state)
    may_have_writes, renamed, attempted_start = False, [], False
    install_cron(config, cron.replace(lines[0], '# OPS-14 paused: ' + lines[0]))
    try:
        # Stop writes before copying storage. The schema, database and Redis volumes stay in place.
        docker('stop', '--time', '20', config['api_name'])
        storage = Path(config['storage'])
        storage.mkdir(parents=True)
        # A helper can read root-owned private files without Docker's stopped-container
        # archive path trying to recreate nested read-only .env mountpoints.
        docker('run', '--rm', '--network', 'none', '--read-only',
               '--mount', f'type=bind,src={legacy / "backend/storage"},dst=/source,readonly',
               '--mount', f'type=bind,src={storage},dst=/target',
               '--entrypoint', 'sh', manifest['images']['api'], '-c', 'cp -a /source/. /target/')
        for name in names:
            if name == config['web_name']:
                docker('stop', '--time', '20', name)
            docker('rename', name, backups[name])
            renamed.append(name)
        attempted_start = True
        # The published API port can accept writes before proxy reload completes.
        may_have_writes = True
        start(config, release)
        reload_proxy(config)
        public_check(config, manifest['release'])
        install_cron(config, new_cron)
        state['phase'] = 'active'
        state['finished_at'] = time.time()
        write_state(state_file, state)
    except BaseException:
        if attempted_start:
            remove_pair(config)
        if may_have_writes:
            # User writes may already exist in the new storage: never copy old data back.
            start(config, baseline)
            reload_proxy(config)
            public_check(config, fallback['release'])
            install_cron(config, new_cron)
            state['phase'] = 'baseline_restored_with_new_storage'
        else:
            for name in reversed(renamed):
                docker('rename', backups[name], name)
            for name in names:
                docker('start', name)
            reload_proxy(config)
            install_cron(config, cron)
            state['phase'] = 'legacy_restored_before_routing'
        state['finished_at'] = time.time()
        write_state(state_file, state)
        raise
    print(json.dumps(state))


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--release', type=Path, required=True)
    parser.add_argument('--baseline', type=Path, required=True)
    parser.add_argument('--config', type=Path, required=True)
    parser.add_argument('--legacy-root', type=Path, required=True)
    parser.add_argument('--expected-api-id', required=True)
    parser.add_argument('--expected-web-id', required=True)
    args = parser.parse_args()
    config_path = args.config.resolve()
    with config_path.with_suffix('.lock').open('w') as lock:
        fcntl.flock(lock, fcntl.LOCK_EX | fcntl.LOCK_NB)
        migrate(json.loads(config_path.read_text()), args.release.resolve(), args.baseline.resolve(),
                args.legacy_root.resolve(), args.expected_api_id, args.expected_web_id, config_path.parent)
