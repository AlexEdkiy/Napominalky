#!/usr/bin/env python3
"""Build the standalone landing; verified APK stays outside source control."""
import argparse
import hashlib
import json
from pathlib import Path
import shutil
from localize import render_page, render_sitemap, validate_urls


def build(output, apk, mode='bilingual', ru_url='https://www.napominalky.ru/', en_url=None):
    source = Path(__file__).resolve().parent
    if mode != 'bilingual' and en_url is None:
        raise ValueError('--en-url is required when the language versions use separate domains')
    urls = validate_urls(mode, ru_url, en_url or ru_url + 'en/')
    locales = {'bilingual': ['ru', 'en'], 'english': ['en'], 'russian': ['ru']}[mode]
    default = 'ru'  # Reciprocal alternates use the same fallback on both domains.
    messages = json.loads((source / 'locales/en.json').read_text())
    pages = {(locale, page): render_page((source / 'site' / page).read_text(), locale, messages, urls, page, default)
             for locale in locales for page in ['index.html', 'data.html']}
    release = json.loads((source / 'android-release.json').read_text())
    if apk.stat().st_size != release['size']:
        raise ValueError('APK size differs from the verified MOB-77 release')
    with apk.open('rb') as handle:
        if hashlib.file_digest(handle, 'sha256').hexdigest() != release['sha256']:
            raise ValueError('APK hash differs from the verified MOB-77 release')
    if output.exists():
        raise ValueError('Output must be a new directory')
    shutil.copytree(source / 'site', output)
    for (locale, page), html in pages.items():
        directory = output / ('en' if mode == 'bilingual' and locale == 'en' else '')
        directory.mkdir(exist_ok=True)
        (directory / page).write_text(html)
    (output / 'sitemap.xml').write_text(render_sitemap(locales, urls, default))
    (output / 'robots.txt').write_text('User-agent: *\nAllow: /\nDisallow: /downloads/\n'
                                      f'Sitemap: {urls[locales[0]]}sitemap.xml\n')
    (output / 'downloads').mkdir()
    shutil.copyfile(apk, output / 'downloads' / release['filename'])
    print(json.dumps({'output': str(output), 'android_version': release['version'],
                      'android_sha256': release['sha256'], 'mode': mode, 'language_urls': urls}))


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--output', required=True, type=Path)
    parser.add_argument('--apk', required=True, type=Path)
    parser.add_argument('--mode', choices=['bilingual', 'english', 'russian'], default='bilingual')
    parser.add_argument('--ru-url', default='https://www.napominalky.ru/')
    parser.add_argument('--en-url', help='English landing URL; required for standalone English output')
    args = parser.parse_args()
    build(args.output.resolve(), args.apk.resolve(), args.mode, args.ru_url, args.en_url)
