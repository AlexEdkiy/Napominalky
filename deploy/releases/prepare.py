#!/usr/bin/env python3
"""Package committed code and verified local dependencies as a read-only release."""
import argparse
import hashlib
import json
import os
from pathlib import Path
import re
import shutil
import subprocess
import tarfile
import tempfile


def run(*args, **kwargs):
    return subprocess.check_output(args, text=True, **kwargs).strip()


def check_dependencies(backend, vendor):
    lock = json.loads((backend / 'composer.lock').read_text())
    packages = json.loads((vendor / 'composer/installed.json').read_text())['packages']
    installed = {p['name']: p for p in packages}
    for package in lock['packages']:
        actual = installed.get(package['name'], {})
        for field in ('version', 'source', 'dist'):
            if package.get(field) != actual.get(field):
                raise ValueError(f'Installed dependency differs from lock: {package["name"]} ({field})')


def checksum(path):
    with path.open('rb') as source:
        return hashlib.file_digest(source, 'sha256').hexdigest()


def prepare(args):
    repo, root = args.repo.resolve(), args.root.resolve()
    sha = run('git', '-C', str(repo), 'rev-parse', f'{args.ref}^{{commit}}')
    release_id = args.release_id or sha[:12]
    if not re.fullmatch(r'[a-z0-9][a-z0-9-]{0,59}', release_id):
        raise ValueError('Release ID must contain lowercase letters, digits and hyphens')
    for entry in run('git', '-C', str(repo), 'worktree', 'list', '--porcelain').splitlines():
        if entry.startswith('worktree ') and root.is_relative_to(Path(entry[9:]).resolve()):
            raise ValueError('Runtime root must be outside every Git worktree')
    releases = root / 'releases'
    releases.mkdir(parents=True, exist_ok=True)
    destination = releases / release_id
    if destination.exists():
        raise ValueError(f'Release already exists: {destination}')
    image_ids = {role: run('docker', 'image', 'inspect', image, '--format', '{{.Id}}')
                 for role, image in [('api', args.api_image), ('web', args.web_image)]}
    with tempfile.TemporaryDirectory(prefix='.prepare-', dir=releases) as temporary:
        temp = Path(temporary)
        source, output = temp / 'source', temp / 'artifact'
        source.mkdir()
        output.mkdir()
        with tempfile.TemporaryFile() as archive:
            subprocess.run(['git', '-C', str(repo), 'archive', sha, 'backend', 'web',
                            'deploy/reminders-web.nginx.conf'], stdout=archive, check=True)
            archive.seek(0)
            with tarfile.open(fileobj=archive) as tar:
                tar.extractall(source, filter='data')
        check_dependencies(source / 'backend', args.vendor.resolve())
        shutil.copytree(source / 'backend', output / 'backend')
        shutil.copytree(args.vendor.resolve(), output / 'backend/vendor')
        # Runtime caches and secrets belong to the target environment, never the artifact.
        for path in (output / 'backend/bootstrap/cache').glob('*.php'):
            path.unlink()
        for path in (output / 'backend').rglob('.env*'):
            if (path.name == '.env' or path.name.startswith('.env.')) and path.name != '.env.example':
                raise ValueError(f'Environment file in artifact: {path.relative_to(output)}')
        # A mountpoint is required before the parent code directory is mounted read-only.
        (output / 'backend/.env').touch()
        (source / 'web/node_modules').symlink_to(args.node_modules.resolve(), target_is_directory=True)
        env = dict(os.environ, VITE_API_URL='/napominalki')
        subprocess.run(['npm', 'run', 'build', '--', '--base=/napominalki/'],
                       cwd=source / 'web', env=env, check=True)
        shutil.copytree(source / 'web/dist', output / 'web')
        shutil.copyfile(source / 'deploy/reminders-web.nginx.conf', output / 'nginx.conf')
        info = {'release': release_id, 'source_sha': sha, 'images': image_ids,
                'packager_sha256': checksum(Path(__file__))}
        (output / 'web/release.json').write_text(json.dumps(info, indent=2) + '\n')
        files = {str(path.relative_to(output)): checksum(path)
                 for path in sorted(output.rglob('*')) if path.is_file()}
        (output / 'manifest.json').write_text(json.dumps(dict(info, files=files), indent=2) + '\n')
        output.rename(destination)
    for path in destination.rglob('*'):
        path.chmod(0o555 if path.is_dir() or path.stat().st_mode & 0o111 else 0o444)
    destination.chmod(0o555)
    print(json.dumps({'artifact': str(destination), 'release': release_id, 'source_sha': sha}))


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--repo', type=Path, default=Path(__file__).resolve().parents[2])
    parser.add_argument('--ref', required=True)
    parser.add_argument('--root', type=Path, required=True)
    parser.add_argument('--release-id')
    parser.add_argument('--vendor', type=Path, required=True)
    parser.add_argument('--node-modules', type=Path, required=True)
    parser.add_argument('--api-image', required=True)
    parser.add_argument('--web-image', required=True)
    prepare(parser.parse_args())
