#!/usr/bin/env python3
"""Start/verify versioned containers. All runtime configuration is kept outside Git."""
import argparse
import hashlib
import json
from pathlib import Path
import re
import subprocess
import time
import urllib.error
import urllib.request


def docker(*args):
    return subprocess.check_output(['docker', *map(str, args)], text=True).strip()


def verify(release):
    manifest = json.loads((release / 'manifest.json').read_text())
    expected = set(manifest['files']) | {'manifest.json'}
    actual = {str(p.relative_to(release)) for p in release.rglob('*') if p.is_file()}
    if actual != expected or any(p.is_symlink() for p in release.rglob('*')):
        raise ValueError('Unexpected files or symlinks in artifact')
    for name, digest in manifest['files'].items():
        path = release / name
        if not path.resolve().is_relative_to(release.resolve()):
            raise ValueError('Artifact path escapes release directory')
        with path.open('rb') as source:
            if hashlib.file_digest(source, 'sha256').hexdigest() != digest:
                raise ValueError(f'Artifact checksum mismatch: {name}')
    for image in manifest['images'].values():
        if not re.fullmatch(r'sha256:[0-9a-f]{64}', image):
            raise ValueError('Runtime image must be pinned by image ID')
        docker('image', 'inspect', image, '--format', '{{.Id}}')
    return manifest


def request(url, status, method='GET', data=None, timeout=10):
    req = urllib.request.Request(url, data=data, method=method,
                                 headers={'Accept': 'application/json', 'Content-Type': 'application/json'})
    try:
        response = urllib.request.urlopen(req, timeout=timeout)
    except urllib.error.HTTPError as error:
        response = error
    with response:
        body, headers, code = response.read(), response.headers, response.code
    if code != status:
        raise RuntimeError(f'{method} {url}: expected {status}, received {code}')
    return body, headers


def wait_public(config, release_id, timeout=20):
    """Wait for nginx's asynchronous reload to replace workers with stale DNS."""
    deadline = time.monotonic() + timeout
    last_error = None
    while time.monotonic() < deadline:
        try:
            remaining = max(0.01, min(3, deadline - time.monotonic()))
            body, _ = request(config['public_web_url'] + '/napominalki/release.json',
                              200, timeout=remaining)
            if json.loads(body)['release'] != release_id:
                raise RuntimeError('Public proxy serves a different release')
            remaining = max(0.01, min(3, deadline - time.monotonic()))
            request(config['public_web_url'] + '/napominalki/api/v1/auth/me',
                    401, timeout=remaining)
            return
        except (OSError, RuntimeError, ValueError, KeyError) as error:
            last_error = error
            time.sleep(max(0, min(0.5, deadline - time.monotonic())))
    raise RuntimeError('Public proxy did not become ready before timeout') from last_error


def smoke(api_url, web_url, release_id):
    request(api_url + '/up', 200)
    request(api_url + '/api/v1/auth/me', 401)
    request(api_url + '/api/v1/auth/login', 422, 'POST', b'{}')
    body, headers = request(web_url + '/napominalki/', 200)
    if 'no-cache' not in headers.get('Cache-Control', ''):
        raise RuntimeError('SPA entry must revalidate')
    if headers.get('X-Content-Type-Options') != 'nosniff':
        raise RuntimeError('Missing security headers')
    asset = re.search(rb'src="(/napominalki/assets/[^"<>]+\.js)"', body)
    if not asset:
        raise RuntimeError('SPA entry does not reference a JavaScript bundle')
    _, headers = request(web_url + asset[1].decode(), 200)
    if 'javascript' not in headers.get('Content-Type', ''):
        raise RuntimeError('Bundle must be served as JavaScript')
    if 'max-age=31536000' not in headers.get('Cache-Control', ''):
        raise RuntimeError('Hashed assets must be cacheable')
    request(web_url + '/napominalki/assets/nonexistent-ops14.js', 404)
    body, _ = request(web_url + '/napominalki/release.json', 200)
    if json.loads(body)['release'] != release_id:
        raise RuntimeError('Unexpected served release')


def container_args(config, release, manifest, role):
    name = config[role + '_name']
    args = ['create', '--name', name, '--restart', 'unless-stopped', '--read-only',
            '--label', 'napominalky.managed=release',
            '--label', 'com.docker.compose.project=napominalky-release',
            '--label', f'com.docker.compose.service={role}', '--label', f'napominalky.release={manifest["release"]}',
            '--label', f'org.opencontainers.image.revision={manifest["source_sha"]}',
            '--network', (config.get('proxy_network') or config['network']) if role == 'web' else config['network'], '--tmpfs', '/tmp:rw,noexec,nosuid,size=64m']
    port = config.get(role + '_port')
    if port:
        args += ['--publish', port + (':8000' if role == 'api' else ':8080')]
    if role == 'api':
        args += ['--mount', f'type=bind,src={release / "backend"},dst=/var/www/html,readonly',
                 '--mount', f'type=bind,src={config["env_file"]},dst=/var/www/html/.env,readonly',
                 '--mount', f'type=bind,src={config["storage"]},dst=/var/www/html/storage',
                 '--mount', f'type=bind,src={release / "backend/docker/php/php.ini"},dst=/usr/local/etc/php/conf.d/app.ini,readonly',
                 '--tmpfs', '/var/www/html/bootstrap/cache:rw,nosuid,size=16m',
                 '--env', 'APP_ENV=production', '--env', 'APP_DEBUG=false',
                 manifest['images']['api'], 'php', 'artisan', 'serve', '--no-reload',
                 '--host=0.0.0.0', '--port=8000']
    else:
        args += ['--mount', f'type=bind,src={release / "web"},dst=/usr/share/nginx/html/napominalki,readonly',
                 '--mount', f'type=bind,src={release / "nginx.conf"},dst=/etc/nginx/nginx.conf,readonly',
                 '--tmpfs', '/var/cache/nginx:rw,size=16m', '--tmpfs', '/var/run:rw,size=4m',
                 '--entrypoint', 'nginx', manifest['images']['web'], '-g', 'daemon off;']
    return name, args


def start(config, release):
    manifest = verify(release)
    for path in (config['env_file'], config['storage']):
        if not Path(path).exists():
            raise ValueError('Missing runtime file/directory: ' + path)
    created = []
    try:
        for role in ('api', 'web'):
            name, args = container_args(config, release, manifest, role)
            docker(*args)
            created.append(name)
            if role == 'api' and config.get('proxy_network') and config['proxy_network'] != config['network']:
                docker('network', 'connect', config['proxy_network'], name)
            docker('start', name)
        last_error = None
        for _ in range(20):
            try:
                # Only retry readiness; a failed contract check should fail immediately.
                request(config['api_url'] + '/up', 200)
                request(config['web_url'] + '/napominalki/', 200)
                last_error = None
                break
            except (OSError, RuntimeError) as error:
                last_error = error
                time.sleep(1)
        if last_error:
            raise last_error
        smoke(config['api_url'], config['web_url'], manifest['release'])
    except BaseException:
        for name in reversed(created):
            docker('rm', '-f', name)
        raise
    print(json.dumps({'started': created, 'release': manifest['release'], 'smoke': 'passed'}))


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('command', choices=['verify', 'start', 'smoke'])
    parser.add_argument('--release', type=Path, required=True)
    parser.add_argument('--config', type=Path)
    args = parser.parse_args()
    release = args.release.resolve()
    if args.command == 'verify':
        manifest = verify(release)
        print(json.dumps({'verified': str(release), 'source_sha': manifest['source_sha']}))
    else:
        if not args.config:
            parser.error('--config is required for start/smoke')
        config = json.loads(args.config.read_text())
        if args.command == 'start':
            start(config, release)
        else:
            smoke(config['api_url'], config['web_url'], verify(release)['release'])
            print('Smoke passed')
