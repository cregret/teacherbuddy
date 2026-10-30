import { escapeHtml as e } from '../../core/html.js';
import { Product } from '../../core/model.js';
import { AppStorage } from '../../core/storage.js';
import { LessonState } from '../teaching/lesson-state.js';
import '../../core/workspace.js';

const $ = (id) => document.getElementById(id);
const demo = new URLSearchParams(location.search).get('demo') !== '0';
const today = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'Asia/Shanghai',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
}).format(new Date());
const addDays = (value, n) => {
  const d = new Date(value + 'T12:00:00Z');
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
};
const shortDate = (value) => Number(value.slice(5, 7)) + ' 月 ' + Number(value.slice(8)) + ' 日';
let windowStart = today,
  selected = new URLSearchParams(location.search).get('date') || today,
  model,
  active,
  lessons,
  dynamics,
  reports = [];
if (selected < windowStart || selected > addDays(windowStart, 4)) windowStart = selected;
const lessonLabel = (l) => LessonState.label(l);
const rich = (parts) =>
  (parts || [])
    .map((p) => {
      const value = e(p.text);
      return p.tone === 'risk'
        ? '<mark class="ov-mark-risk">' + value + '</mark>'
        : p.tone === 'warn'
          ? '<mark class="ov-mark-warn">' + value + '</mark>'
          : p.tone === 'strong'
            ? '<strong>' + value + '</strong>'
            : value;
    })
    .join('');
function drawDynamics() {
  $('overviewDynamics').innerHTML =
    reports
      .slice(0, 3)
      .map(({ c, l, summary, reportDate }) => {
        const digest = l.report?.homeDigest,
          blocks = digest?.length ? digest : [{ label: '学习摘要', parts: [{ text: summary }] }];
        return (
          '<a class="ov-dynamic-link" aria-label="' +
          e(c.label + ' ' + lessonLabel(l) + '课节报告') +
          '" href="' +
          e(lessonLink(c, l)) +
          '"><article class="ov-dynamic"><div class="ov-dynamic-top"><div><strong>' +
          e(c.label) +
          '</strong><span class="ov-dynamic-lesson">' +
          e(lessonLabel(l)) +
          '</span></div><time>' +
          e(shortDate(reportDate)) +
          ' <span aria-hidden="true">↗</span></time></div><p class="ov-dynamic-topic">' +
          e(l.report?.title || '课堂学习记录') +
          '</p><div class="ov-digest-grid">' +
          blocks
            .map(
              (b) =>
                '<div class="ov-digest-block"><h3>' +
                e(b.label) +
                '</h3><p>' +
                rich(b.parts) +
                '</p></div>',
            )
            .join('') +
          '</div></article></a>'
        );
      })
      .join('') || '<div class="ov-empty">暂无学情记录</div>';
}

const lessonLink = (c, l) => Product.classLink(c.id, 'lessons') + '&lesson=' + l.number;
const anchor = (href, text) => '<a href="' + e(href) + '">' + text + '</a>';
const reportNumber = (c) => Number(c.brief?.label?.match(/第\s*(\d+)\s*讲/)?.[1]);
const completed = (l) => ['recorded', 'archived'].includes(l.status);
function schedule() {
  document.querySelector('.ov-schedule>header>a').href = Product.route('yilan.html', {
    date: selected,
    selected,
  });
  let list = lessons.filter((x) => x.l.date === selected);

  $('scheduleTitle').textContent = '最近课程';
  $('dayCount').textContent = list.length + ' 节';
  $('overviewSchedule').innerHTML = list.length
    ? list
        .map(({ c, l }) => {
          const previous = c.lessons
            .filter((p) => p.number < l.number)
            .sort((a, b) => b.number - a.number)[0];
          const target = completed(l) ? l : previous;
          const has = target && LessonState.hasReport(c, target);
          const review = has
            ? anchor(lessonLink(c, target), completed(l) ? '本节课报告 ↗' : '回顾本班上一讲 ↗')
            : '<span class="ov-muted">' +
              (completed(l) ? '报告待整理' : '暂无上节报告') +
              '</span>';
          return (
            '<div class="ov-course"><time>' +
            e(l.time || '时间待补充') +
            '</time><div class="ov-course-name">' +
            anchor(
              lessonLink(c, l),
              e(c.label) + ' <small>第 ' + String(l.number).padStart(2, '0') + ' 讲</small>',
            ) +
            '<span>' +
            e(
              l.location ||
                c.location ||
                c.venue ||
                (demo
                  ? {
                      'autumn-l8': '线上 · 腾讯会议 302 教室',
                      'autumn-l3': '线下 · A201 教室',
                      'autumn-l4': '线下 · A203 教室',
                    }[c.id] || '线上 · 腾讯会议 301 教室'
                  : '地点未填写'),
            ) +
            '</span></div><span class="ov-status ' +
            (completed(l) ? 'done' : '') +
            '">' +
            (completed(l) ? '已完成' : '未开始') +
            '</span><div class="ov-review">' +
            review +
            '</div></div>'
          );
        })
        .join('')
    : '<div class="ov-empty">今天没有排课</div>';
  if (!list.length && selected !== today)
    $('overviewSchedule').innerHTML = '<div class="ov-empty">当天没有排课</div>';
  $('overviewSchedule')
    .querySelectorAll('[data-missing]')
    .forEach(
      (b) =>
        (b.onclick = () => {
          $('reportDialog').querySelector('h2').textContent = '暂无上节简报';
          $('reportMessage').textContent = Number(b.dataset.number)
            ? b.dataset.missing +
              '第 ' +
              b.dataset.number +
              ' 讲尚未生成简报，请使用 AI 工具 上传该课节录课或录音，生成学情报告。'
            : '这节课没有上一节课的简报。需要课程简报时，请使用 AI 工具 上传课节录课或录音，生成学情报告。';
          $('reportDialog').showModal();
        }),
    );
}
function syncDate() {
  const u = new URL(location.href);
  u.searchParams.set('date', selected);
  history.replaceState(null, '', u);
  $('overviewDate').value = selected;
}
function render() {
  $('dashboard').innerHTML =
    '<section class="ov-panel ov-schedule"><header><div class="ov-section-title"><h2 id="scheduleTitle">最近课程</h2><span id="dayCount" class="ov-count"></span></div><div class="ov-date"><button id="prevDay" aria-label="前一天">‹</button><input id="overviewDate" type="date" aria-label="课表日期" value="' +
    selected +
    '"><button id="nextDay" aria-label="后一天">›</button><button id="todayButton">今天</button></div>' +
    anchor(Product.route('yilan.html', { date: selected, selected }), '完整课表 ↗') +
    '</header><div id="overviewSchedule"></div></section><div class="ov-layout"><section class="ov-dynamics"><header><div class="ov-section-title"><h2>学情动态</h2><span class="ov-caption">最近 3 节课</span></div><div class="ov-highlight-key"><span class="risk">重点关注</span><span class="warn">下节改进</span></div></header><div id="overviewDynamics"></div></section><section class="ov-panel ov-focus"><header><div class="ov-section-title"><h2>重点学生</h2></div>' +
    anchor(Product.route('xue.html', { filter: 'attention' }), '全部学生 ↗') +
    '</header><div id="overviewFocus"></div></section></div>';
  schedule();
  drawDynamics();
  const categories = [
    ['待补测', (s) => s.alerts.some((a) => /随堂测|补测/.test(a))],
    ['待补交作业', (s) => s.alerts.some((a) => /作业/.test(a))],
    ['成绩下滑', (s) => s.alerts.some((a) => /下滑|下降/.test(a))],
    ['学习状态', (s) => s.alerts.some((a) => /状态|专注|情绪/.test(a))],
    ['信息不全', (s) => s.alerts.some((a) => /资料/.test(a))],
  ];
  const demoCases = {};
  for (const f of model.focusRecords || []) {
    const name = model.students.find((s) => s.id === f.studentId)?.name;
    if (!name) continue;
    (demoCases[f.category] ??= []).push({
      id: f.id,
      studentId: f.studentId,
      classId: f.classId,
      name,
      className: model.classes.find((c) => c.id === f.classId)?.label || '',
      detail: f.detail,
    });
  }
  const focusKey = (label, name) =>
    model.focusRecords?.find((f) => f.category === label && f.studentId === 'student-' + name)
      ?.id || label + '|' + name;
  const processedKey = 'teacherbuddy.home.processed-focus.v1';
  const readProcessed = () => {
    try {
      return new Set(JSON.parse(AppStorage.getItem(processedKey) || '[]'));
    } catch {
      return new Set();
    }
  };
  const processed = readProcessed();
  const focusRow = (name, studentId, className, detail, label, eventId, classId) => {
    const key = eventId || focusKey(label, name);
    return (
      '<article class="ov-student ov-focus-row-wrap"><a class="ov-focus-row" href="' +
      e(
        Product.route('student-detail.html', {
          id: studentId,
          tab: 'focus',
          ...(classId ? { class: classId } : {}),
        }),
      ) +
      '"><span class="ov-focus-person"><strong>' +
      e(name) +
      '</strong><small>' +
      e(className || '班级未记录') +
      '</small></span><p>' +
      e(detail) +
      '</p></a><button class="ov-process" type="button" data-process-key="' +
      e(key) +
      '" data-student="' +
      e(name) +
      '">标记已处理</button></article>'
    );
  };
  $('overviewFocus').innerHTML = categories
    .map(([label, match]) => {
      const profile = label === '信息不全';
      if (demoCases[label]) {
        const rows = demoCases[label].filter(
          (x) => !processed.has(x.id || focusKey(label, x.name)),
        );
        return (
          '<section class="ov-focus-group ' +
          (!rows.length ? 'is-empty' : '') +
          '" data-category="' +
          e(label) +
          '"><div class="ov-category"><h3>' +
          label +
          '</h3><span>' +
          rows.length +
          ' 人</span></div>' +
          (rows.length
            ? rows
                .map((x) =>
                  focusRow(x.name, x.studentId, x.className, x.detail, label, x.id, x.classId),
                )
                .join('')
            : '<span class="ov-muted">当前无待处理记录</span>') +
          '</section>'
        );
      }
      const all = model.students.filter(match),
        students = profile ? all : all.filter((s) => !processed.has(focusKey(label, s.name)));
      return (
        '<section class="ov-focus-group ' +
        (!students.length ? 'is-empty' : '') +
        '" data-category="' +
        e(label) +
        '"><div class="ov-category"><h3>' +
        label +
        '</h3><span>' +
        (profile ? all.length : students.length) +
        ' 人</span></div>' +
        (!students.length
          ? '<span class="ov-muted">当前无待处理记录</span>'
          : profile
            ? '<details><summary>' +
              students.length +
              ' 位学生 · 缺少性别、城市或学校信息</summary>' +
              students
                .map((s) => {
                  const t = model.tasks.find((t) => t.id === 'profile-' + s.name);
                  return (
                    '<p>' +
                    anchor(Product.studentLink(s.id), e(s.name)) +
                    '<small>' +
                    e(
                      (t?.evidence || '资料待补齐')
                        .replace('，原记录待补：', ' · ')
                        .replace('。', ''),
                    ) +
                    '</small></p>'
                  );
                })
                .join('') +
              '</details>'
            : students
                .map((s) => {
                  const t = model.tasks.find(
                    (t) =>
                      t.studentId === s.id && t.category === '学情' && !t.id.startsWith('profile-'),
                  );
                  const cls = active.find((c) =>
                    c.members.some((m) => m.studentId === s.id || m.name === s.name),
                  );
                  return focusRow(
                    s.name,
                    s.id,
                    cls?.label || s.sourceClass || '',
                    t?.evidence || s.alerts.join('、'),
                    label,
                    undefined,
                    cls?.id,
                  );
                })
                .join('')) +
        '</section>'
      );
    })
    .join('');
  $('overviewFocus')
    .querySelectorAll('[data-process-key]')
    .forEach(
      (button) =>
        (button.onclick = () => {
          const dialog = $('focusDialog');
          dialog.dataset.pendingKey = button.dataset.processKey;
          dialog.querySelector('[data-focus-name]').textContent = button.dataset.student;
          dialog.showModal();
        }),
    );
  $('focusDialog').querySelector('[data-focus-cancel]').onclick = () => $('focusDialog').close();
  $('focusDialog').querySelector('[data-focus-confirm]').onclick = async () => {
    const dialog = $('focusDialog'),
      set = readProcessed();
    set.add(dialog.dataset.pendingKey);
    try {
      AppStorage.setItem(processedKey, JSON.stringify([...set]));
      await AppStorage.flush();
      dialog.close();
      render();
    } catch {
      dialog.querySelector('[data-focus-error]').textContent =
        '暂时无法保存处理状态，请检查服务器连接。';
    }
  };
  const change = (value) => {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value) || Number.isNaN(Date.parse(value))) return;
    selected = value;
    if (value < windowStart || value > addDays(windowStart, 4)) windowStart = value;
    syncDate();
    schedule();
  };
  $('overviewDate').onchange = (ev) => change(ev.target.value);
  $('todayButton').onclick = () => change(today);
  const shift = (n) => change(addDays(selected, n));
  $('prevDay').onclick = () => shift(-1);
  $('nextDay').onclick = () => shift(1);
}
const dialog = document.createElement('dialog');
dialog.id = 'reportDialog';
dialog.innerHTML =
  '<h2>暂无上节简报</h2><p id="reportMessage"></p><form method="dialog"><button>知道了</button></form>';
document.body.append(dialog);
const focusDialog = document.createElement('dialog');
focusDialog.id = 'focusDialog';
focusDialog.innerHTML =
  '<h2>确认已处理？</h2><p><strong data-focus-name></strong>的这条重点记录会从首页待处理列表中移除。</p><p class="focus-dialog-error" data-focus-error role="status"></p><div class="focus-dialog-actions"><button type="button" data-focus-cancel>取消</button><button type="button" data-focus-confirm>确认已处理</button></div>';
document.body.append(focusDialog);
async function load() {
  $('refresh').disabled = true;
  try {
    model = await Product.load(true);
    const doc = new DOMParser().parseFromString(model.homeDynamicsHTML || '', 'text/html');
    dynamics = [...doc.querySelectorAll('.dyn')].map((n) => ({
      title: n.querySelector('.dyn-title')?.textContent || '',
      text: n.querySelector('.dyn-desc')?.textContent || '',
    }));
    active = model.classes.filter((c) => c.status === 'active');
    lessons = active
      .flatMap((c) => c.lessons.map((l) => ({ c, l })))
      .sort((a, b) => a.l.time.localeCompare(b.l.time));
    reports = (
      await Promise.all(
        active
          .filter((c) => c.brief?.href)
          .map(async (c) => {
            try {
              const r = await fetch(c.brief.href);
              if (!r.ok) return null;
              const d = new DOMParser().parseFromString(await r.text(), 'text/html'),
                n = reportNumber(c),
                l = c.lessons.find((l) => l.number === n);
              if (!l || !LessonState.ended(l)) return null;
              const raw =
                d.querySelector('.hero .quote')?.textContent?.replace(/^[\s"“]+|[\s"”]+$/g, '') ||
                '';
              const matching = dynamics.find(
                (x) => x.title.includes(c.grade) && Number(x.title.match(/第\s*(\d+)/)?.[1]) === n,
              );
              const summary = matching?.text || raw.split('；').slice(0, 2).join('；');
              const dt = d
                .querySelector('.hero .sub')
                ?.textContent?.match(/(\d{4})年(\d{1,2})月(\d{1,2})日/);
              return {
                c,
                l,
                summary: summary.length > 180 ? summary.slice(0, 177) + '…' : summary,
                reportDate: dt
                  ? dt[1] + '-' + dt[2].padStart(2, '0') + '-' + dt[3].padStart(2, '0')
                  : l.date,
              };
            } catch {
              return null;
            }
          }),
      )
    )
      .filter((x) => x?.summary)
      .sort((a, b) => b.reportDate.localeCompare(a.reportDate));
    reports = [
      ...active.flatMap((c) =>
        c.lessons
          .filter((l) => l.report)
          .map((l) => ({ c, l, summary: l.report.summary, reportDate: l.date })),
      ),
      ...reports,
    ].sort((a, b) => b.reportDate.localeCompare(a.reportDate));
    render();
    $('dashboard').hidden = false;
    $('loadState').hidden = true;
  } catch (err) {
    $('loadState').hidden = false;
    $('loadState').textContent = '加载失败：' + err.message;
  } finally {
    $('refresh').disabled = false;
  }
}
$('refresh').addEventListener('click', load);
load();
