#!/usr/bin/env python3
"""OPS-18: export the exact PHP base without legacy application/image secrets.

Only the known four application layers may be removed. No running container is
changed. The output is a Docker-loadable archive, not an image with whiteouts:
excluded layers and their build history are physically absent from the archive.
"""
import argparse
import hashlib
import io
import json
from pathlib import Path
import subprocess
import tarfile

SOURCE = 'sha256:88507808a3030b6fed3e9b41290db2b9022ff09772446317e17df2be364cfd3e'
TAIL = [
    'COPY composer.json composer.lock ./ # buildkit',
    'RUN /bin/sh -c composer install --no-scripts --no-autoloader # buildkit',
    'COPY . . # buildkit',
    'RUN /bin/sh -c composer dump-autoload --optimize # buildkit',
]
SAFE_ENV = {'PATH', 'PHPIZE_DEPS', 'PHP_INI_DIR', 'PHP_CFLAGS', 'PHP_CPPFLAGS',
            'PHP_LDFLAGS', 'GPG_KEYS', 'PHP_VERSION', 'PHP_URL', 'PHP_ASC_URL',
            'PHP_SHA256'}


def add_json(tar, name, value):
    content = json.dumps(value, separators=(',', ':')).encode()
    entry = tarfile.TarInfo(name)
    entry.mode, entry.size = 0o644, len(content)
    tar.addfile(entry, io.BytesIO(content))
    return hashlib.sha256(content).hexdigest()


def extract(source_archive, output):
    inspected = json.loads(subprocess.check_output(['docker', 'image', 'inspect', SOURCE]))[0]
    with tarfile.open(source_archive) as source:
        entries = json.load(source.extractfile('manifest.json'))
        matches = []
        for entry in entries:
            config = json.load(source.extractfile(entry['Config']))
            if config.get('rootfs', {}).get('diff_ids') == inspected['RootFS']['Layers']:
                matches.append((entry, config))
        if len(matches) != 1:
            raise ValueError('Expected exactly one pinned source image')
        entry, config = matches[0]
        if [h.get('created_by') for h in config['history'][-4:]] != TAIL:
            raise ValueError('Unexpected build history; refusing to infer a layer boundary')
        if any(h.get('empty_layer') for h in config['history'][-4:]):
            raise ValueError('Application history must correspond to four filesystem layers')
        if len(entry['Layers']) != 20 or len(config['rootfs']['diff_ids']) != 20:
            raise ValueError('Unexpected pinned image filesystem')
        if {e.split('=', 1)[0] for e in config['config']['Env']} != SAFE_ENV:
            raise ValueError('Unexpected environment; inspect before exporting')
        layers = entry['Layers'][:-4]
        files_checked = 0
        for layer in layers:
            with tarfile.open(fileobj=source.extractfile(layer), mode='r|*') as contents:
                for item in contents:
                    name = item.name.lstrip('./')
                    if item.isfile():
                        files_checked += 1
                        if (name.startswith(('var/www/html/', 'root/.composer/'))
                                or Path(name).name in {'.env', 'auth.json', 'id_rsa', 'id_ed25519'}):
                            raise ValueError('Unexpected private/application file in retained base')
        config['history'] = config['history'][:-4]
        config['rootfs']['diff_ids'] = config['rootfs']['diff_ids'][:-4]
        config['created'] = config['history'][-1]['created']
        config['config']['Labels'] = {'napominalky.runtime.base-of': SOURCE}
        config_bytes = json.dumps(config, separators=(',', ':')).encode()
        config_digest = hashlib.sha256(config_bytes).hexdigest()
        with output.open('xb') as handle:
            output.chmod(0o600)
            with tarfile.open(fileobj=handle, mode='w') as target:
                for layer in layers:
                    target.addfile(source.getmember(layer), source.extractfile(layer))
                add_json(target, config_digest + '.json', config)
                add_json(target, 'manifest.json', [{
                    'Config': config_digest + '.json',
                    'RepoTags': ['napominalky-php-runtime:ops18-clean'],
                    'Layers': layers,
                }])
        with output.open('rb') as archive:
            archive_digest = hashlib.file_digest(archive, 'sha256').hexdigest()
        result = {'source': SOURCE, 'retained_layers': len(layers), 'removed_layers': 4,
                  'retained_regular_files_checked': files_checked,
                  'config_sha256': config_digest,
                  'archive_sha256': archive_digest}
        print(json.dumps(result))


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--source-archive', type=Path, required=True)
    parser.add_argument('--output', type=Path, required=True)
    args = parser.parse_args()
    extract(args.source_archive, args.output)
