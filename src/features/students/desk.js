import { escapeHtml as esc } from '../../core/html.js';
import { Product } from '../../core/model.js';

import { renderStudentDetail } from './detail.js';
import { studentEvents } from './records.js';

const table = (heads, rows) =>
  '<div class="sd-scroll"><table class="sd-table"><thead><tr>' +
  heads.map((h) => '<th scope="col">' + h + '</th>').join('') +
  '</tr></thead><tbody>' +
  rows.join('') +
  '</tbody></table></div>';
const empty = (text) => '<p class="sd-empty">' + text + '</p>';
async function render(root, model) {
  document.body.classList.add('student-desk');
  const params = new URLSearchParams(location.search);
  let query = params.get('name') || params.get('q') || '',
    classFilter = params.get('class') || '',
    period = params.get('period') || 'all',
    filter = params.get('filter') === 'attention' ? 'attention' : 'all',
    selected = params.get('id') || null,
    scope = '';
  const classesFor = (s) => model.classes.filter((c) => s.classIds.includes(c.id));
  function record(s, c) {
    return (
      model.classLearning?.[c?.id]?.[s.name] ||
      (model.receivedLearning?.[s.name]?.classId === c?.id ? model.receivedLearning[s.name] : null)
    );
  }
  function context(s) {
    const cs = classesFor(s).filter((c) => period === 'all' || c.periodId === period);
    return cs.find((c) => c.id === classFilter) || cs.find((c) => c.status === 'active') || cs[0];
  }
  const events = (s, classId) => studentEvents(model, s.id, classId);
  function visible() {
    return model.students
      .filter((s) => {
        const c = context(s),
          ev = events(s),
          pending = ev.filter((f) => f.status !== 'resolved').length;
        return (
          (!query ||
            (
              s.name +
              ' ' +
              classesFor(s)
                .map((c) => c.label)
                .join(' ')
            ).includes(query)) &&
          (period === 'all' || classesFor(s).some((c) => c.periodId === period)) &&
          (!classFilter || s.classIds.includes(classFilter)) &&
          (filter === 'all' ||
            (filter === 'attention' && pending > 0) ||
            (filter === 'unmatched' && !s.classIds.length) ||
            (filter === 'no-record' && !record(s, c)?.lessons?.length))
        );
      })
      .sort(
        (a, b) =>
          events(b).filter((f) => f.status !== 'resolved').length -
            events(a).filter((f) => f.status !== 'resolved').length ||
          Number(!!record(b, context(b))) - Number(!!record(a, context(a))) ||
          a.name.localeCompare(b.name, 'zh-CN'),
      );
  }
  root.innerHTML =
    '<div class="sd-summary" id="sdSummary"></div><nav class="sd-filters-tabs" aria-label="学生视图"><button data-view="all">全部学生</button><button data-view="attention">待跟进</button><button data-view="no-record">学习记录待补</button><button data-view="unmatched">班级待关联</button></nav><section class="sd-directory"><div class="sd-tools"><label class="sd-search">查找学生<input id="sdSearch" type="search" placeholder="姓名或班级" value="' +
    esc(query) +
    '"></label><label>分组<select id="sdPeriod"><option value="all">全部分组</option>' +
    model.periods
      .map((p) => '<option value="' + esc(p.id) + '">' + esc(p.name) + '</option>')
      .join('') +
    '</select></label><label>班级<select id="sdClass"><option value="">全部班级</option>' +
    model.classes
      .map(
        (c) =>
          '<option value="' +
          esc(c.id) +
          '">' +
          esc(model.periods.find((p) => p.id === c.periodId)?.name + ' · ' + c.label) +
          '</option>',
      )
      .join('') +
    '</select></label><span id="sdCount" role="status"></span></div><div id="sdRoster"></div></section><section id="sdDetail" class="sd-detail" hidden aria-label="学生学习档案"></section><p class="sd-foot">关注次数按独立事件记录统计；未记录不等于未发生。班级授课进度、学生个人到课和课包扣费分别记录。</p>';
  const list = root.querySelector('#sdRoster'),
    detail = root.querySelector('#sdDetail');
  function draw() {
    const students = visible(),
      pending = students.reduce(
        (n, s) => n + events(s).filter((f) => f.status !== 'resolved').length,
        0,
      ),
      needing = students.filter((s) => events(s).some((f) => f.status !== 'resolved')).length;
    root.querySelector('#sdSummary').innerHTML = [
      ['当前学生', students.length + ' 人', '筛选范围内'],
      ['待跟进学生', needing + ' 人', '有未处理的具体事项'],
      ['待处理事项', pending + ' 条', '按事件去重统计'],
      [
        '有学习记录',
        students.filter((s) => record(s, context(s))?.lessons?.length).length + ' 人',
        '按当前班级档案',
      ],
    ]
      .map(([a, b, c]) => '<article><span>' + a + '</span><strong>' + b + '</strong></article>')
      .join('');
    root.querySelectorAll('[data-view]').forEach((b) => {
      b.classList.toggle('active', b.dataset.view === filter);
      b.setAttribute('aria-pressed', String(b.dataset.view === filter));
    });
    root.querySelector('#sdCount').textContent = students.length + ' 位学生 · 点击姓名查看档案';
    list.innerHTML = students.length
      ? table(
          [
            '学生 / 当前班级',
            '个人学习记录',
            '到课 / 最近测验',
            '待跟进 / 累计关注',
            '最近学习情况',
            '操作',
          ],
          students.map((s) => {
            const c = context(s),
              d = record(s, c),
              ev = events(s),
              open = ev.filter((f) => f.status !== 'resolved').length,
              number = d?.lessons?.[0]?.[0] || '暂无逐课记录';
            return (
              '<tr class="' +
              (selected === s.id ? 'sd-selected' : '') +
              '"><td><button class="sd-person" data-student-id="' +
              esc(s.id) +
              '">' +
              esc(s.name) +
              '</button><small>' +
              esc(c?.label || '班级待关联') +
              '</small></td><td>' +
              esc(number) +
              '<small>' +
              (d?.lessons?.length || 0) +
              ' 条逐课记录</small></td><td>' +
              esc(d?.metrics?.['到课'] || '到课未记录') +
              '<small>最近测验 ' +
              esc(d?.metrics?.['随堂测验'] || '未记录') +
              '</small></td><td><span class="' +
              (open ? 'sd-attention' : '') +
              '">' +
              open +
              ' 条待跟进</span><small>累计 ' +
              ev.length +
              ' 次关注</small></td><td class="sd-learning-copy">' +
              esc(d?.state || '学习状态待补') +
              '<small>' +
              esc(d?.latest || '尚无当前班级学习摘要') +
              '</small></td><td><button class="sd-open" data-student-id="' +
              esc(s.id) +
              '">查看档案 →</button></td></tr>'
            );
          }),
        )
      : empty('没有匹配的学生，试试调整筛选条件。');
  }
  function openStudent(id) {
    selected = id;
    scope = context(model.students.find((s) => s.id === id))?.id || '';
    const url = new URL(location.href);
    url.searchParams.set('id', id);
    url.searchParams.set('tab', 'overview');
    history.replaceState(null, '', url);
    draw();
    drawDetail();
    root.scrollTo({ top: 0, behavior: 'smooth' });
  }
  function drawDetail() {
    const student = model.students.find((s) => s.id === selected);
    if (!student) {
      detail.hidden = true;
      root.classList.remove('sd-show-profile');
      return;
    }
    root.classList.add('sd-show-profile');
    detail.hidden = false;
    renderStudentDetail(detail, model, {
      studentId: student.id,
      classId: scope,
      onChange: draw,
      onBack: () => {
        detail.hidden = true;
        root.classList.remove('sd-show-profile');
        selected = null;
        const url = new URL(location.href);
        url.searchParams.delete('id');
        url.searchParams.delete('tab');
        classFilter ? url.searchParams.set('class', classFilter) : url.searchParams.delete('class');
        history.replaceState(null, '', url);
        draw();
        root.scrollTo({ top: 0 });
      },
    });
  }
  root.querySelector('#sdPeriod').value = period;
  root.querySelector('#sdClass').value = classFilter;
  root.querySelector('#sdSearch').oninput = (e) => {
    query = e.target.value.trim();
    draw();
  };
  root.querySelector('#sdPeriod').onchange = (e) => {
    period = e.target.value;
    draw();
  };
  root.querySelector('#sdClass').onchange = (e) => {
    classFilter = e.target.value;
    draw();
  };
  root.querySelectorAll('[data-view]').forEach(
    (b) =>
      (b.onclick = () => {
        filter = b.dataset.view;
        draw();
      }),
  );
  list.onclick = (e) => {
    const b = e.target.closest('[data-student-id]');
    if (b) openStudent(b.dataset.studentId);
  };
  draw();
  if (selected) {
    const s = model.students.find((s) => s.id === selected);
    if (s) {
      scope = context(s)?.id || '';
      drawDetail();
    }
  }
}
window.StudentDesk = { render };

export const StudentDesk = window.StudentDesk;
