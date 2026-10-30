const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { startFixture, launchBrowser } = require('./harness.cjs');

(async () => {
  const fixture = structuredClone(require('../../examples/demo.json'));
  fixture.model.skills.push({ name: '录音整理课节报告', cat: '旧指令', text: '应被更新' });
  const server = await startFixture({ fixture });
  let browser;
  try {
    browser = await launchBrowser();
    const context = await browser.newContext({
      permissions: ['clipboard-read', 'clipboard-write'],
      viewport: { width: 1440, height: 1000 },
    });
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', (e) => errors.push(e.message));
    await page.goto(server.base + '/zhiling.html');
    await page.waitForSelector('#skillPlatform');
    assert.equal(await page.locator('.skills-choice').count(), fixture.model.skills.length + 1);
    assert.equal(
      await page.locator('.skills-choice').filter({ hasText: '录音整理课节报告' }).count(),
      0,
    );
    for (const [name, id] of [
      ['创建班级', 'teacherbuddy-create-class'],
      ['课后学情整理', 'teacherbuddy-after-class'],
    ]) {
      await page.locator('.skills-choice').filter({ hasText: name }).click();
      for (const platform of [
        'ChatGPT',
        'Claude',
        'Gemini',
        'DeepSeek',
        '豆包',
        '通义千问',
        'Codex / Claude Code',
      ]) {
        await page.locator('#skillPlatform').selectOption(platform);
        await page.locator('[data-copy-skill]').click();
        await page.waitForFunction(
          () => document.querySelector('.copy-state').textContent === '已复制',
        );
        assert.equal(
          (await page.evaluate(() => navigator.clipboard.readText())).replaceAll('\r\n', '\n'),
          await page.locator('.skills-prompt-text').inputValue(),
        );
      }
      const downloading = page.waitForEvent('download');
      await page.locator('#downloadSkill').click();
      const download = await downloading;
      assert.equal(download.suggestedFilename(), 'SKILL.md');
      assert.equal(
        fs.readFileSync(await download.path(), 'utf8'),
        fs.readFileSync(
          path.join(server.root, 'src/features/skills/library', id, 'SKILL.md'),
          'utf8',
        ),
      );
    }
    await page.locator('#skillsSearch').fill('知识图谱');
    assert.equal(await page.locator('.skills-choice').count(), 1);
    await page.locator('#skillsSearch').fill('没有这条指令');
    assert.equal(await page.locator('#skillsDetail .result-empty').count(), 1);
    await page.goto(server.base + '/zhiling.html?q=' + encodeURIComponent('创建班级'));
    await page.waitForSelector('#downloadSkill');
    assert.equal(await page.locator('.skills-detail-head h2').innerText(), '创建班级');
    await page.screenshot({
      path: path.join(server.results, 'skills-library.png'),
      fullPage: true,
    });
    await page.setViewportSize({ width: 390, height: 844 });
    assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
    assert.deepEqual(errors, []);
    console.log(
      'PASS two skills, alias replacement, seven platform copy modes, complete native downloads, search, deep links and mobile width',
    );
  } finally {
    await browser?.close();
    await server.close();
  }
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
