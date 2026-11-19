#!/usr/bin/env python3
"""Build the standalone landing; verified APK stays outside source control."""
import argparse
import hashlib
import json
from pathlib import Path
import shutil


def build(output, apk):
    source = Path(__file__).resolve().parent
    release = json.loads((source / 'android-release.json').read_text())
    if apk.stat().st_size != release['size']:
        raise ValueError('APK size differs from the verified MOB-77 release')
    with apk.open('rb') as handle:
        if hashlib.file_digest(handle, 'sha256').hexdigest() != release['sha256']:
            raise ValueError('APK hash differs from the verified MOB-77 release')
    if output.exists():
        raise ValueError('Output must be a new directory')
    shutil.copytree(source / 'site', output)
    (output / 'downloads').mkdir()
    shutil.copyfile(apk, output / 'downloads' / release['filename'])
    print(json.dumps({'output': str(output), 'android_version': release['version'],
                      'android_sha256': release['sha256']}))


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--output', required=True, type=Path)
    parser.add_argument('--apk', required=True, type=Path)
    args = parser.parse_args()
    build(args.output.resolve(), args.apk.resolve())
