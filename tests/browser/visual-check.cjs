const fs = require('node:fs');
const path = require('node:path');
const { results, startFixture, launchBrowser } = require('./harness.cjs');
const mode = process.argv[2] || 'compare';
const baseline = path.join(results, 'structure-baseline');
fs.mkdirSync(baseline, { recursive: true });

async function snapshot(page) {
  return page.evaluate(() => {
    const properties = [
      'display',
      'position',
      'fontFamily',
      'fontSize',
      'fontWeight',
      'lineHeight',
      'color',
      'backgroundColor',
      'borderColor',
      'borderRadius',
      'padding',
      'margin',
      'gap',
      'gridTemplateColumns',
      'width',
      'height',
      'overflow',
      'boxShadow',
    ];
    const result = [];
    function visit(root) {
      for (const element of root.querySelectorAll('*')) {
        if (['SCRIPT', 'STYLE', 'LINK', 'META', 'TITLE', 'HEAD'].includes(element.tagName))
          continue;
        const rect = element.getBoundingClientRect();
        if (!rect.width && !rect.height) continue;
        const style = getComputedStyle(element);
        result.push({
          tag: element.tagName,
          id: element.id,
          class: element.getAttribute('class'),
          rect: [rect.x, rect.y, rect.width, rect.height].map((n) => Math.round(n * 100) / 100),
          css: Object.fromEntries(properties.map((key) => [key, style[key]])),
        });
        if (element.shadowRoot) visit(element.shadowRoot);
      }
    }
    visit(document);
    return result;
  });
}

(async () => {
  const server = await startFixture({ current: process.argv.includes('--current') });
  const { fixture } = server;
  let browser;
  let differences = 0;
  let checkedStates = 0;
  try {
    const base = process.env.VISUAL_BASE_URL || server.base;
    browser = await launchBrowser();
    const context = await browser.newContext();
    const page = await context.newPage();
    if (process.env.VISUAL_REFERENCE_CSS_DIR) {
      await page.route('**/assets/css/*.css', (route) => {
        const file = path.join(
          process.env.VISUAL_REFERENCE_CSS_DIR,
          path.basename(new URL(route.request().url()).pathname),
        );
        return fs.existsSync(file)
          ? route.fulfill({ path: file, contentType: 'text/css' })
          : route.continue();
      });
    }
    const errors = [];
    page.on('pageerror', (error) => errors.push(error.message));
    page.on('response', (response) => {
      if (response.status() >= 400)
        errors.push(response.status() + ' ' + new URL(response.url()).pathname);
    });
    const pages = [
      ['home', 'index.html'],
      ['courses', 'courses.html'],
      ['archived', 'courses.html?view=archived'],
      ['schedule', 'yilan.html'],
      ['month', 'yilan.html?view=month'],
      ['students', 'xue.html'],
      ['finance', 'payment.html'],
      ['marketing', 'marketing.html'],
      ['leads', 'qianke.html'],
      ['skills', 'zhiling.html'],
    ];
    const cls = fixture.model.classes[0];
    const homeLesson = cls?.lessons.find((lesson) => lesson.report) || cls?.lessons[0];
    if (homeLesson?.date) pages.push(['home-courses', 'index.html?date=' + homeLesson.date]);
    if (cls) {
      pages.push(
        ['class', 'class-detail.html?id=' + cls.id],
        ['roster', 'class-detail.html?id=' + cls.id + '&tab=students'],
      );
      const student = fixture.model.students.find((student) => student.classIds.includes(cls.id));
      if (student)
        pages.push(
          [
            'student',
            'student-detail.html?id=' + encodeURIComponent(student.id) + '&class=' + cls.id,
          ],
          [
            'report',
            'student-report.html?id=' + encodeURIComponent(student.id) + '&class=' + cls.id,
          ],
        );
      const lesson = cls.lessons.find((lesson) => lesson.report);
      if (lesson)
        pages.push(['share', 'lesson-share.html?class=' + cls.id + '&lesson=' + lesson.number]);
    }
    for (const width of process.env.VISUAL_WIDTHS
      ? process.env.VISUAL_WIDTHS.split(',').map(Number)
      : [1440, 768, 390]) {
      await page.setViewportSize({ width, height: 1000 });
      for (const [name, route] of pages) {
        if (process.env.VISUAL_PAGES && !process.env.VISUAL_PAGES.split(',').includes(name))
          continue;
        checkedStates++;
        await page.goto(base + '/' + route);
        await page
          .waitForFunction(
            () =>
              !document.querySelector('#dashboard[hidden]') &&
              ![...document.querySelectorAll('.load-state, #studentReport, .reading-loading')].some(
                (node) =>
                  !node.shadowRoot &&
                  node.getClientRects().length &&
                  /^正在(?:读取|加载)/.test(node.textContent.trim()),
              ),
          )
          .catch(async (error) => {
            console.log('LOAD FAILURE', route, errors, await page.locator('body').innerText());
            throw error;
          });
        await page.evaluate(() => document.fonts.ready);
        await page.addStyleTag({
          content:
            '*,*::before,*::after { transition: none !important; animation: none !important; }',
        });
        await page.waitForTimeout(120);
        const id = name + '-' + width;
        const actual = await snapshot(page);
        const file = path.join(baseline, id + '.json');
        if (mode === 'record') {
          fs.writeFileSync(file, JSON.stringify(actual));
          await page.screenshot({
            path: path.join(baseline, id + '.png'),
            fullPage: true,
            animations: 'disabled',
          });
        } else {
          const expected = JSON.parse(fs.readFileSync(file, 'utf8'));
          if (JSON.stringify(expected) !== JSON.stringify(actual)) {
            differences++;
            const index = actual.findIndex(
              (node, i) => JSON.stringify(node) !== JSON.stringify(expected[i]),
            );
            fs.writeFileSync(
              path.join(results, id + '-difference.json'),
              JSON.stringify({ index, expected: expected[index], actual: actual[index] }, null, 2),
            );
            await page.screenshot({
              path: path.join(results, id + '-actual.png'),
              fullPage: true,
              animations: 'disabled',
            });
            console.log('DIFFERENCE', id, 'at', actual[index]?.tag, actual[index]?.class);
          }
        }
      }
    }
    if (errors.length) throw Error([...new Set(errors)].join('\n'));
    if (differences) throw Error(differences + ' visual comparisons differ; see test-results');
    console.log(
      'PASS',
      mode,
      checkedStates,
      'responsive page states, no runtime or resource errors',
    );
  } finally {
    await browser?.close();
    await server.close();
  }
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
