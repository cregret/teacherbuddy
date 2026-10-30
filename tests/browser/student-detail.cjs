const assert = require('node:assert/strict');
const path = require('node:path');
const { startFixture, launchBrowser } = require('./harness.cjs');

(async () => {
  const fixture = structuredClone(require('../../examples/demo.json'));
  const archived = {
    ...structuredClone(fixture.model.classes[0]),
    id: 'archive-class',
    label: '历史班',
    status: 'archived',
  };
  fixture.model.classes.push(archived);
  fixture.model.students[0].classIds.push(archived.id);
  const record = fixture.workspace.classLearning['demo-class']['示例学生'];
  fixture.workspace.classLearning[archived.id] = {
    示例学生: {
      ...structuredClone(record),
      classId: archived.id,
      latest: '历史班专属摘要',
      focus: '历史班专属练习',
    },
  };
  fixture.model.classes.push({
    ...structuredClone(archived),
    id: 'empty-class',
    label: '无记录班',
  });
  fixture.model.students[0].classIds.push('empty-class');
  const server = await startFixture({ fixture });
  let browser;
  try {
    browser = await launchBrowser();
    const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
    const errors = [];
    page.on('pageerror', (e) => errors.push(e.message));
    const detail = server.base + '/student-detail.html?id=student-demo&class=demo-class';
    await page.goto(detail);
    await page.waitForSelector('.sp-latest');
    assert.equal(await page.locator('.sp-latest').innerText(), record.latest);
    await page.locator('#spClass').selectOption(archived.id);
    assert.equal(await page.locator('.sp-latest').innerText(), '历史班专属摘要');
    assert.equal(await page.locator('.sp-pending').count(), 0);
    await page.reload();
    await page.waitForSelector('.sp-latest');
    assert.equal(await page.locator('#spClass').inputValue(), archived.id);
    await page.locator('#spClass').selectOption('empty-class');
    assert.equal(await page.locator('.sp-latest').count(), 0);
    assert(await page.locator('#spFeedback').isDisabled());
    await page.locator('#spClass').selectOption('demo-class');
    await page.locator('[data-detail-tab=history]').click();
    const lesson = page.locator('.sp-content a').filter({ hasText: '第 01 讲' });
    assert((await lesson.getAttribute('href')).includes('lesson=1'));
    await lesson.click();
    await page.waitForSelector('#lessonBriefContent');
    await page.goto(detail);
    await page.locator('#spFeedback').click();
    await page.locator('#spFeedbackDialog textarea').fill('家长反馈保存验证');
    await page.locator('[data-feedback=save]').click();
    await page.waitForFunction(
      () => document.querySelector('#spFeedbackDialog [role=status]').textContent === '草稿已保存',
    );
    await page.reload();
    await page.locator('#spFeedback').click();
    assert.equal(await page.locator('#spFeedbackDialog textarea').inputValue(), '家长反馈保存验证');
    await page.locator('[data-feedback=close]').click();
    await page.locator('[data-detail-tab=focus]').click();
    assert.equal(await page.locator('[data-resolve]').count(), 1);
    await page.locator('[data-resolve] input').fill('已联系并完成订正');
    await page.locator('[data-resolve] button').click();
    await page.waitForSelector('.sd-result');
    await page.goto(server.base + '/');
    await page.waitForSelector('#overviewFocus', { state: 'attached' });
    assert.equal(await page.locator('[data-process-key="demo-focus"]').count(), 0);
    await page.goto(server.base + '/xue.html?id=student-demo&class=demo-class&tab=focus');
    await page.waitForSelector('.sd-result');
    assert((await page.locator('.sd-result').innerText()).includes('已联系并完成订正'));
    await page.locator('[data-detail-tab=finance]').click();
    assert((await page.locator('.sp-table-scroll').innerText()).includes('900.00'));
    await page.getByRole('link', { name: '进入缴费课消 →' }).click();
    await page.locator('[data-action=charge]').first().click();
    await page.locator('#financeEntry [name=note]').fill('同步验证');
    await page.locator('#financeEntry [type=submit]').click();
    await page.waitForFunction(() => !document.querySelector('#financeDialog').open);
    await page.goto(detail + '&tab=finance');
    await page.waitForSelector('.sp-table-scroll');
    assert((await page.locator('.sp-table-scroll').innerText()).includes('800.00'));
    await page.locator('#spClass').selectOption('archive-class');
    assert.equal(await page.locator('.sp-table-scroll').count(), 0);
    await page.goto(detail);
    await page.waitForSelector('.sp-latest');
    await page.screenshot({
      path: path.join(server.results, 'student-detail-desktop.png'),
      fullPage: true,
    });
    await page.setViewportSize({ width: 390, height: 844 });
    assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
    await page.screenshot({
      path: path.join(server.results, 'student-detail-mobile.png'),
      fullPage: true,
    });
    await page.goto(server.base + '/student-detail.html?id=missing');
    await page.getByText('没有找到这位学生').waitFor();
    assert.deepEqual(errors, []);
    console.log(
      'PASS class isolation, archived/empty records, lesson navigation, feedback drafts, follow-up sync, finance sync, mobile layout and invalid ID',
    );
  } finally {
    await browser?.close();
    await server.close();
  }
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
