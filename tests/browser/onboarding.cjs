const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { startFixture, launchBrowser } = require('./harness.cjs');

(async () => {
  const server = await startFixture();
  let browser;
  try {
    browser = await launchBrowser();
    const context = await browser.newContext({
      viewport: { width: 1440, height: 1000 },
      permissions: ['clipboard-read', 'clipboard-write'],
    });
    const page = await context.newPage();
    if (process.argv.includes('--capture')) {
      await page.goto(server.base + '/courses.html');
      await page.waitForSelector('.classroom-title');
      const folder = path.join(server.root, 'public/assets/images/guides');
      fs.mkdirSync(folder, { recursive: true });
      await page.screenshot({ path: path.join(folder, 'classroom.png') });
      console.log('Captured course guide using synthetic fixture only');
      return;
    }
    const errors = [];
    page.on('pageerror', (e) => errors.push(e.message));
    await page.goto(server.base + '/');
    await page.locator('.sidebar-bottom a').click();
    await page.waitForSelector('.start-guide');
    assert.equal(await page.locator('.start-step').count(), 3);
    assert.equal(await page.locator('.sidebar-bottom [aria-current=page]').count(), 1);
    const footer = await page.locator('.sidebar-bottom').boundingBox();
    assert(footer.y > 800, 'Help link should sit near bottom of desktop sidebar');
    await page.locator('[data-copy-start=install]').click();
    await page.waitForFunction(() =>
      document.querySelector('.start-copy-state').textContent.includes('已复制'),
    );
    const copied = (await page.evaluate(() => navigator.clipboard.readText())).replaceAll(
      '\r\n',
      '\n',
    );
    assert.equal(copied, await page.locator('#startInstallPrompt').inputValue());
    assert(copied.includes('https://github.com/cregret/teacherbuddy'));
    for (const id of ['class', 'learning', 'leads', 'marketing']) {
      await page.locator('[data-copy-start=' + id + ']').click();
      assert((await page.evaluate(() => navigator.clipboard.readText())).length > 50);
    }
    assert.equal(await page.locator('a[href$="teacherbuddy-create-class.zip"]').count(), 1);
    assert.equal(await page.locator('a[href$="teacherbuddy-after-class.zip"]').count(), 1);
    await page.locator('.start-step').first().scrollIntoViewIfNeeded();
    await page.screenshot({
      path: path.join(server.results, 'getting-started-desktop.png'),
      fullPage: true,
    });
    await page.locator('.start-preview summary').click();
    await page.locator('.start-preview img').scrollIntoViewIfNeeded();
    await page.waitForFunction(() => {
      const img = document.querySelector('.start-preview img');
      return img.complete && img.naturalWidth > 0;
    });
    await page.setViewportSize({ width: 390, height: 844 });
    assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
    await page.screenshot({
      path: path.join(server.results, 'getting-started-mobile.png'),
      fullPage: true,
    });
    assert.deepEqual(errors, []);
    console.log(
      'PASS lower-left navigation, installation copy, four first tasks, two ZIP links, screenshot and mobile layout',
    );
  } finally {
    await browser?.close();
    await server.close();
  }
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
