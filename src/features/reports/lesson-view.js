import sharedReportTheme from '../../styles/reports/shared-theme.css';
import { escapeHtml as e } from '../../core/html.js';
import reportTheme from '../../styles/reports/lesson-theme.css';

const overrides = `:host{display:block;min-width:0;background:#F2F7F3}.container{max-width:760px;width:100%;margin:0 auto}.brand{display:flex}.hero h1{display:block}.panel{overflow-wrap:anywhere}img{max-width:100%}`;
async function mount(host, href) {
  const url = new URL(href, location.href);
  if (url.origin !== location.origin || !url.pathname.includes('/class/'))
    throw Error('简报地址无效');
  const response = await fetch(url, { cache: 'no-store' });
  if (!response.ok) throw Error('简报暂时无法读取');
  const doc = new DOMParser().parseFromString(await response.text(), 'text/html');
  const content = doc.querySelector('.container');
  if (!content) throw Error('简报正文缺失');
  content.querySelector('.foot')?.remove();
  content
    .querySelectorAll('script,iframe,object,embed,link,meta,base,form')
    .forEach((n) => n.remove());
  content.querySelectorAll('*').forEach((node) => {
    [...node.attributes].forEach((a) => {
      if (/^on/i.test(a.name)) node.removeAttribute(a.name);
    });
    ['src', 'href'].forEach((attr) => {
      if (!node.hasAttribute(attr)) return;
      const raw = node.getAttribute(attr);
      if (raw.startsWith('#')) return;
      const target = new URL(raw, url);
      if (target.origin === location.origin && /^https?:$/.test(target.protocol))
        node.setAttribute(attr, target.href);
      else node.removeAttribute(attr);
    });
  });
  if (!host.isConnected) return;
  const shadow = host.shadowRoot || host.attachShadow({ mode: 'open' });
  const styles = document.createElement('style');
  styles.textContent =
    [...doc.querySelectorAll('style')]
      .map((s) => s.textContent.replace(/:root/g, ':host').replace(/\bbody\s*\{/g, ':host{'))
      .join('\n') +
    '\n' +
    overrides;
  shadow.replaceChildren(styles, document.importNode(content, true));
  host.textContent = '';
  host.dataset.loaded = 'true';
}

function mountRecord(host, cls, lesson, standalone = false) {
  const r = lesson.report,
    items = (values) =>
      '<ul>' + (values || []).map((x) => '<li>' + e(x) + '</li>').join('') + '</ul>';
  if (!r) return;
  host.innerHTML =
    '<article class="received-report"><header class="report-intro"><h2>' +
    e(r.title) +
    '</h2><p>' +
    e(cls.label) +
    ' · 第 ' +
    lesson.number +
    ' 讲 · ' +
    e(lesson.date) +
    (lesson.time ? ' · ' + e(lesson.time) : '') +
    '</p></header>' +
    '<section><h3>学习总览</h3><p class="report-summary-goal">' +
    e(r.goal) +
    '</p><p>' +
    e(r.summary) +
    '</p>' +
    (r.assessment ? '<p><strong>随堂测验：</strong>' + e(r.assessment) + '</p>' : '') +
    '</section>' +
    '<section class="report-next"><h3>下节课安排</h3>' +
    items(r.next) +
    '</section>' +
    '<section><h3>重点关注学生</h3>' +
    ((r.focus || []).length
      ? r.focus
          .map(
            (f) =>
              '<div class="report-focus-item">' +
              (standalone
                ? '<strong>' + e(f.name) + '</strong>'
                : '<a href="' + e(Product.studentLink(f.studentId)) + '">' + e(f.name) + '</a>') +
              '<p>' +
              e(f.text) +
              '</p></div>',
          )
          .join('')
      : '<p>本节未新增个别跟进事项，下节课统一回看共性问题。</p>') +
    '</section>' +
    '<section><h3>共性薄弱点</h3>' +
    items(r.weaknesses) +
    '</section>' +
    '<section><h3>班级亮点</h3>' +
    items(r.highlights) +
    (r.teachingReflection
      ? '<p class="report-teaching-reflection"><strong>教学反思：</strong>' +
        e(r.teachingReflection) +
        '</p>'
      : '') +
    '</section>' +
    '<section><h3>本节课讲了什么</h3>' +
    items(r.content) +
    '</section>' +
    '<section><h3>学习足迹</h3>' +
    (r.footprints || [])
      .map(
        (x) =>
          '<div class="report-footprint"><span>' +
          e(x.time) +
          '</span><div>' +
          e(x.text) +
          '</div></div>',
      )
      .join('') +
    '</section></article>';
  const source = host.querySelector('.received-report');
  const container = document.createElement('div');
  container.className = 'container';
  container.innerHTML =
    '<div class="brand"><div class="brand-logo"><img src="demo-logo.svg" alt="TeacherBuddy" style="width:100%"></div><div><div class="brand-name">TeacherBuddy</div><div class="brand-sub">班级学习简报</div></div></div><div class="hero"><div class="tag">' +
    e(cls.label) +
    ' · ' +
    e(lesson.label || '第 ' + String(lesson.number).padStart(2, '0') + ' 讲') +
    '</div><h1>' +
    e(r.title) +
    '</h1><div class="sub">' +
    e(lesson.date) +
    ' ' +
    e(lesson.time || '') +
    '</div><div class="quote">' +
    e(r.summary || '') +
    '</div></div>';
  source.querySelectorAll(':scope > section').forEach((section) => {
    section.classList.add('panel');
    const h = section.querySelector('h3');
    if (h) {
      const title = document.createElement('div');
      title.className = 'panel-title';
      title.innerHTML = '<span class="bar"></span>' + e(h.textContent);
      h.replaceWith(title);
    }
    container.append(section);
  });
  const overview = container.querySelector('.panel');
  if (overview) {
    const attendance = lesson.attendance;
    overview.insertAdjacentHTML(
      'afterbegin',
      '<div class="score-grid"><div class="score-card"><div class="label">到课情况</div><div class="value" style="font-size:17px">' +
        (Number.isFinite(attendance?.present)
          ? attendance.present + ' / ' + (attendance.expected ?? cls.members.length)
          : '未记录') +
        '</div></div><div class="score-card"><div class="label">随堂小测</div><div class="value" style="font-size:17px">' +
        (r.assessment ? '见下方测验记录' : '未记录') +
        '</div></div><div class="score-card"><div class="label">课时进度</div><div class="value" style="font-size:17px">' +
        e(lesson.label || '第 ' + String(lesson.number).padStart(2, '0') + ' 讲') +
        '</div></div></div>',
    );
    const title = overview.querySelector('.panel-title');
    if (title) overview.prepend(title);
  }
  const shadow = host.shadowRoot || host.attachShadow({ mode: 'open' }),
    style = document.createElement('style');
  style.textContent =
    sharedReportTheme +
    '\n' +
    reportTheme +
    '\n' +
    overrides +
    '\n.report-focus-item{padding:12px 0;border-bottom:1px solid var(--line)}.report-focus-item p{margin:5px 0}.report-footprint{display:grid;grid-template-columns:110px 1fr;gap:12px;padding:12px 0;border-bottom:1px solid var(--line)}.panel ul{padding-left:20px}.panel li{margin:8px 0}.hero h1{font-size:25px}.panel>p{margin:10px 0}';
  shadow.replaceChildren(style, container);
  host.textContent = '';
  host.dataset.loaded = 'true';
}
window.TeacherbuddyReading = { mount, mountRecord };

export const TeacherbuddyReading = window.TeacherbuddyReading;
