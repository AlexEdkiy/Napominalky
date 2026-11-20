"""Render static RU/EN pages from one design; no browser translation or redirects."""
from html import escape, unescape
from html.parser import HTMLParser
import re
from urllib.parse import urlsplit

CYRILLIC = re.compile(r'[А-Яа-яЁё]')
ATTRIBUTE = re.compile(r'''([\w:-]+)(\s*=\s*)(["'])(.*?)\3''', re.DOTALL)
SOURCE_URL = 'https://www.napominalky.ru/'


class Translator(HTMLParser):
    """Translate complete text nodes and attribute values, retaining the HTML layout."""

    def __init__(self, messages):
        super().__init__(convert_charrefs=False)
        self.messages = messages
        self.parts = []

    def translate(self, value):
        key = unescape(value).strip()
        if not CYRILLIC.search(key):
            return value
        if key not in self.messages:
            raise ValueError(f'Missing English translation: {key}')
        return value[:len(value) - len(value.lstrip())] + escape(self.messages[key], quote=True) + value[len(value.rstrip()):]

    def handle_starttag(self, tag, attrs):
        self.parts.append(ATTRIBUTE.sub(
            lambda m: m[1] + m[2] + m[3] + self.translate(m[4]) + m[3], self.get_starttag_text()))

    def handle_startendtag(self, tag, attrs):
        self.handle_starttag(tag, attrs)

    def handle_endtag(self, tag):
        self.parts.append(f'</{tag}>')

    def handle_data(self, data):
        self.parts.append(self.translate(data))

    def handle_decl(self, decl):
        self.parts.append(f'<!{decl}>')

    def handle_comment(self, comment):
        self.parts.append(f'<!--{comment}-->')

    def handle_entityref(self, name):
        self.parts.append(f'&{name};')

    def handle_charref(self, name):
        self.parts.append(f'&#{name};')


def validate_urls(mode, ru_url, en_url):
    urls = {'ru': ru_url, 'en': en_url}
    for url in urls.values():
        parsed = urlsplit(url)
        if (parsed.scheme != 'https' or not parsed.hostname or parsed.username or parsed.password
                or parsed.query or parsed.fragment or re.search(r'[\s<>"\\]', url)):
            raise ValueError('Language URLs must be absolute HTTPS URLs without credentials, query or fragment')
    if urlsplit(ru_url).path != '/':
        raise ValueError('The Russian landing URL must end in / at its domain root')
    expected = ru_url + 'en/' if mode == 'bilingual' else None
    if expected and en_url != expected:
        raise ValueError('Bilingual output serves Russian at / and English at /en/ on the same domain')
    if mode in ('english', 'russian') and (urlsplit(en_url).path != '/' or en_url == ru_url):
        raise ValueError('Standalone English output needs its own HTTPS domain ending in /')
    return urls


def page_url(base, page):
    return base + ('' if page == 'index.html' else page)


def language_link(locale, urls, page):
    target = 'en' if locale == 'ru' else 'ru'
    url = page_url(urls[target], page)
    if urlsplit(url).netloc == urlsplit(urls[locale]).netloc:
        url = urlsplit(url).path
    label = 'English' if target == 'en' else 'Русский'
    return (f'<a class="language-switch" href="{escape(url, quote=True)}" hreflang="{target}" '
            f'lang="{target}" rel="alternate" aria-label="{label}" title="{label}">'
            f'<img src="/assets/flag-{target}.svg" width="27" height="18" alt="" aria-hidden="true"></a>')


def alternate_links(urls, page, default):
    links = [f'<link rel="alternate" hreflang="{locale}" href="{escape(page_url(url, page), quote=True)}">'
             for locale, url in urls.items()]
    links.append(f'<link rel="alternate" hreflang="x-default" href="{escape(page_url(urls[default], page), quote=True)}">')
    return '\n  '.join(links)


def render_page(source, locale, messages, urls, page, default):
    html = source
    if locale == 'en':
        translator = Translator(messages)
        translator.feed(html)
        translator.close()
        html = ''.join(translator.parts).replace('<html lang="ru">', '<html lang="en">')
        html = html.replace('content="ru_RU"', 'content="en_GB"')
        html = html.replace('/assets/roboto-cyrillic.woff2', '/assets/roboto-latin.woff2')
    base = urls[locale]
    origin = f'{urlsplit(base).scheme}://{urlsplit(base).netloc}'
    html = html.replace(SOURCE_URL + 'assets/fairy.png', origin + '/assets/fairy.png')
    for attribute in ['href', 'content']:
        html = html.replace(f'{attribute}="{page_url(SOURCE_URL, page)}"',
                            f'{attribute}="{escape(page_url(base, page), quote=True)}"')
    html = html.replace('href="/data.html"', f'href="{urlsplit(base).path}data.html"')
    html = html.replace('href="/"', f'href="{urlsplit(base).path}"')
    html = html.replace('<!-- LOCALE_LINKS -->', alternate_links(urls, page, default))
    return html.replace('<!-- LANGUAGE_SWITCH -->', language_link(locale, urls, page))


def render_sitemap(locales, urls, default):
    entries = []
    for locale in locales:
        for page in ['index.html', 'data.html']:
            alternates = ''.join(
                f'<xhtml:link rel="alternate" hreflang="{lang}" href="{escape(page_url(url, page), quote=True)}"/>'
                for lang, url in {**urls, 'x-default': urls[default]}.items())
            entries.append(f'  <url><loc>{escape(page_url(urls[locale], page))}</loc>{alternates}</url>')
    return ('<?xml version="1.0" encoding="UTF-8"?>\n'
            '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" '
            'xmlns:xhtml="http://www.w3.org/1999/xhtml">\n' + '\n'.join(entries) + '\n</urlset>\n')
