#!/usr/bin/env python3
"""Publish one verified landing on the OPS-18 VPS; no application/DB changes."""
import argparse
from datetime import datetime, timezone
import hashlib
import http.client
import json
import os
from pathlib import Path
import re
import shutil
import subprocess
import time
import urllib.error
import urllib.request

# OPS-18 imported this exact image with docker save/load. Repository names and
# RepoDigests are not preserved for an image exported by ID; use its local ID.
IMAGE = 'sha256:bef154735288bc38d99fac41ae63730684bcc661503673a04a0f9bc526ba8598'
ROOT = Path('/srv/napominalky/landing')
NAME = 'napominalky_landing'
NETWORK = 'napominalky_frontend'


def docker(*args):
    return subprocess.check_output(['docker', *args], text=True).strip()


def inspect(name):
    return json.loads(docker('inspect', name))[0]


def verify(folder):
    if folder.is_symlink() or not folder.is_dir():
        raise ValueError('Expected a real artifact directory')
    manifest = json.loads((folder / 'manifest.json').read_text())
    release = manifest['release']
    if not re.fullmatch(r'landing-[a-z0-9-]{1,45}', release) or not manifest['has_content']:
        raise ValueError('Expected a published landing artifact')
    if not re.fullmatch(r'[0-9a-f]{40}', manifest['source_sha']):
        raise ValueError('Missing source commit')
    files = {}
    for entry in folder.rglob('*'):
        if entry.is_symlink() or not (entry.is_dir() or entry.is_file()):
            raise ValueError('Special files are not allowed')
        if entry.is_file() and entry.name != 'manifest.json':
            with entry.open('rb') as handle:
                files[str(entry.relative_to(folder))] = hashlib.file_digest(handle, 'sha256').hexdigest()
    if files != manifest['files']:
        raise ValueError('Artifact checksum mismatch')
    return manifest


def get(port, path, headers=None):
    req = urllib.request.Request(f'http://127.0.0.1:{port}{path}', headers=headers or {})
    try:
        with urllib.request.urlopen(req, timeout=8) as response:
            return response.status, response.read(), dict(response.headers)
    except urllib.error.HTTPError as response:
        return response.code, response.read(), dict(response.headers)


def smoke_directory_redirect(port):
    connection = http.client.HTTPConnection('127.0.0.1', port, timeout=8)
    try:
        connection.request('GET', '/en?check=landing', headers={'Host': 'www.napominalky.ru'})
        response = connection.getresponse()
        if response.status != 301 or response.getheader('Location') != '/en/?check=landing':
            raise RuntimeError('English directory redirect exposes the internal origin or loses the query')
        response.read()
    finally:
        connection.close()


def smoke(port, release):
    for attempt in range(30):
        try:
            status, body, _ = get(port, '/release.json')
            if status == 200 and json.loads(body)['release'] == release:
                break
        except (OSError, ValueError):
            pass
        time.sleep(.3)
    else:
        raise RuntimeError('Landing did not become ready')
    status, body, headers = get(port, '/')
    if status != 200 or 'Освободите голову'.encode() not in body:
        raise RuntimeError('Landing HTML smoke failed')
    if 'noindex' in headers.get('X-Robots-Tag', ''):
        raise RuntimeError('Published landing is still noindex')
    for path in ['/styles.css', '/landing.js', '/assets/fairy.png', '/assets/roboto-cyrillic.woff2',
                 '/assets/roboto-latin.woff2', '/favicon.svg', '/data.html', '/robots.txt', '/sitemap.xml',
                 '/assets/flag-ru.svg', '/assets/flag-en.svg', '/en/', '/en/data.html']:
        if get(port, path)[0] != 200:
            raise RuntimeError('Missing public resource: ' + path)
    english = get(port, '/en/')[1]
    if b'<html lang="en">' not in english or b'Free your mind for what matters.' not in english:
        raise RuntimeError('English landing smoke failed')
    smoke_directory_redirect(port)
    if get(port, '/missing-web71-page')[0] != 404:
        raise RuntimeError('Missing pages must return 404')
    status, body, _ = get(port, '/downloads/napominalky-1.0.8-52.apk', {'Range': 'bytes=0-3'})
    if status != 206 or body != b'PK\x03\x04':
        raise RuntimeError('APK partial download failed')


def start(name, port, artifact, release):
    return docker('run', '-d', '--pull=never', '--name', name, '--restart', 'unless-stopped', '--read-only',
                  '--network', NETWORK, '--publish', f'127.0.0.1:{port}:8080',
                  '--label', 'napominalky.managed=landing', '--label', f'napominalky.release={release}',
                  '--mount', f'type=bind,src={artifact}/public,dst=/usr/share/nginx/html,readonly',
                  '--mount', f'type=bind,src={artifact}/nginx.conf,dst=/etc/nginx/nginx.conf,readonly',
                  '--tmpfs', '/var/cache/nginx:rw,size=16m', '--tmpfs', '/var/run:rw,size=4m',
                  '--tmpfs', '/tmp:rw,noexec,nosuid,size=8m', '--entrypoint', 'nginx',
                  IMAGE, '-g', 'daemon off;')


def publish(source):
    if os.geteuid() != 0:
        raise PermissionError('Run with sudo on the target VPS')
    if not source.resolve().is_relative_to('/home/devops/napominalky-deploy/'):
        raise ValueError('Artifact must be staged in the devops deployment directory')
    meta = verify(source)
    release = meta['release']
    current = inspect(NAME)
    if current['Config'].get('Labels', {}).get('napominalky.release') == release:
        smoke(18089, release)
        print('Already published and healthy: ' + release)
        return
    ports = current['HostConfig']['PortBindings'].get('8080/tcp')
    if ports != [{'HostIp': '127.0.0.1', 'HostPort': '18089'}]:
        raise ValueError('Unexpected existing landing port; refusing to replace it')
    mounts = {m['Destination']: m for m in current['Mounts']}
    public = Path(mounts['/usr/share/nginx/html']['Source'])
    if not public.is_relative_to(ROOT / 'releases') or not current['HostConfig']['ReadonlyRootfs']:
        raise ValueError('Unexpected current landing container')
    backup = NAME + '-before-' + release
    candidate = NAME + '-check-' + release
    existing = docker('ps', '-a', '--format', '{{.Names}}').splitlines()
    if backup in existing or candidate in existing:
        raise ValueError('Previous deployment attempt exists; inspect it before retrying')
    if json.loads(docker('image', 'inspect', IMAGE))[0]['Id'] != IMAGE:
        raise ValueError('Installed nginx image differs from the verified OPS-18 image')
    docker('network', 'inspect', NETWORK)
    app_before = get(18082, '/release.json')[1]
    target = ROOT / 'releases' / release
    if target.exists():
        verify(target)
        if (target / 'manifest.json').read_bytes() != (source / 'manifest.json').read_bytes():
            raise ValueError('Existing release differs')
    else:
        shutil.copytree(source, target)
        verify(target)
        for item in target.rglob('*'):
            item.chmod(0o555 if item.is_dir() else 0o444)
        target.chmod(0o555)
    # The only pre-switch mutation is a temporary loopback-only nginx container.
    try:
        start(candidate, 18090, target, release)
        docker('exec', candidate, 'nginx', '-t')
        smoke(18090, release)
    finally:
        if candidate in docker('ps', '-a', '--format', '{{.Names}}').splitlines():
            docker('rm', '-f', candidate)
    state = {'release': release, 'source_sha': meta['source_sha'], 'previous_container': backup,
             'previous_id': current['Id'], 'previous_public': str(public),
             'checked_at': datetime.now(timezone.utc).isoformat(), 'phase': 'prepared'}
    history = ROOT / 'deployments'
    history.mkdir(exist_ok=True)
    state_path = history / (release + '.json')
    state_path.write_text(json.dumps(state, indent=2) + '\n')
    renamed = False
    try:
        docker('update', '--restart=no', NAME)
        docker('stop', '--time', '10', NAME)
        docker('rename', NAME, backup)
        renamed = True
        start(NAME, 18089, target, release)
        smoke(18089, release)
        if get(18082, '/release.json')[1] != app_before:
            raise RuntimeError('Application release changed during landing deployment')
        if get(18000, '/api/v1/auth/me', {'Accept': 'application/json'})[0] != 401:
            raise RuntimeError('Application API smoke failed')
    except BaseException:
        if renamed:
            if NAME in docker('ps', '-a', '--format', '{{.Names}}').splitlines():
                docker('rm', '-f', NAME)
            docker('rename', backup, NAME)
        policy = current['HostConfig']['RestartPolicy']['Name'] or 'no'
        docker('update', '--restart=' + policy, NAME)
        docker('start', NAME)
        state.update(phase='rolled_back')
        state_path.write_text(json.dumps(state, indent=2) + '\n')
        raise
    state.update(phase='active', published_at=datetime.now(timezone.utc).isoformat())
    state_path.write_text(json.dumps(state, indent=2) + '\n')
    (ROOT / 'target.env').write_text(f'LANDING_RELEASE_ID={release}\nLANDING_RELEASE_DIR={target}\n')
    print(json.dumps(state, indent=2))


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--artifact', required=True, type=Path)
    args = parser.parse_args()
    publish(args.artifact)
