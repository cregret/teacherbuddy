const assert = require('node:assert/strict');
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const { launchBrowser } = require('./harness.cjs');

(async () => {
  const root = path.resolve(__dirname, '../../dist');
  let writes = 0;
  const server = http.createServer((req, res) => {
    if (req.method !== 'GET') {
      writes++;
      res.writeHead(405);
      return res.end();
    }
    let name = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
    if (/^\/api\/(model|workspace|state|health|learning)$/.test(name)) name += '.json';
    if (name === '/') name = '/index.html';
    const file = path.resolve(root, '.' + name);
    if (!file.startsWith(root + path.sep) || !fs.existsSync(file) || !fs.statSync(file).isFile()) {
      res.writeHead(404);
      return res.end();
    }
    res.setHeader(
      'Content-Type',
      {
        '.html': 'text/html',
        '.js': 'text/javascript',
        '.css': 'text/css',
        '.json': 'application/json',
        '.svg': 'image/svg+xml',
        '.png': 'image/png',
      }[path.extname(file)] || 'application/octet-stream',
    );
    res.end(fs.readFileSync(file));
  });
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const base = process.env.DEMO_URL || 'http://127.0.0.1:' + server.address().port;
  let browser;
  try {
    const model = await (await fetch(base + '/api/model')).json();
    const workspace = await (await fetch(base + '/api/workspace')).json();
    const state = await (await fetch(base + '/api/state')).json();
    assert.equal(model.classes.length, 9);
    assert.equal(model.students.length, 74);
    assert.equal(workspace.lessons.length, 39);
    assert.equal(model.leads.length, 13);
    assert.equal(model.marketingArticles.length, 7);
    assert.equal(JSON.parse(state['teacherbuddy.finance.v1'].value).accounts.length, 71);
    const focus = workspace.focus.find(
      (f) => model.classes.find((c) => c.id === f.classId)?.status === 'active',
    );
    const studentUrl =
      '/xue.html?id=' +
      encodeURIComponent(focus.studentId) +
      '&class=' +
      encodeURIComponent(focus.classId);
    browser = await launchBrowser();
    const first = await browser.newContext(),
      second = await browser.newContext();
    const page = await first.newPage(),
      other = await second.newPage();
    const errors = [];
    page.on('pageerror', (e) => errors.push(e.message));
    for (const route of [
      'index.html',
      'courses.html',
      'xue.html',
      'qianke.html',
      'payment.html',
      'marketing.html',
      'zhiling.html',
      'yilan.html',
      'getting-started.html',
    ]) {
      await page.goto(base + '/' + route);
      await page.waitForSelector('.demo-mode-link');
      await page.waitForFunction(() => {
        const loading = document.querySelector('#channel .load-state');
        return !loading || loading.hidden;
      });
      assert.equal(await page.locator('#retryLoad').count(), 0, route);
    }
    await page.goto(base + studentUrl);
    await page.locator('#sdAddFollow').click();
    await page.locator('#sdFollowDialog [name=detail]').fill('演示会话独立验证');
    await page.locator('#sdFollowDialog [name=nextStep]').fill('下节课复核');
    await page.locator('#sdFollowDialog [type=submit]').click();
    await page.waitForFunction(() => !document.querySelector('#sdFollowDialog').open);
    await page.reload();
    await page.waitForSelector('.sd-event');
    assert(
      (await page.locator('.sd-event').allTextContents()).join('').includes('演示会话独立验证'),
    );
    await other.goto(base + studentUrl + '&tab=focus');
    await other.waitForSelector('.sd-event');
    assert(
      !(await other.locator('.sd-event').allTextContents()).join('').includes('演示会话独立验证'),
    );
    assert.equal(writes, 0, 'Demo must never upload visitor edits');
    assert.deepEqual(errors, []);
    const health = await (await fetch(base + '/api/health')).json();
    assert.equal(health.demo, true);
    const fixture = require('../../examples/public-demo.json');
    for (const name of Object.keys(fixture.resources)) {
      const response = await fetch(base + '/' + name.split('/').map(encodeURIComponent).join('/'));
      assert.equal(response.status, 200, 'Report ' + name);
    }
    await page.goto(base + '/payment.html');
    await page.waitForSelector('#financeTableBody tr');
    assert((await page.locator('#financeTableBody').innerText()).includes('学员'));
    console.log(
      'PASS full dataset counts, 88 reports, seeded finance, all pages, browser-session persistence and visitor isolation',
    );
  } finally {
    await browser?.close();
    await new Promise((resolve) => server.close(resolve));
  }
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
