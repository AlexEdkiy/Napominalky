const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const origin = process.env.LANDING_URL || 'http://127.0.0.1:18771';
const output = process.env.CHECK_OUTPUT;
(async () => {
  if (!output) throw new Error('CHECK_OUTPUT is required');
  await fs.mkdir(output, { recursive: true });
  const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_BINARY || '/snap/bin/chromium', headless: true,
    args: ['--no-sandbox', '--disable-dev-shm-usage', '--disable-gpu'] });
  const results = [];
  const languages = (process.env.LANDING_LANGUAGES || 'ru,en').split(',');
  try {
    for (const language of languages) {
    const english = language === 'en';
    const route = english ? (process.env.LANDING_EN_PATH || '/en/') : '/';
    const canonical = english ? (process.env.LANDING_CANONICAL_EN || 'https://www.napominalky.ru/en/') : 'https://www.napominalky.ru/';
    const count = n => english ? `${n} of 5 bought` : `${n} из 5 куплено`;
    for (const width of [1440, 1024, 390, 320, 768]) {
      const context = await browser.newContext({ viewport: { width, height: 900 }, reducedMotion: 'reduce' });
      const page = await context.newPage();
      const errors = [], broken = [], external = [];
      page.on('pageerror', e => errors.push(e.message));
      page.on('response', r => { if (r.status() >= 400) broken.push(`${r.status()} ${r.url()}`); });
      page.on('request', r => { if (new URL(r.url()).origin !== new URL(origin).origin) external.push(r.url()); });
      assert.equal((await page.goto(origin + route, { waitUntil: 'networkidle' })).status(), 200);
      await page.evaluate(() => document.fonts.ready);
      assert.equal(await page.locator('h1').count(), 1);
      assert.equal(await page.locator('html').getAttribute('lang'), language);
      assert.equal(await page.locator('link[rel=canonical]').getAttribute('href'), canonical);
      assert.equal(await page.locator('meta[property="og:url"]').getAttribute('content'), canonical);
      assert.equal(await page.locator('meta[property="og:image"]').getAttribute('content'), new URL('/assets/fairy.png', canonical).href);
      assert.equal(await page.locator('link[hreflang=en]').getAttribute('href'), process.env.LANDING_CANONICAL_EN || 'https://www.napominalky.ru/en/');
      assert.equal(await page.locator('.language-switch').getAttribute('aria-label'), english ? 'English. Switch to Russian' : 'Русский язык. Переключить на английский');
      assert.equal(await page.locator('.language-switch img').getAttribute('src'), `/assets/flag-${language}.svg`);
      const flagImage = await page.locator('.language-switch img').boundingBox();
      assert.equal(flagImage.width, 21);
      assert.equal(flagImage.height, 14);
      if (english) assert.doesNotMatch(await page.locator('body').innerText(), /[А-Яа-яЁё]/);
      const flagBox = await page.locator('.language-switch').boundingBox();
      assert.ok(flagBox.width >= 44 && flagBox.height >= 44);
      const brandBox = await page.locator('.site-brand').boundingBox();
      assert.ok(Math.abs(brandBox.y - flagBox.y) < 12, `Language switch must stay in header at ${width}`);
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false, `Overflow ${width}`);
      assert.deepEqual(await page.evaluate(() => [...document.querySelectorAll('a[href^="#"]')].filter(a => !document.getElementById(a.hash.slice(1))).map(a => a.hash)), []);
      const rows = page.locator('.demo-item');
      await rows.nth(2).click();
      assert.equal(await page.locator('#demo-label').textContent(), count(3));
      await rows.nth(2).press('Space');
      assert.equal(await page.locator('#demo-label').textContent(), count(2));
      for (let i = 0; i < 5; i++) {
        if (await rows.nth(i).getAttribute('aria-pressed') === 'true') await rows.nth(i).click();
      }
      assert.equal(await page.locator('#demo-progress').getAttribute('aria-valuenow'), '0');
      for (let i = 0; i < 5; i++) await rows.nth(i).click();
      assert.equal(await page.locator('#demo-progress').getAttribute('aria-valuenow'), '5');
      for (let i = 2; i < 5; i++) await rows.nth(i).click();
      if (width <= 1100) {
        const menu = page.locator('.menu-toggle');
        await menu.click();
        assert.equal(await menu.getAttribute('aria-label'), english ? 'Close menu' : 'Закрыть меню');
        assert.equal(await menu.getAttribute('aria-expanded'), 'true');
        await page.locator('#primary-nav a[href="#features"]').click();
        assert.equal(await menu.getAttribute('aria-expanded'), 'false');
        await menu.click();
        await menu.press('Escape');
        assert.equal(await menu.getAttribute('aria-expanded'), 'false');
      }
      await page.locator('#start').scrollIntoViewIfNeeded();
      await page.waitForFunction(() => { const image = document.querySelector('#start img'); return image.complete && image.naturalWidth > 0; });
      assert.equal(await page.locator('#start img').evaluate(i => i.complete && i.naturalWidth > 0), true);
      assert.equal(await page.locator('a[download]').getAttribute('href'), '/downloads/napominalky-1.0.8-52.apk');
      const apk = await context.request.head(origin + '/downloads/napominalky-1.0.8-52.apk');
      assert.equal(apk.status(), 200);
      assert.equal(Number(apk.headers()['content-length']), 121111666);
      await page.evaluate(() => scrollTo(0, 0));
      await page.screenshot({ path: path.join(output, `landing-${language}-${width}.png`), fullPage: true });
      if ([1440,390].includes(width)) await page.screenshot({ path: path.join(output, `hero-${language}-${width}.png`) });
      assert.deepEqual(errors, []); assert.deepEqual(broken, []); assert.deepEqual(external, []);
      await page.getByRole('link', { name: english ? 'How your data is stored' : 'Как хранятся данные', exact: true }).click();
      assert.equal(await page.locator('h1').textContent(), english ? 'How your data is stored' : 'Как хранятся данные');
      assert.equal(await page.locator('link[rel=canonical]').getAttribute('href'), canonical + 'data.html');
      if (english) assert.doesNotMatch(await page.locator('body').innerText(), /[А-Яа-яЁё]/);
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
      const missing = await context.request.get(origin + '/does-not-exist-web71');
      assert.equal(missing.status(), 404);
      results.push({ language, width, checklistKeyboardAndPointer: true, menu: width <= 1100 ? 'passed' : 'desktop',
        localResources: true, noHorizontalOverflow: true, apkHead: 200, notFound: 404, errors, broken });
      await context.close();
    }
    // Switch with the keyboard, retain the current section, and reload the direct URL.
    if (languages.length === 2) {
      const context = await browser.newContext({ viewport: { width: 390, height: 900 } });
      const redirect = await context.request.get(origin + '/en?check=landing', { maxRedirects: 0 });
      assert.equal(redirect.status(), 301);
      assert.equal(redirect.headers()['location'], '/en/?check=landing');
      const page = await context.newPage();
      await page.goto(origin + route + '#features');
      await page.locator('.language-switch').focus();
      await page.locator('.language-switch').press('Enter');
      await page.waitForURL(origin + (english ? '/' : '/en/') + '#features');
      assert.equal(await page.locator('html').getAttribute('lang'), english ? 'ru' : 'en');
      await page.reload();
      assert.equal(await page.locator('html').getAttribute('lang'), english ? 'ru' : 'en');
      await context.close();
    }
    // All translated content and the language link must also work without JavaScript.
    const noJs = await browser.newContext({ javaScriptEnabled: false, viewport: { width: 320, height: 900 } });
    const page = await noJs.newPage();
    await page.goto(origin + route);
    assert.equal(await page.locator('html').getAttribute('lang'), language);
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
    if (english) assert.doesNotMatch(await page.locator('body').innerText(), /[А-Яа-яЁё]/);
    if (languages.length === 2) {
      await page.locator('.language-switch').click();
      await page.waitForURL(origin + (english ? '/' : '/en/'));
      assert.equal(await page.locator('html').getAttribute('lang'), english ? 'ru' : 'en');
      await page.goto(origin + route + 'data.html');
      await page.locator('.language-switch').click();
      await page.waitForURL(origin + (english ? '/' : '/en/') + 'data.html');
    }
    await noJs.close();
    }
    const report = { checkedAt: new Date().toISOString(), origin, passed: true, results,
      scope: 'Guest landing only, viewport emulation; no real device installation or account mutations.' };
    await fs.writeFile(path.join(output, 'browser.json'), JSON.stringify(report, null, 2));
    console.log(JSON.stringify(report));
  } finally { await browser.close(); }
})().catch(e => { console.error(e.stack); process.exitCode = 1; });
