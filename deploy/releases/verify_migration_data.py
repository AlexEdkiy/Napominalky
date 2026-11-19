#!/usr/bin/env python3
"""Read-only comparison of a restored snapshot before enabling target writes."""
import argparse
import hashlib
import json
from pathlib import Path
import re
import socket
import subprocess

from redis_acl import read_resp


def digest(path):
    with path.open('rb') as source:
        return hashlib.file_digest(source, 'sha256').hexdigest()


def verify(snapshot, production):
    command = ['docker', 'exec', '-i', 'reminders_db', 'psql', '-U', 'reminders',
               '-d', 'reminders', '-v', 'ON_ERROR_STOP=1', '-At', '-F', '\t']
    actual = subprocess.check_output(command, input=(snapshot / 'table-fingerprints.sql').read_bytes())
    if actual != (snapshot / 'table-fingerprints.tsv').read_bytes():
        raise ValueError('Database row counts/content hashes differ')
    sequences = subprocess.check_output(command + ['-c',
        "SELECT sequencename, last_value FROM pg_sequences WHERE schemaname='public' ORDER BY sequencename"])
    if sequences != (snapshot / 'sequences.tsv').read_bytes():
        raise ValueError('Sequence values differ')
    role = subprocess.check_output(command + ['-c',
        "SELECT rolsuper, rolcreatedb, rolcreaterole, rolreplication, rolbypassrls FROM pg_roles WHERE rolname=current_user"], text=True).strip()
    if role != 'f\tf\tf\tf\tf':
        raise ValueError('Application DB role is too privileged')
    for name, expected in json.loads((snapshot / 'storage-files.json').read_text()).items():
        if digest(production / 'storage' / name) != expected:
            raise ValueError('User storage hash mismatch')
    def app_key(text):
        return next(line for line in text.splitlines() if line.startswith('APP_KEY='))
    if app_key((production / '.env').read_text()) != app_key((snapshot / 'application.env').read_text()):
        raise ValueError('Application encryption key changed')
    credentials = json.loads((production.parent / 'private/credentials.json').read_text())
    inspected = json.loads(subprocess.check_output(['docker', 'inspect', 'reminders_redis']))[0]
    address = inspected['NetworkSettings']['Networks']['napominalky_backend']['IPAddress']
    with socket.create_connection((address, 6379), timeout=10) as sock, sock.makefile('rb') as stream:
        def redis(*args):
            parts = [str(arg).encode() for arg in args]
            sock.sendall(b'*' + str(len(parts)).encode() + b'\r\n' + b''.join(
                b'$' + str(len(part)).encode() + b'\r\n' + part + b'\r\n' for part in parts))
            return read_resp(stream)
        assert redis('AUTH', 'operator', credentials['operator']) == 'OK'
        rows = []
        for db in re.findall(r'^db(\d+):', redis('INFO', 'keyspace'), re.M):
            redis('SELECT', db)
            cursor = '0'
            while True:
                cursor, keys = redis('SCAN', cursor, 'COUNT', '100')
                for key in keys:
                    if not key.startswith('reminders-app-database-'):
                        raise ValueError('Unexpected Redis key namespace')
                    value, ttl = redis('DUMP', key), redis('PTTL', key)
                    rows.append({'db': db, 'key_hash': hashlib.sha256(key.encode()).hexdigest(),
                                 'dump_hash': hashlib.sha256(value.encode('latin1')).hexdigest(), 'pttl': ttl})
                if str(cursor) == '0':
                    break
        rows.sort(key=lambda row: (row['db'], row['key_hash']))
        expected = json.loads((snapshot / 'redis-inventory.json').read_text())
        # Current snapshot has persistent keys only. Do not silently ignore a
        # TTL/content discrepancy if the source state changes before migration.
        if rows != expected:
            raise ValueError('Redis content/TTL differs from the frozen snapshot')
    result = {'database_tables_match': True, 'sequences_match': True,
              'application_key_preserved': True, 'storage_hashes_match': True,
              'redis_keys_match': len(rows), 'application_db_role': 'non-superuser',
              'writes_enabled': False}
    (production.parent / 'ops18-data-verification.json').write_text(json.dumps(result, indent=2) + '\n')
    print(json.dumps(result))


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--snapshot', type=Path, required=True)
    parser.add_argument('--production', type=Path, default=Path('/srv/napominalky/production'))
    args = parser.parse_args()
    verify(args.snapshot.resolve(), args.production.resolve())
