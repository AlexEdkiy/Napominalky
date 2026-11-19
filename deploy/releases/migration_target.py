#!/usr/bin/env python3
"""OPS-18 target-only bootstrap; restores a frozen snapshot, never modifies source."""
import argparse
import hashlib
import json
import os
from pathlib import Path
import secrets
import shutil
import subprocess
import tarfile
import time

from migration_stage import PG, REDIS
from redis_acl import COMMANDS, PREFIX, HEALTH
from runtime import docker, verify

ROOT = Path('/srv/napominalky')


def private(path, content):
    path.parent.mkdir(parents=True, exist_ok=True, mode=0o700)
    with path.open('x') as output:
        path.chmod(0o600)
        output.write(content)


def bootstrap(release):
    verify(release)
    production = ROOT / 'production'
    if production.exists():
        raise ValueError('Production already exists; do not overwrite data')
    production.mkdir(parents=True, mode=0o700)
    creds = {name: secrets.token_hex(32) for name in ['postgres', 'database', 'app', 'health', 'operator']}
    private(ROOT / 'private/credentials.json', json.dumps(creds))
    private(ROOT / 'private/postgres.password', creds['postgres'])
    acl = production / 'redis-acl'
    acl.mkdir(mode=0o750)
    os.chown(acl, 0, 1000)
    hashes = {name: '#' + hashlib.sha256(value.encode()).hexdigest() for name, value in creds.items()}
    rules = ['user default reset off',
             'user operator reset on ' + hashes['operator'] + ' ~* &* +@all',
             'user health reset on ' + hashes['health'] + ' -@all +ping',
             'user app reset on ' + hashes['app'] + ' ~' + PREFIX + '* -@all ' + ' '.join('+' + c for c in COMMANDS)]
    for name, value in [('users.acl', '\n'.join(rules) + '\n'), ('health.password', creds['health'] + '\n')]:
        private(acl / name, value)
        os.chown(acl / name, 0, 1000)
        (acl / name).chmod(0o640)
    docker('network', 'create', '--internal', 'napominalky_backend')
    docker('network', 'create', 'napominalky_frontend')
    docker('volume', 'create', 'napominalky_postgres')
    docker('volume', 'create', 'napominalky_redis')
    docker('run', '-d', '--name', 'reminders_db', '--restart', 'unless-stopped',
           '--network', 'napominalky_backend', '--network-alias', 'db',
           '--mount', 'type=volume,src=napominalky_postgres,dst=/var/lib/postgresql/data',
           '--mount', f'type=bind,src={ROOT / "private/postgres.password"},dst=/run/secrets/postgres-password,readonly',
           '-e', 'POSTGRES_USER=postgres', '-e', 'POSTGRES_PASSWORD_FILE=/run/secrets/postgres-password',
           '--health-cmd', 'pg_isready -U postgres -d postgres',
           '--health-interval', '10s', '--health-timeout', '3s', '--health-retries', '5', PG)
    for _ in range(60):
        if subprocess.run(['docker', 'exec', 'reminders_db', 'pg_isready', '-U', 'postgres'],
                          stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL).returncode == 0:
            break
        time.sleep(.5)
    else:
        raise RuntimeError('Production DB did not become ready')
    # Generated hex password is not put on the command line or printed.
    sql = ("CREATE ROLE reminders LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION "
           "NOBYPASSRLS PASSWORD '" + creds['database'] + "';\n"
           'CREATE DATABASE reminders OWNER reminders;\n')
    subprocess.run(['docker', 'exec', '-i', 'reminders_db', 'psql', '-v', 'ON_ERROR_STOP=1',
                    '-U', 'postgres', '-d', 'postgres'], input=sql, text=True,
                   stdout=subprocess.DEVNULL, check=True)
    config = dict(api_name='reminders_serve', web_name='reminders_web',
                  network='napominalky_backend', proxy_network='napominalky_frontend',
                  env_file=str(production / '.env'), storage=str(production / 'storage'),
                  api_port='127.0.0.1:18000', web_port='127.0.0.1:18082',
                  api_url='http://127.0.0.1:18000', web_url='http://127.0.0.1:18082',
                  public_web_url='https://lk.napominalky.ru', public_web_base='/')
    private(production / 'target.json', json.dumps(config, indent=2) + '\n')
    print('Target networks, empty DB, limited application role and fresh credentials prepared')


def restore(snapshot):
    production = ROOT / 'production'
    if (production / '.env').exists() or (production / 'storage').exists():
        raise ValueError('Production data already installed; refusing overwrite')
    manifest = json.loads((snapshot / 'snapshot-manifest.json').read_text())
    for name, expected in manifest['files'].items():
        if Path(name).name != name:
            raise ValueError('Invalid snapshot path')
        with (snapshot / name).open('rb') as source:
            if hashlib.file_digest(source, 'sha256').hexdigest() != expected:
                raise ValueError('Snapshot checksum mismatch: ' + name)
    creds = json.loads((ROOT / 'private/credentials.json').read_text())
    lines = (snapshot / 'application.env').read_text().splitlines()
    replace = {'APP_ENV': 'production', 'APP_DEBUG': 'false', 'DB_HOST': 'db',
               'DB_DATABASE': 'reminders', 'DB_USERNAME': 'reminders',
               'DB_PASSWORD': creds['database'], 'REDIS_HOST': 'redis',
               'REDIS_USERNAME': 'app', 'REDIS_PASSWORD': creds['app'],
               'REDIS_ACL_DIR': str(production / 'redis-acl')}
    lines = [line for line in lines if line.split('=', 1)[0] not in replace]
    private(production / '.env', '\n'.join(lines + [k + '=' + v for k, v in replace.items()]) + '\n')
    with (snapshot / 'database.dump').open('rb') as dump:
        subprocess.run(['docker', 'exec', '-i', 'reminders_db', 'pg_restore', '--exit-on-error',
                        '--no-owner', '--no-acl', '-U', 'reminders', '-d', 'reminders'],
                       stdin=dump, check=True)
    with tarfile.open(snapshot / 'storage.tar.gz') as archive:
        for item in archive.getmembers():
            if not item.name.startswith('storage/') and item.name != 'storage':
                raise ValueError('Unexpected storage member')
            if item.issym() or item.islnk() or item.isdev():
                raise ValueError('Unexpected special storage file')
        archive.extractall(production, filter='data')
    for name in ['app/public', 'app/private', 'framework/cache/data', 'framework/sessions',
                 'framework/views', 'logs']:
        (production / 'storage' / name).mkdir(parents=True, exist_ok=True)
    # Restore into an unused named volume before starting Redis.
    volume = Path(docker('volume', 'inspect', 'napominalky_redis', '--format', '{{.Mountpoint}}'))
    if list(volume.iterdir()):
        raise ValueError('Redis volume is not empty')
    shutil.copyfile(snapshot / 'redis.rdb', volume / 'dump.rdb')
    os.chown(volume / 'dump.rdb', 999, 1000)
    (volume / 'dump.rdb').chmod(0o600)
    docker('run', '-d', '--name', 'reminders_redis', '--restart', 'unless-stopped',
           '--network', 'napominalky_backend', '--network-alias', 'redis', '--read-only',
           '--mount', 'type=volume,src=napominalky_redis,dst=/data',
           '--mount', f'type=bind,src={production / "redis-acl"},dst=/run/redis-acl,readonly',
           '--tmpfs', '/tmp:rw,noexec,nosuid,size=8m', '--health-cmd', HEALTH[1],
           '--health-interval', '10s', '--health-timeout', '3s', '--health-retries', '5',
           REDIS, 'redis-server', '--save', '60', '1', '--loglevel', 'warning',
           '--aclfile', '/run/redis-acl/users.acl')
    print('Snapshot restored; API and scheduler remain stopped pending verification')


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('command', choices=['bootstrap', 'restore'])
    parser.add_argument('--release', type=Path)
    parser.add_argument('--snapshot', type=Path)
    args = parser.parse_args()
    if os.geteuid() != 0:
        raise ValueError('Run as root on the authorized target host')
    if args.command == 'bootstrap':
        if args.release is None:
            parser.error('--release is required')
        bootstrap(args.release.resolve())
    else:
        if args.snapshot is None:
            parser.error('--snapshot is required')
        restore(args.snapshot.resolve())
