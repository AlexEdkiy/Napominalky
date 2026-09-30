#!/usr/bin/env python3
"""Exercise the first migration against disposable containers and dummy storage.

Requires the isolated napominalky_stage network/DB/Redis. Never reads production
credentials or modifies the host crontab. Keeps the fixture for inspection.
"""
import argparse
import json
from pathlib import Path
import shutil
import time

from migrate import migrate
from runtime import container_args, docker, request, smoke, verify
from switch import switch


def main(args):
    root = args.root.resolve()
    if root.exists():
        raise ValueError('Use a fresh rehearsal directory')
    root.mkdir(parents=True, mode=0o700)
    legacy, current = root / 'legacy', root / 'current'
    current.mkdir()
    manifest = verify(args.baseline.resolve())
    verify(args.release.resolve())
    shutil.copytree(args.baseline / 'backend', legacy / 'backend')
    for path in (legacy / 'backend').rglob('*'):
        path.chmod(0o755 if path.is_dir() else 0o644)
    shutil.copytree(args.baseline / 'web', legacy / 'web/dist')
    shutil.copyfile(args.baseline / 'nginx.conf', legacy / 'nginx.conf')
    shutil.copyfile(args.stage_env, legacy / 'backend/.env')
    (legacy / 'backend/.env').chmod(0o600)
    storage = legacy / 'backend/storage'
    marker = storage / 'app/private/before-migration.txt'
    marker.write_text('rehearsal: preserve existing upload\n')
    before = {
        'api_name': 'napominalky_rehearsal_api', 'web_name': 'napominalky_rehearsal_web',
        'network': 'napominalky_stage', 'env_file': str(legacy / 'backend/.env'),
        'storage': str(storage), 'api_port': '127.0.0.1:18002', 'web_port': '127.0.0.1:18083',
        'api_url': 'http://127.0.0.1:18002', 'web_url': 'http://127.0.0.1:18083',
    }
    for role in ('api', 'web'):
        name, command = container_args(before, legacy, manifest, role)
        command = [arg.replace('napominalky.managed=release', 'napominalky.managed=rehearsal-legacy')
                   .replace(f'src={legacy / "web"},', f'src={legacy / "web/dist"},') for arg in command]
        docker(*command)
        docker('start', name)
    time.sleep(2)
    smoke(before['api_url'], before['web_url'], manifest['release'])
    proxy_config = root / 'proxy.conf'
    proxy_config.write_text('''events {}
http {
    upstream rehearsal_api { server napominalky_rehearsal_api:8000; }
    upstream rehearsal_web { server napominalky_rehearsal_web:8080; }
    server {
        listen 8080;
        location /napominalki/api/ { proxy_pass http://rehearsal_api/api/; }
        location /napominalki/ { proxy_pass http://rehearsal_web; }
    }
}
''')
    proxy = 'napominalky_rehearsal_proxy'
    docker('run', '-d', '--name', proxy, '--label', 'napominalky.managed=rehearsal-proxy',
           '--network', 'napominalky_stage', '--publish', '127.0.0.1:18084:8080',
           '--mount', f'type=bind,src={proxy_config},dst=/etc/nginx/nginx.conf,readonly',
           manifest['images']['web'])
    fixture_cron = root / 'crontab'
    fixture_cron.write_text('# keep unrelated cron\n* * * * * docker exec napominalky_rehearsal_api '
                            'php artisan schedule:run >> /tmp/legacy-schedule.log 2>&1\n')
    config = dict(before, env_file=str(current / '.env'), storage=str(current / 'storage'),
                  proxy_container=proxy, public_web_url='http://127.0.0.1:18084',
                  cron_file=str(fixture_cron))
    config_file = current / 'target.json'
    config_file.write_text(json.dumps(config, indent=2) + '\n')
    old_ids = [docker('inspect', before[key], '--format', '{{.Id}}') for key in ['api_name', 'web_name']]
    migrate(config, args.release.resolve(), args.baseline.resolve(), legacy, *old_ids, current)
    assert (current / 'storage/app/private/before-migration.txt').read_text() == marker.read_text()
    assert (current / '.env').read_bytes() == (legacy / 'backend/.env').read_bytes()
    assert (current / '.env').stat().st_mode & 0o777 == 0o600
    assert fixture_cron.read_text().startswith('# keep unrelated cron\n')
    assert str(current / 'schedule.log') in fixture_cron.read_text()
    # Simulate a user write AFTER migration. Code rollback must preserve it.
    docker('exec', config['api_name'], 'php', '-r',
           'file_put_contents("storage/app/private/after-migration.txt", "new user data");')
    switch(config, args.baseline.resolve(), current / 'rollback.state.json')
    assert (current / 'storage/app/private/after-migration.txt').read_text() == 'new user data'
    body, _ = request(config['public_web_url'] + '/napominalki/release.json', 200)
    assert json.loads(body)['release'] == manifest['release']
    print('REHEARSAL PASSED: copied storage/environment, proxy routing, cron preservation, '
          'rollback with post-migration user data retained')


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--root', type=Path, required=True)
    parser.add_argument('--release', type=Path, required=True)
    parser.add_argument('--baseline', type=Path, required=True)
    parser.add_argument('--stage-env', type=Path, required=True)
    main(parser.parse_args())
