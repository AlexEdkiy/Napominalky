#!/usr/bin/env python3
"""Route only old Napominalky endpoints to the new server over verified TLS.

Run after the frozen snapshot has been restored and checked on the target.
Source writers and scheduler must already be stopped. Do not restore source DB
writes after the target starts accepting changes.
"""
import argparse
import hashlib
import json
from pathlib import Path
import subprocess

SOURCE = Path('/home/vselug/.openclaw/workspace/insure-platform/nginx.conf')


def main(backup):
    before = SOURCE.read_text()
    if backup.exists() or '# OPS-18 TLS forwarding' in before:
        raise ValueError('Cutover already prepared/applied; inspect state')
    for name in ['reminders_serve', 'reminders_app']:
        row = json.loads(subprocess.check_output(['docker', 'inspect', name]))[0]
        if row['State']['Running'] or row['HostConfig']['RestartPolicy']['Name'] != 'no':
            raise ValueError('Source writer is not safely stopped')
    cron = subprocess.check_output(['crontab', '-l'], text=True)
    if 'docker exec reminders_serve php artisan schedule:run' in cron:
        raise ValueError('Source scheduler is still enabled')
    replacements = {
        'upstream reminders_web { server reminders_web:8080; }':
            'upstream reminders_web { server 195.206.252.160:443; }',
        'upstream reminders_api { server reminders_serve:8000; }':
            'upstream reminders_api { server 195.206.252.160:443; }',
        'upstream napominalky_landing { server napominalky_landing:8080; }':
            'upstream napominalky_landing { server 195.206.252.160:443; }',
        'proxy_pass http://reminders_api/api/;': 'proxy_pass https://reminders_api/napominalki/api/;',
        'proxy_pass http://reminders_api;': 'proxy_pass https://reminders_api;',
        'proxy_pass http://reminders_web;': 'proxy_pass https://reminders_web;',
        'proxy_pass http://napominalky_landing;': 'proxy_pass https://napominalky_landing;',
    }
    expected = [1, 1, 1, 1, 2, 2, 1]
    after = before
    for (needle, replacement), count in zip(replacements.items(), expected):
        if after.count(needle) != count:
            raise ValueError('Unexpected source proxy routing')
        after = after.replace(needle, replacement)
    marker = '    gzip on;'
    if after.count(marker) != 1:
        raise ValueError('Unexpected source configuration')
    after = after.replace(marker, '''    # OPS-18 TLS forwarding; HTTP upstreams for unrelated sites are unchanged.
    proxy_ssl_server_name on;
    proxy_ssl_name $host;
    proxy_ssl_verify on;
    proxy_ssl_trusted_certificate /etc/ssl/cert.pem;
    proxy_ssl_verify_depth 3;

''' + marker)
    backup.parent.mkdir(parents=True, exist_ok=True, mode=0o700)
    backup.write_text(before)
    backup.chmod(0o600)
    try:
        SOURCE.write_text(after)  # preserve the Docker bind-mount inode
        subprocess.run(['docker', 'exec', 'nginx-proxy', 'nginx', '-t'], check=True)
        subprocess.run(['docker', 'exec', 'nginx-proxy', 'nginx', '-s', 'reload'], check=True)
    except BaseException:
        SOURCE.write_text(before)
        # Do not start source writers or restore source DB writes automatically.
        raise
    print(json.dumps({'source_proxy': 'new target, verified TLS',
                      'sha256': hashlib.sha256(after.encode()).hexdigest(),
                      'source_writers': 'remain stopped'}))


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--backup', type=Path, required=True)
    main(parser.parse_args().backup)
