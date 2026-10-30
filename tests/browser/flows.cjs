const assert = require('node:assert/strict');
const { startFixture, launchBrowser } = require('./harness.cjs');

(async () => {
  const fixture = structuredClone(require('../../examples/demo.json'));
  fixture.model.skills.push({
    ...fixture.model.skills[0],
    name: '第二条测试指令',
    text: 'SECOND_PROMPT',
  });
  const server = await startFixture({ fixture });
  let browser;
  try {
    browser = await launchBrowser();
    const context = await browser.newContext({
      permissions: ['clipboard-read', 'clipboard-write'],
    });
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', (error) => errors.push(error.message));
    await page.goto(server.base + '/');
    await page.waitForSelector('.ov-dynamic-link');
    await page.goto(server.base + '/courses.html');
    await page.locator('.classroom-title').click();
    await page.waitForSelector('#lessonBriefContent');

    await page.goto(server.base + '/xue.html?id=student-demo');
    await page.locator('#sdAddFollow').click();
    const follow = page.locator('#sdFollowDialog form');
    await follow.locator('[name=detail]').fill('模块整理后的跟进验证');
    await follow.locator('[name=nextStep]').fill('下一课复核');
    await follow.locator('[type=submit]').click();
    await page.waitForFunction(() => !document.querySelector('#sdFollowDialog').open);
    const second = await browser.newContext();
    const otherPage = await second.newPage();
    await otherPage.goto(server.base + '/xue.html?id=student-demo');
    await otherPage.locator('[data-detail-tab=focus]').click();
    assert(
      (await otherPage.locator('.sd-event').allTextContents())
        .join('')
        .includes('模块整理后的跟进验证'),
    );
    const event = otherPage.locator('.sd-event').filter({ hasText: '模块整理后的跟进验证' });
    await event.locator('[data-resolve] input').fill('已复核');
    await event.locator('[data-resolve] button').click();
    await otherPage.waitForSelector('.sd-result');
    await second.close();

    await page.goto(server.base + '/payment.html');
    await page.locator('[data-action=charge]').first().click();
    const finance = page.locator('#financeEntry');
    await finance.locator('[name=note]').fill('第 02 讲 · 核销验证');
    await finance.locator('[type=submit]').click();
    await page.waitForFunction(() => !document.querySelector('#financeDialog').open);
    const state = await page.evaluate(async () => (await fetch('/api/state')).json());
    const ledger = JSON.parse(state['teacherbuddy.finance.v1'].value);
    assert.equal(ledger.events.filter((entry) => entry.type === 'charge').length, 2);
    await page.reload();
    assert((await page.locator('#financeTableBody').innerText()).includes('800.00'));

    await page.goto(server.base + '/marketing.html');
    await page.locator('#marketingEdit').click();
    await page.locator('#marketingDraftEditor').fill('模块整理后的文章保存验证');
    await page.locator('#saveMarketingDraft').click();
    await page.waitForFunction(() =>
      document.querySelector('#marketingActionState').textContent.includes('已保存'),
    );
    await page.reload();
    await page.waitForSelector('#marketingDraftEditor', { state: 'attached' });
    assert.equal(
      await page.locator('#marketingDraftEditor').inputValue(),
      '模块整理后的文章保存验证',
    );
    const downloaded = page.waitForEvent('download');
    await page.locator('#downloadMarketingWord').click();
    assert((await downloaded).suggestedFilename().endsWith('.docx'));

    await page.goto(server.base + '/zhiling.html');
    await page.locator('[data-skill-index]').filter({ hasText: '第二条测试指令' }).click();
    await page.locator('[data-copy-skill]').click();
    assert.equal(await page.evaluate(() => navigator.clipboard.readText()), 'SECOND_PROMPT');
    await page.goto(server.base + '/yilan.html');
    await page.locator('[data-view=month]').click();
    await page.waitForSelector('.record-month');
    assert.deepEqual(errors, []);
    console.log(
      'PASS class navigation, student follow-up, cross-browser persistence, finance, marketing export, Skills copy and calendar switching',
    );
  } finally {
    await browser?.close();
    await server.close();
  }
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
