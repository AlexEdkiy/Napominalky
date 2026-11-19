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
  try {
    for (const width of [1440, 390, 320, 768]) {
      const context = await browser.newContext({ viewport: { width, height: 900 }, reducedMotion: 'reduce' });
      const page = await context.newPage();
      const errors = [], broken = [], external = [];
      page.on('pageerror', e => errors.push(e.message));
      page.on('response', r => { if (r.status() >= 400) broken.push(`${r.status()} ${r.url()}`); });
      page.on('request', r => { if (new URL(r.url()).origin !== new URL(origin).origin) external.push(r.url()); });
      assert.equal((await page.goto(origin, { waitUntil: 'networkidle' })).status(), 200);
      await page.evaluate(() => document.fonts.ready);
      assert.equal(await page.locator('h1').count(), 1);
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false, `Overflow ${width}`);
      assert.deepEqual(await page.evaluate(() => [...document.querySelectorAll('a[href^="#"]')].filter(a => !document.getElementById(a.hash.slice(1))).map(a => a.hash)), []);
      const rows = page.locator('.demo-item');
      await rows.nth(2).click();
      assert.equal(await page.locator('#demo-label').textContent(), '3 из 5 куплено');
      await rows.nth(2).press('Space');
      assert.equal(await page.locator('#demo-label').textContent(), '2 из 5 куплено');
      for (let i = 0; i < 5; i++) {
        if (await rows.nth(i).getAttribute('aria-pressed') === 'true') await rows.nth(i).click();
      }
      assert.equal(await page.locator('#demo-progress').getAttribute('aria-valuenow'), '0');
      for (let i = 0; i < 5; i++) await rows.nth(i).click();
      assert.equal(await page.locator('#demo-progress').getAttribute('aria-valuenow'), '5');
      for (let i = 2; i < 5; i++) await rows.nth(i).click();
      if (width <= 760) {
        const menu = page.locator('.menu-toggle');
        await menu.click();
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
      await page.screenshot({ path: path.join(output, `landing-${width}.png`), fullPage: true });
      if ([1440,390].includes(width)) await page.screenshot({ path: path.join(output, `hero-${width}.png`) });
      assert.deepEqual(errors, []); assert.deepEqual(broken, []); assert.deepEqual(external, []);
      await page.getByRole('link', { name: 'Как хранятся данные', exact: true }).click();
      assert.match(await page.locator('h1').textContent(), /Как хранятся данные/);
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
      const missing = await context.request.get(origin + '/does-not-exist-web71');
      assert.equal(missing.status(), 404);
      results.push({ width, checklistKeyboardAndPointer: true, menu: width <= 760 ? 'passed' : 'desktop',
        localResources: true, noHorizontalOverflow: true, apkHead: 200, notFound: 404, errors, broken });
      await context.close();
    }
    const report = { checkedAt: new Date().toISOString(), origin, passed: true, results,
      scope: 'Guest landing only, viewport emulation; no real device installation or account mutations.' };
    await fs.writeFile(path.join(output, 'browser.json'), JSON.stringify(report, null, 2));
    console.log(JSON.stringify(report));
  } finally { await browser.close(); }
})().catch(e => { console.error(e.stack); process.exitCode = 1; });
