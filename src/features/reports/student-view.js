import { escapeHtml as e } from '../../core/html.js';
import { DataReady } from '../../core/storage.js';

let stylePromise;
const panel = (title, en, body) =>
  '<section class="panel"><h2 class="panel-title"><span class="bar"></span>' +
  title +
  '<span class="en">' +
  en +
  '</span></h2>' +
  body +
  '</section>';
const table = (heads, rows) =>
  '<div class="report-table"><table><thead><tr>' +
  heads.map((h) => '<th>' + e(h) + '</th>').join('') +
  '</tr></thead><tbody>' +
  rows.map((r) => '<tr>' + r.map((v) => '<td>' + e(v) + '</td>').join('') + '</tr>').join('') +
  '</tbody></table></div>';
async function mount(host, d, student, context) {
  if (!d) {
    host.textContent = '暂无对应班级的学情记录';
    return;
  }
  const css = await (stylePromise ||
    (stylePromise = fetch('/assets/css/student-report.css').then((r) => {
      if (!r.ok) throw Error('简报样式读取失败');
      return r.text();
    })));
  if (!host.isConnected) return;
  const rows = d.lessons || [],
    knowledge = d.knowledge || [],
    homework = d.homework || [],
    sections = d.sections || {};
  const feedback =
    student.name +
    '家长您好：\n\n' +
    context +
    '\n\n' +
    d.latest +
    '\n\n【作业与订正】\n' +
    (sections['作业记录'] || '') +
    '\n\n【学习建议】\n' +
    (sections['行动方案'] || '');
  const moments = rows
    .filter((r) => /主动|独立|解释|完整|清晰|稳定|掌握|进步/.test(r[4]))
    .slice(0, 3);
  const body =
    '<div class="wrap"><header class="hero"><div class="hero-tag">' +
    e(context) +
    '</div><h1>' +
    e(student.name) +
    '</h1><div class="hero-meta">' +
    e(d.metrics?.['到课'] || rows.length + ' 节记录') +
    ' · 最近记录 ' +
    e(d.updatedAt || rows[0]?.[1] || '') +
    '</div><div class="hero-badges"><span class="hb g">' +
    e(d.state || '学习记录') +
    '</span><span class="hb gd">' +
    e(d.archived ? '本期已结课' : '持续学习中') +
    '</span></div><div class="hero-quote"><b>最近一课：</b>' +
    e(d.latest) +
    '</div><div class="hero-judge"><b>教师判断：</b>' +
    e(d.judgement || d.strength) +
    '</div></header>' +
    '<section class="kpis">' +
    [
      ['到课记录', d.metrics?.['到课'], '本班已记录课节'],
      ['最近测验', d.metrics?.['随堂测验'], '最近一次有成绩的测验'],
      ['作业状态', homework[0]?.status, '最近一课'],
      ['知识地图', knowledge.length + ' 项', '已记录知识点'],
    ]
      .map(
        ([label, value, sub]) =>
          '<div class="kpi"><div class="l">' +
          e(label) +
          '</div><div class="v">' +
          e(value || '未记录') +
          '</div><div class="s">' +
          e(sub) +
          '</div></div>',
      )
      .join('') +
    '</section>' +
    panel(
      '学过什么（知识地图）',
      'MAP',
      table(
        ['知识点', '掌握情况', '学习证据 / 巩固方向'],
        knowledge.map((k) => [k.topic, k.status, k.note]),
      ),
    ) +
    panel(
      '课堂高光时刻',
      'MOMENTS',
      '<div class="tl">' +
        (moments.length
          ? moments
              .map(
                (r) =>
                  '<div class="tl-item"><span class="tl-dot green"></span><div class="tl-date">' +
                  e(r[1]) +
                  ' · ' +
                  e(r[0]) +
                  '</div><div class="tl-text">' +
                  e(r[4]) +
                  '</div></div>',
              )
              .join('')
          : '<p>' + e(d.strength) + '</p>') +
        '</div>',
    ) +
    panel(
      '错题本 · 知识点聚合',
      'MISTAKES',
      '<div class="tags">' +
        knowledge
          .filter((k) => /巩固|薄弱|待/.test(k.status))
          .map((k) => '<span class="tag">' + e(k.topic) + '</span>')
          .join('') +
        '</div><p>' +
        e(sections['错题本'] || d.focus) +
        '</p>',
    ) +
    panel(
      '学习表现',
      'PROFILE',
      '<div class="dims"><div class="dim"><h3 class="dim-name">表现好的地方</h3><p class="dim-ev">' +
        e(d.strength) +
        '</p></div><div class="dim"><h3 class="dim-name">需要关注的问题</h3><p class="dim-ev">' +
        e(d.focus) +
        '</p></div></div>',
    ) +
    panel(
      '怎么学（行动方案）',
      'ACTION',
      '<div class="act"><h4>' +
        e(d.archived ? '后续学习安排' : '下一阶段学习安排') +
        '</h4><p style="white-space:pre-line">' +
        e(sections['行动方案']) +
        '</p></div>',
    ) +
    panel(
      '作业与订正',
      'HOMEWORK',
      '<p>' +
        e(sections['作业记录']) +
        '</p>' +
        table(
          ['课节 / 日期', '完成情况', '订正与反馈'],
          homework.slice(0, 5).map((h) => [h.lesson + ' · ' + h.date, h.status, h.text]),
        ),
    ) +
    panel(
      '效果证据',
      'EVIDENCE',
      '<p class="chart-note">测验均分 ' +
        e(d.metrics?.['测验均分'] || '未记录') +
        '</p>' +
        table(['课节', '日期', '出勤', '测验', '课堂表现'], rows),
    ) +
    panel(
      '家长版 · 一键复制',
      'FOR PARENTS',
      '<button type="button" class="copy-btn" id="copyFeedback">复制学习反馈</button><span class="report-copy-state" role="status"></span><textarea class="parent-text" aria-label="家长学习反馈">' +
        e(feedback) +
        '</textarea>',
    ) +
    '</div>';
  const shadow = host.shadowRoot || host.attachShadow({ mode: 'open' });
  shadow.innerHTML = '<style>' + css + '</style>' + body;
  shadow.querySelector('#copyFeedback').onclick = async () => {
    const area = shadow.querySelector('textarea'),
      state = shadow.querySelector('.report-copy-state');
    try {
      await navigator.clipboard.writeText(area.value);
      state.textContent = '已复制';
    } catch {
      area.focus();
      area.select();
      state.textContent = '请按 Ctrl+C 复制正文';
    }
  };
  host.dataset.loaded = 'true';
}
window.StudentReportView = { mount };
if (document.body.dataset.page === 'student-report') {
  const params = new URLSearchParams(location.search),
    host = document.querySelector('#studentReport');
  Promise.resolve(DataReady)
    .then(() => fetch('/api/workspace', { cache: 'no-store' }))
    .then((r) => r.json())
    .then(async (data) => {
      const records = data.classLearning?.[params.get('class')],
        d = Object.values(records || {}).find((s) => s.studentId === params.get('id'));
      if (!d) throw Error('未找到对应学生的班级简报');
      document.title = d.name + ' · 学情简报';
      await mount(host, d, { name: d.name }, d.period + ' · ' + d.className);
    })
    .catch((error) => {
      host.textContent = error.message;
    });
}

export const StudentReportView = window.StudentReportView;
