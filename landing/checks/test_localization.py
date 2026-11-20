"""Regression checks for static translation and the future independent EN domain."""
import json
from pathlib import Path
import sys
import unittest
import xml.etree.ElementTree as ET

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from localize import Translator, render_page, render_sitemap, validate_urls

SOURCE = Path(__file__).resolve().parents[1]
MESSAGES = json.loads((SOURCE / 'locales/en.json').read_text())
RU = 'https://www.napominalky.ru/'


class LocalizationTests(unittest.TestCase):
    def render(self, locale, page='index.html', mode='bilingual'):
        urls = validate_urls(mode, RU, RU + 'en/' if mode == 'bilingual' else 'https://example.com/')
        return render_page((SOURCE / 'site' / page).read_text(), locale, MESSAGES, urls,
                           page, 'ru')

    def test_english_content_and_accessibility_are_prerendered(self):
        html = self.render('en')
        for text in ['<html lang="en">', 'Free your mind for what matters.', '2 of 5 bought',
                     'data-template="{done} of {total} bought"', 'data-close-label="Close menu"',
                     'content="en_GB"', 'alt="The Napominalky fairy', 'href="/en/data.html"']:
            self.assertIn(text, html)
        for text in ['Напоминалки', 'куплено', 'Купить', '<!-- LANGUAGE_SWITCH -->', '<!-- LOCALE_LINKS -->']:
            self.assertNotIn(text, html)
        self.assertIn('href="/" hreflang="ru"', html)
        self.assertIn('aria-label="English. Switch to Russian"', html)

    def test_russian_and_english_canonical_and_shared_assets(self):
        for lang, url in [('ru', RU), ('en', RU + 'en/')]:
            html = self.render(lang)
            self.assertIn(f'rel="canonical" href="{url}"', html)
            self.assertIn(f'property="og:url" content="{url}"', html)
            self.assertIn(f'property="og:image" content="{RU}assets/fairy.png"', html)
            self.assertNotIn('/en/assets/', html)
            self.assertIn('hreflang="en" href="https://www.napominalky.ru/en/"', html)
        self.assertIn('Освободите голову для важного.', self.render('ru'))
        self.assertIn('href="/en/" hreflang="en"', self.render('ru'))

    def test_data_page_keeps_language_and_counterpart(self):
        html = self.render('en', 'data.html')
        self.assertIn('href="/en/">Napominalky</a>', html)
        self.assertIn('href="/data.html" hreflang="ru"', html)
        self.assertIn(f'rel="canonical" href="{RU}en/data.html"', html)
        self.assertIn('Your account and sync', html)

    def test_standalone_english_has_no_ru_canonical_or_en_path(self):
        html = self.render('en', mode='english')
        self.assertIn('rel="canonical" href="https://example.com/"', html)
        self.assertIn('property="og:image" content="https://example.com/assets/fairy.png"', html)
        self.assertIn('href="https://www.napominalky.ru/" hreflang="ru"', html)
        self.assertIn('href="/data.html"', html)
        self.assertNotIn('/en/', html)
        self.assertIn('href="https://www.napominalky.ru/data.html" hreflang="ru"',
                      self.render('en', 'data.html', 'english'))

    def test_sitemap_lists_only_pages_served_on_this_domain(self):
        ns = {'s': 'http://www.sitemaps.org/schemas/sitemap/0.9', 'x': 'http://www.w3.org/1999/xhtml'}
        for mode, languages, en, expected in [
            ('bilingual', ['ru', 'en'], RU + 'en/', [RU, RU + 'data.html', RU + 'en/', RU + 'en/data.html']),
            ('english', ['en'], 'https://example.com/', ['https://example.com/', 'https://example.com/data.html']),
            ('russian', ['ru'], 'https://example.com/', [RU, RU + 'data.html'])
        ]:
            xml = render_sitemap(languages, validate_urls(mode, RU, en), 'ru')
            root = ET.fromstring(xml)
            self.assertEqual([e.text for e in root.findall('s:url/s:loc', ns)], expected)
            for entry in root.findall('s:url', ns):
                self.assertEqual({e.attrib['hreflang'] for e in entry.findall('x:link', ns)}, {'ru', 'en', 'x-default'})

    def test_future_russian_site_links_back_to_english_domain(self):
        html = self.render('ru', mode='russian')
        self.assertIn(f'rel="canonical" href="{RU}"', html)
        self.assertIn('href="https://example.com/" hreflang="en"', html)
        self.assertIn('hreflang="en" href="https://example.com/"', html)
        self.assertNotIn('/en/', html)

    def test_untranslated_text_stops_the_build(self):
        with self.assertRaisesRegex(ValueError, 'Missing English translation'):
            Translator({}).feed('<p>Новая строка</p>')

    def test_translation_is_escaped(self):
        parser = Translator({'Текст': 'Milk & bread <script> "quotes"'})
        parser.feed('<p title="Текст">Текст</p>')
        html = ''.join(parser.parts)
        self.assertNotIn('<script>', html)
        self.assertIn('title="Milk &amp; bread &lt;script&gt; &quot;quotes&quot;"', html)

    def test_rejects_unknown_or_inconsistent_domain_configuration(self):
        for mode, ru, en in [('bilingual', RU, 'https://example.com/'),
                             ('english', RU, RU), ('english', RU, 'https://example.com/en/'),
                             ('english', RU, 'http://example.com/'),
                             ('english', RU, 'https://user:password@example.com/'),
                             ('english', RU, 'https://example.com/?unsafe=1')]:
            with self.subTest(en=en), self.assertRaises(ValueError):
                validate_urls(mode, ru, en)


if __name__ == '__main__':
    unittest.main()
