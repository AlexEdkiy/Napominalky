#!/usr/bin/env python3
"""Re-pin runtime images without rebuilding or changing deployed application code."""
import argparse
import json
from pathlib import Path
import re
import shutil
import tempfile

from prepare import checksum
from runtime import docker, verify


def repack(source, destination, api_image, web_image):
    source, destination = source.resolve(), destination.resolve()
    original = verify(source)
    if destination.exists() or not re.fullmatch(r'[a-z0-9][a-z0-9-]{0,59}', destination.name):
        raise ValueError('Destination must be a new valid release directory')
    if destination.is_relative_to(source):
        raise ValueError('Destination must not be inside the source release')
    images = {role: docker('image', 'inspect', image, '--format', '{{.Id}}')
              for role, image in [('api', api_image), ('web', web_image)]}
    info = {key: value for key, value in original.items() if key != 'files'}
    info.update(release=destination.name, images=images, runtime_repack={
        'from_release': original['release'],
        'from_manifest_sha256': checksum(source / 'manifest.json'),
        'repackager_sha256': checksum(Path(__file__)),
        'application_bytes_unchanged': True,
    })
    markers = {'web/release.json', 'web-root/release.json'} & set(original['files'])
    destination.parent.mkdir(parents=True, exist_ok=True)
    with tempfile.TemporaryDirectory(prefix='.repack-', dir=destination.parent) as temporary:
        output = Path(temporary) / 'artifact'
        shutil.copytree(source, output)
        for name in markers:
            path = output / name
            path.chmod(0o644)
            path.write_text(json.dumps(info, indent=2) + '\n')
        files = {str(path.relative_to(output)): checksum(path)
                 for path in sorted(output.rglob('*')) if path.is_file() and path != output / 'manifest.json'}
        # Check the whole file set, including dependency code and both web bundles.
        if set(files) != set(original['files']):
            raise ValueError('Repack changed the application file set')
        if any(files[name] != original['files'][name] for name in files.keys() - markers):
            raise ValueError('Repack changed application bytes')
        manifest = output / 'manifest.json'
        manifest.chmod(0o644)
        manifest.write_text(json.dumps(dict(info, files=files), indent=2) + '\n')
        verify(output)
        output.chmod(0o755)
        output.rename(destination)
    for path in destination.rglob('*'):
        path.chmod(0o555 if path.is_dir() or path.stat().st_mode & 0o111 else 0o444)
    destination.chmod(0o555)
    print(json.dumps({'release': destination.name, 'source_sha': original['source_sha'],
                      'files': len(files), 'changed_files': sorted(markers | {'manifest.json'}),
                      'images': images}))


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--source', type=Path, required=True)
    parser.add_argument('--destination', type=Path, required=True)
    parser.add_argument('--api-image', required=True)
    parser.add_argument('--web-image', required=True)
    args = parser.parse_args()
    repack(args.source, args.destination, args.api_image, args.web_image)
