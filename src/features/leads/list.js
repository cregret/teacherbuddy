import { escapeHtml as esc } from '../../core/html.js';
import { Product } from '../../core/model.js';

function render(root, model) {
  const params = new URLSearchParams(location.search),
    items = model.leads.map((l) => ({
      ...l,
      status: l.status || '未联系',
      history: [...(l.contactHistory || [])].sort((a, b) => b.date.localeCompare(a.date)),
    }));
  const scopes = [
    ['active', '待跟进'],
    ['有意向', '明确意向'],
    ['未联系', '待首次联系'],
    ['已联系', '已沟通'],
    ['已入班', '已入班'],
    ['all', '全部'],
  ];
  let scope = scopes.some((s) => s[0] === params.get('status')) ? params.get('status') : 'active',
    expanded = params.get('id') || '';
  if (expanded && items.find((l) => l.id === expanded)?.status === '已入班') scope = '已入班';
  const inScope = (l, s) =>
    s === 'all' || (s === 'active' ? l.status !== '已入班' : l.status === s);
  const stage = (l) =>
    l.status === '有意向'
      ? '明确意向'
      : l.status === '已联系'
        ? '已沟通'
        : l.status === '未联系'
          ? '待首次联系'
          : l.status;
  const next = (l) =>
    l.nextStep ||
    (l.status === '已入班'
      ? '查看入班后的学习记录。'
      : l.status === '有意向'
        ? '确认合适班级、上课时间与试听安排。'
        : l.status === '已联系'
          ? '核对上次沟通中尚未解决的问题。'
          : '先了解年级、学习困难与方便的上课时间。');
  const a = (url, text) => '<a href="' + esc(url) + '">' + esc(text) + '</a>';
  root.classList.add('lead-list-page');
  root.innerHTML =
    '<nav class="ll-stages" aria-label="跟进阶段">' +
    scopes
      .map(
        ([key, title]) =>
          '<button type="button" data-scope="' +
          key +
          '">' +
          title +
          '<span>' +
          items.filter((l) => inScope(l, key)).length +
          '</span></button>',
      )
      .join('') +
    '</nav><section class="ll-surface"><div class="ll-toolbar"><label class="ll-search"><span>搜索</span><input id="leadSearch" type="search" aria-label="搜索潜客" placeholder="姓名、学习需求、沟通内容"></label><label>来源<select id="leadSource"><option value="">全部来源</option>' +
    [...new Set(items.map((l) => l.source).filter(Boolean))]
      .map((s) => '<option>' + esc(s) + '</option>')
      .join('') +
    '</select></label><label>排序<select id="leadSort"><option value="priority">跟进优先</option><option value="recent">最近沟通</option><option value="name">姓名</option></select></label><span id="leadCount" class="ll-count" role="status"></span></div><div class="ll-table-wrap"><table class="ll-table"><colgroup><col class="ll-col-person"><col class="ll-col-need"><col class="ll-col-stage"><col class="ll-col-contact"><col class="ll-col-next"><col class="ll-col-toggle"></colgroup><thead><tr><th scope="col">学生 / 来源</th><th scope="col">学习需求与意向</th><th scope="col">联系阶段</th><th scope="col">最近沟通</th><th scope="col">下一步建议</th><th scope="col"><span class="ll-visually-hidden">展开记录</span></th></tr></thead><tbody id="leadRows"></tbody></table></div><div id="leadEmpty" class="ll-empty" hidden><strong>没有匹配的线索</strong><p>试试其他姓名、来源或跟进阶段。</p><button type="button" id="leadReset">清除筛选</button></div></section>';
  const query = root.querySelector('#leadSearch'),
    source = root.querySelector('#leadSource'),
    sort = root.querySelector('#leadSort'),
    body = root.querySelector('#leadRows');
  query.value = params.get('name') || params.get('q') || '';
  function details(l) {
    const payments = (l.paymentIds || [])
      .map((id) => model.payments.find((p) => p.id === id))
      .filter(Boolean);
    return (
      '<tr class="ll-expanded"><td colspan="6"><div class="ll-record"><section><h3>沟通记录</h3>' +
      (l.history.length
        ? '<ol>' +
          l.history
            .map((h) => '<li><time>' + esc(h.date) + '</time><p>' + esc(h.text) + '</p></li>')
            .join('') +
          '</ol>'
        : '<p class="ll-muted">暂无沟通记录</p>') +
      '</section><section><h3>报名与学习记录</h3>' +
      (payments.length
        ? payments.map((p) => '<p>' + esc(p.package) + ' · ' + esc(p.status) + '</p>').join('') +
          '<div class="ll-links">' +
          a(Product.route('payment.html', { name: l.name }), '查看报名与缴费') +
          '</div>'
        : '<p class="ll-muted">暂无关联报名记录</p>') +
      (l.studentId
        ? '<div class="ll-links">' +
          a(Product.studentLink(l.studentId), '查看学生学习档案') +
          '</div>'
        : '') +
      '</section></div></td></tr>'
    );
  }
  function draw() {
    const q = query.value.trim().toLowerCase(),
      rank = { 有意向: 0, 未联系: 1, 已联系: 2, 已入班: 3 };
    const rows = items.filter(
      (l) =>
        inScope(l, scope) &&
        (!source.value || l.source === source.value) &&
        (!q ||
          [l.name, l.source, l.signal, next(l), ...l.history.map((h) => h.text)]
            .join(' ')
            .toLowerCase()
            .includes(q)),
    );
    rows.sort((a, b) =>
      sort.value === 'name'
        ? a.name.localeCompare(b.name, 'zh-CN')
        : sort.value === 'recent'
          ? (b.history[0]?.date || '').localeCompare(a.history[0]?.date || '')
          : (a.status === '未联系' && !a.history.length ? 3 : (rank[a.status] ?? 4)) -
              (b.status === '未联系' && !b.history.length ? 3 : (rank[b.status] ?? 4)) ||
            (b.history[0]?.date || '').localeCompare(a.history[0]?.date || ''),
    );
    root
      .querySelectorAll('[data-scope]')
      .forEach((b) => b.setAttribute('aria-pressed', String(scope === b.dataset.scope)));
    root.querySelector('#leadCount').textContent = rows.length + ' 人';
    root.querySelector('#leadEmpty').hidden = rows.length > 0;
    body.innerHTML = rows
      .map((l) => {
        const h = l.history[0],
          open = expanded === l.id;
        return (
          '<tr class="ll-row ' +
          (open ? 'is-open' : '') +
          '" data-lead="' +
          esc(l.id) +
          '"><td><button type="button" class="ll-name" data-expand="' +
          esc(l.id) +
          '" aria-expanded="' +
          open +
          '">' +
          esc(l.name) +
          '</button><small>' +
          esc(l.source || '来源未记录') +
          '</small></td><td><p>' +
          esc(l.signal || '待了解具体学习需求') +
          '</p></td><td><span class="ll-stage ' +
          (l.status === '有意向' ? 'intent' : l.status === '已入班' ? 'enrolled' : '') +
          '">' +
          esc(stage(l)) +
          '</span></td><td>' +
          (h
            ? '<time>' + esc(h.date) + '</time><p>' + esc(h.text) + '</p>'
            : '<span class="ll-muted">暂无沟通记录</span>') +
          '</td><td><p class="ll-next">' +
          esc(next(l)) +
          '</p></td><td><button type="button" class="ll-toggle" data-expand="' +
          esc(l.id) +
          '" aria-label="' +
          (open ? '收起' : '展开') +
          esc(l.name) +
          '的记录" aria-expanded="' +
          open +
          '">' +
          (open ? '−' : '＋') +
          '</button></td></tr>' +
          (open ? details(l) : '')
        );
      })
      .join('');
    body
      .querySelectorAll('[data-expand]')
      .forEach((b) => (b.onclick = () => toggle(b.dataset.expand)));
    body.querySelectorAll('.ll-row').forEach(
      (r) =>
        (r.onclick = (e) => {
          if (!e.target.closest('button,a')) toggle(r.dataset.lead);
        }),
    );
  }
  function toggle(id) {
    expanded = expanded === id ? '' : id;
    const url = new URL(location.href);
    if (expanded) url.searchParams.set('id', expanded);
    else url.searchParams.delete('id');
    history.replaceState(null, '', url);
    draw();
  }
  root.querySelectorAll('[data-scope]').forEach(
    (b) =>
      (b.onclick = () => {
        scope = b.dataset.scope;
        expanded = '';
        draw();
      }),
  );
  query.oninput = draw;
  source.onchange = draw;
  sort.onchange = draw;
  root.querySelector('#leadReset').onclick = () => {
    query.value = '';
    source.value = '';
    scope = 'active';
    draw();
  };
  draw();
}
window.TeacherBuddyLeads = { render };

export const TeacherBuddyLeads = window.TeacherBuddyLeads;
