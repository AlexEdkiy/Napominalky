#!/usr/bin/env python3
"""Add an HTTP challenge fallback for new certificates before DNS cutover."""
import argparse
import hashlib
from pathlib import Path
import re
import subprocess

SOURCE = Path('/home/vselug/.openclaw/workspace/insure-platform/nginx.conf')


def main(backup):
    before = SOURCE.read_text()
    if '@ops18_acme' in before or backup.exists():
        raise ValueError('ACME route/backup already exists; inspect current state')
    edits = []
    for match in re.finditer(r'(?m)^[ \t]*server \{', before):
        opening = before.index('{', match.start())
        end, depth = opening + 1, 1
        while depth:
            depth += (before[end] == '{') - (before[end] == '}')
            end += 1
        block = before[match.start():end]
        if not re.search(r'listen 80;', block):
            continue
        if not re.search(r'server_name (?:jemsoft\.ru www\.jemsoft\.ru|lk\.napominalky\.ru|napominalky\.ru www\.napominalky\.ru);', block):
            continue
        new, count = re.subn(r'location /\.well-known/acme-challenge/ \{\s*root /var/www/certbot;\s*\}',
                            'location /.well-known/acme-challenge/ {\n'
                            '        root /var/www/certbot;\n'
                            '        try_files $uri @ops18_acme;\n'
                            '    }\n'
                            '    location @ops18_acme {\n'
                            '        if ($remote_addr = 195.206.252.160) { return 404; }\n'
                            '        proxy_pass http://195.206.252.160;\n'
                            '        proxy_set_header Host $host;\n'
                            '        proxy_connect_timeout 5s;\n'
                            '        proxy_read_timeout 10s;\n'
                            '    }', block)
        if count != 1:
            raise ValueError('Unexpected challenge routing')
        edits.append((match.start(), end, new))
    if len(edits) != 3:
        raise ValueError('Expected three HTTP virtual hosts')
    after = before
    for start, end, new in reversed(edits):
        after = after[:start] + new + after[end:]
    backup.parent.mkdir(mode=0o700, parents=True, exist_ok=True)
    backup.write_text(before)
    backup.chmod(0o600)
    try:
        # Keep the inode: Docker binds this file, not its parent directory.
        SOURCE.write_text(after)
        subprocess.run(['docker', 'exec', 'nginx-proxy', 'nginx', '-t'], check=True)
        subprocess.run(['docker', 'exec', 'nginx-proxy', 'nginx', '-s', 'reload'], check=True)
    except BaseException:
        SOURCE.write_text(before)
        subprocess.run(['docker', 'exec', 'nginx-proxy', 'nginx', '-t'], check=True)
        subprocess.run(['docker', 'exec', 'nginx-proxy', 'nginx', '-s', 'reload'], check=True)
        raise
    print('Three HTTP ACME fallbacks installed; existing local challenges and all application routes preserved')
    print('Configuration SHA256:', hashlib.sha256(after.encode()).hexdigest())


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--backup', type=Path, required=True)
    main(parser.parse_args().backup)
