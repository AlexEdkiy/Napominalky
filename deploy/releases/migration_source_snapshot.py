#!/usr/bin/env python3
"""OPS-18: freeze only Napominalky writers and save a consistent private snapshot.

On failure, writers remain stopped deliberately. Inspect phase.json and restore the
saved crontab/restart policies only BEFORE the new server accepts any user writes.
"""
import argparse
import hashlib
import json
import os
from pathlib import Path
import shutil
import subprocess
import tarfile

from redis_acl import NAME, cli, inventory

PRODUCTION = Path('/home/vselug/workspace/Napominalky-runtime/production')
WRITERS = ['reminders_serve', 'reminders_app']


def run(*args, **kwargs):
    return subprocess.check_output(args, **kwargs)


def digest(path):
    with path.open('rb') as source:
        return hashlib.file_digest(source, 'sha256').hexdigest()


def snapshot(root, sql):
    if root.exists():
        raise ValueError('Use a fresh snapshot directory')
    os.umask(0o077)
    root.mkdir(parents=True, mode=0o700)
    phase = root / 'phase.json'
    def state(name):
        phase.write_text(json.dumps({'phase': name, 'new_writes_allowed': False}) + '\n')
    cron = run('crontab', '-u', 'vselug', '-l', text=True)
    lines = cron.splitlines(keepends=True)
    scheduler = [line for line in lines if 'docker exec reminders_serve php artisan schedule:run' in line]
    if len(scheduler) != 1:
        raise ValueError('Expected exactly one Napominalky scheduler')
    (root / 'crontab.before').write_text(cron)
    containers = json.loads(run('docker', 'inspect', *WRITERS))
    (root / 'writers.before.json').write_text(json.dumps([
        {'name': row['Name'].lstrip('/'), 'id': row['Id'],
         'running': row['State']['Running'], 'restart': row['HostConfig']['RestartPolicy']}
        for row in containers], indent=2))
    state('prepared')
    subprocess.run(['crontab', '-u', 'vselug', '-'],
                   input=''.join(line for line in lines if line not in scheduler), text=True, check=True)
    run('docker', 'update', '--restart=no', *WRITERS)
    run('docker', 'stop', '--time', '30', *WRITERS)
    state('writers_stopped')
    # New connections to the old DB default to read-only throughout DNS overlap.
    run('docker', 'exec', 'reminders_db', 'psql', '-U', 'reminders', '-d', 'postgres',
        '-v', 'ON_ERROR_STOP=1', '-c', 'ALTER DATABASE reminders SET default_transaction_read_only = on;')
    connections = int(run('docker', 'exec', 'reminders_db', 'psql', '-U', 'reminders',
                          '-d', 'postgres', '-Atc',
                          "SELECT count(*) FROM pg_stat_activity WHERE datname='reminders' AND backend_type='client backend'").strip())
    if connections:
        raise RuntimeError('Unexpected remaining source DB connections; investigate before snapshot')
    with (root / 'database.dump').open('wb') as output:
        subprocess.run(['docker', 'exec', 'reminders_db', 'pg_dump', '-U', 'reminders',
                        '-d', 'reminders', '-Fc', '--no-owner', '--no-acl'], stdout=output, check=True)
    with sql.open('rb') as source, (root / 'table-fingerprints.tsv').open('wb') as output:
        subprocess.run(['docker', 'exec', '-i', 'reminders_db', 'psql', '-U', 'reminders',
                        '-d', 'reminders', '-v', 'ON_ERROR_STOP=1', '-At', '-F', '\t'],
                       stdin=source, stdout=output, check=True)
    shutil.copyfile(sql, root / 'table-fingerprints.sql')
    (root / 'sequences.tsv').write_bytes(run('docker', 'exec', 'reminders_db', 'psql',
        '-U', 'reminders', '-d', 'reminders', '-At', '-F', '\t', '-c',
        "SELECT sequencename, last_value FROM pg_sequences WHERE schemaname='public' ORDER BY sequencename"))
    env = (PRODUCTION / '.env').read_text().splitlines()
    exclude = {'DB_PASSWORD', 'REDIS_PASSWORD', 'REDIS_ACL_DIR'}
    (root / 'application.env').write_text('\n'.join(line for line in env if line.split('=', 1)[0] not in exclude) + '\n')
    storage = PRODUCTION / 'storage'
    # Preserve user uploads and file sessions; runtime caches and old logs stay on source.
    paths = [storage / 'app', storage / 'framework/sessions']
    files = {}
    with tarfile.open(root / 'storage.tar.gz', 'w:gz') as archive:
        for path in paths:
            if not path.exists():
                continue
            for entry in [path, *path.rglob('*')]:
                if entry.is_symlink() or not (entry.is_file() or entry.is_dir()):
                    raise ValueError('Unexpected special storage entry')
                if entry.is_file():
                    files[str(entry.relative_to(storage))] = digest(entry)
            archive.add(path, arcname='storage/' + str(path.relative_to(storage)))
    (root / 'storage-files.json').write_text(json.dumps(files, indent=2))
    (root / 'redis-inventory.json').write_text(json.dumps(inventory(NAME), indent=2))
    cli(NAME, 'SAVE')
    run('docker', 'cp', NAME + ':/data/dump.rdb', str(root / 'redis.rdb'))
    transfer_names = ['database.dump', 'application.env', 'storage.tar.gz', 'storage-files.json',
                      'redis.rdb', 'redis-inventory.json', 'table-fingerprints.sql',
                      'table-fingerprints.tsv', 'sequences.tsv']
    manifest = {'files': {name: digest(root / name) for name in transfer_names},
                'writers_stopped': WRITERS, 'source_database_read_only': True,
                'source_scheduler_disabled': True}
    (root / 'snapshot-manifest.json').write_text(json.dumps(manifest, indent=2) + '\n')
    for path in root.iterdir():
        path.chmod(0o600)
    state('snapshot_complete')
    print(json.dumps({'snapshot': str(root), 'files': len(transfer_names),
                      'storage_files': len(files), 'source_writers': 'stopped', 'source_db': 'read-only'}))


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--root', type=Path, required=True)
    parser.add_argument('--fingerprint-sql', type=Path, required=True)
    args = parser.parse_args()
    snapshot(args.root.resolve(), args.fingerprint_sql.resolve())
