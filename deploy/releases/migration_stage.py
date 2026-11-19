#!/usr/bin/env python3
"""OPS-18: validate a runtime on disposable target-host infrastructure only."""
import argparse
import base64
import json
import os
from pathlib import Path
import subprocess
import time

from runtime import docker, start, verify

PG = 'sha256:979c4379dd698aba0b890599a6104e082035f98ef31d9b9291ec22f2b13059ca'
REDIS = 'sha256:7f7d30b7fdd09467bac58198a1f166dd69789d348d4fe859cccb20e0cf287fbe'
NETWORK = 'napominalky_migration_stage'


def main(release, root):
    manifest = verify(release)
    if root.exists():
        raise ValueError('Use a fresh staging directory')
    root.mkdir(mode=0o700, parents=True)
    docker('network', 'create', '--internal', NETWORK)
    docker('network', 'create', NETWORK + '_frontend')
    docker('run', '-d', '--name', 'napominalky_stage_db', '--network', NETWORK,
           '--network-alias', 'db', '--tmpfs', '/var/lib/postgresql/data:rw,size=256m',
           '-e', 'POSTGRES_USER=reminders', '-e', 'POSTGRES_PASSWORD=secret',
           '-e', 'POSTGRES_DB=reminders_test', PG)
    docker('run', '-d', '--name', 'napominalky_stage_redis', '--network', NETWORK,
           '--network-alias', 'redis', '--read-only', '--tmpfs', '/data:rw,size=32m',
           REDIS, 'redis-server', '--save', '', '--appendonly', 'no')
    for _ in range(40):
        ready = subprocess.run(['docker', 'exec', 'napominalky_stage_db',
                                'pg_isready', '-U', 'reminders', '-d', 'reminders_test'],
                               stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        if ready.returncode == 0:
            break
        time.sleep(.5)
    else:
        raise RuntimeError('Stage DB not ready')
    env = root / '.env'
    env.write_text('APP_NAME="Reminders App"\nAPP_ENV=testing\nAPP_DEBUG=false\n'
                   'APP_KEY=base64:' + base64.b64encode(os.urandom(32)).decode() + '\n'
                   'APP_URL=http://127.0.0.1:18100\nLOG_CHANNEL=stderr\n'
                   'DB_CONNECTION=pgsql\nDB_HOST=db\nDB_PORT=5432\n'
                   'DB_DATABASE=reminders_test\nDB_USERNAME=reminders\nDB_PASSWORD=secret\n'
                   'CACHE_STORE=redis\nREDIS_CLIENT=phpredis\nREDIS_HOST=redis\n'
                   'SESSION_DRIVER=file\nQUEUE_CONNECTION=sync\nMAIL_MAILER=array\n')
    env.chmod(0o600)
    test = ['run', '--rm', '--name', 'napominalky_stage_tests', '--network', NETWORK,
            '--read-only', '--mount', f'type=bind,src={release / "backend"},dst=/var/www/html,readonly',
            '--mount', f'type=bind,src={env},dst=/var/www/html/.env,readonly',
            '--tmpfs', '/tmp:rw,nosuid,size=64m',
            '--tmpfs', '/var/www/html/bootstrap/cache:rw,size=16m',
            '--tmpfs', '/var/www/html/storage:rw,size=128m',
            '--env', 'APP_ENV=testing', '--env', 'APP_DEBUG=false',
            '--entrypoint', 'sh', manifest['images']['api'], '-ec',
            'mkdir -p storage/framework/cache/data storage/framework/sessions storage/framework/views storage/logs; '
            'php vendor/bin/pest --ci --compact --cache-directory=/tmp/phpunit-cache']
    with (root / 'backend-tests.log').open('w') as log:
        subprocess.run(['docker', *test], stdout=log, stderr=subprocess.STDOUT, check=True)
    storage = root / 'storage'
    for name in ['app/public', 'app/private', 'framework/cache/data', 'framework/sessions',
                 'framework/views', 'logs']:
        (storage / name).mkdir(parents=True, exist_ok=True)
    config = dict(api_name='napominalky_stage_api', web_name='napominalky_stage_web',
                  network=NETWORK, proxy_network=NETWORK + '_frontend', env_file=str(env), storage=str(storage),
                  api_port='127.0.0.1:18100', web_port='127.0.0.1:18182',
                  api_url='http://127.0.0.1:18100', web_url='http://127.0.0.1:18182')
    (root / 'target.json').write_text(json.dumps(config, indent=2) + '\n')
    start(config, release)
    print('Isolated backend tests and root/legacy runtime smoke passed')


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--release', type=Path, required=True)
    parser.add_argument('--root', type=Path, required=True)
    args = parser.parse_args()
    main(args.release.resolve(), args.root.resolve())
