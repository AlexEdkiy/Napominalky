#!/usr/bin/env python3
"""Package a static landing outside Git, or verify an existing immutable artifact."""
import argparse
import hashlib
import json
from pathlib import Path
import re
import shutil
import subprocess
import tempfile


def digest(path):
    with path.open('rb') as source:
        return hashlib.file_digest(source, 'sha256').hexdigest()


def verify(path):
    manifest = json.loads((path / 'manifest.json').read_text())
    files = {str(p.relative_to(path)): digest(p) for p in path.rglob('*') if p.is_file()}
    files.pop('manifest.json')
    if files != manifest['files'] or any(p.is_symlink() for p in path.rglob('*')):
        raise ValueError('Artifact bytes/paths differ from the manifest')
    return manifest


def prepare(args):
    repo = Path(__file__).resolve().parents[2]
    root = args.root.resolve()
    worktrees = subprocess.check_output(['git', '-C', str(repo), 'worktree', 'list', '--porcelain'], text=True)
    for line in worktrees.splitlines():
        if line.startswith('worktree ') and root.is_relative_to(Path(line[9:]).resolve()):
            raise ValueError('Release root must be outside Git worktrees')
    if not re.fullmatch(r'[a-z0-9][a-z0-9-]{0,59}', args.release_id):
        raise ValueError('Invalid release ID')
    sha = subprocess.check_output(['git', '-C', str(repo), 'rev-parse', f'{args.ref}^{{commit}}'], text=True).strip()
    config = subprocess.check_output(['git', '-C', str(repo), 'show', sha + ':deploy/landing/nginx.conf'])
    root.mkdir(parents=True, exist_ok=True)
    target = root / args.release_id
    if target.exists():
        raise ValueError('Release already exists')
    with tempfile.TemporaryDirectory(prefix='.prepare-', dir=root) as temp:
        artifact = Path(temp) / 'artifact'
        public = artifact / 'public'
        public.mkdir(parents=True)
        if args.content:
            content = args.content.resolve()
            if not (content / 'index.html').is_file():
                raise ValueError('Static content must contain index.html')
            for item in content.rglob('*'):
                relative = item.relative_to(content)
                if item.is_symlink() or any(part.startswith('.') or part == 'node_modules' for part in relative.parts):
                    raise ValueError('Symlinks, hidden files and node_modules are not public content')
                if item.is_dir():
                    (public / relative).mkdir(exist_ok=True)
                elif item.is_file():
                    shutil.copyfile(item, public / relative)
                else:
                    raise ValueError('Unsupported content file')
        else:
            (public / 'robots.txt').write_text('User-agent: *\nDisallow: /\n')
        (artifact / 'nginx.conf').write_bytes(config)
        info = {'release': args.release_id, 'source_sha': sha, 'has_content': bool(args.content)}
        (public / 'release.json').write_text(json.dumps(info, indent=2) + '\n')
        files = {str(p.relative_to(artifact)): digest(p) for p in sorted(artifact.rglob('*')) if p.is_file()}
        (artifact / 'manifest.json').write_text(json.dumps(dict(info, files=files), indent=2) + '\n')
        verify(artifact)
        for item in artifact.rglob('*'):
            item.chmod(0o555 if item.is_dir() else 0o444)
        artifact.chmod(0o555)
        artifact.rename(target)
    print(json.dumps({'artifact': str(target), **info}))


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--verify', type=Path)
    parser.add_argument('--ref', default='HEAD')
    parser.add_argument('--root', type=Path)
    parser.add_argument('--release-id')
    parser.add_argument('--content', type=Path, help='Built static files, not the source project')
    args = parser.parse_args()
    if args.verify:
        print(json.dumps(verify(args.verify.resolve())))
    else:
        if not args.root or not args.release_id:
            parser.error('--root and --release-id are required for packaging')
        prepare(args)
