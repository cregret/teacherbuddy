import { escapeHtml as esc } from './html.js';
import { Product } from './model.js';
import { BuddyUI } from './shell.js';
export function createContext(model) {
  const page = document.body.dataset.page;
  const params = new URLSearchParams(location.search);
  const root = document.getElementById('channel');

  const route = Product.route;
  const cl = Product.classLink;
  const sl = Product.studentLink;
  const link = (href, text, cls = '') => `<a href="${esc(href)}" class="${cls}">${esc(text)}</a>`;
  const badge = (text, tone = '') => `<span class="badge ${tone}">${esc(text)}</span>`;
  const tabs = (items, current) =>
    '<nav class="section-tabs" aria-label="页面分区">' +
    items
      .map(
        ([id, title, href]) =>
          `<a href="${esc(href)}" ${id === current ? 'class="active" aria-current="page"' : ''}>${esc(title)}</a>`,
      )
      .join('') +
    '</nav>';
  const tip = (text, label) => BuddyUI.tip(text, label);
  const heading = (title, desc, extra = '') =>
    ['班课', '学生', '收款与课时', '营销招生', '潜在客池', 'Skills 指令'].includes(title)
      ? extra
      : `<div class="channel-heading"><h1>${esc(title)}</h1>${extra}</div>`;
  const plainTable = (heads, rows) =>
    '<div class="table-scroll"><table class="record-table"><thead><tr>' +
    heads.map((h) => '<th>' + esc(h) + '</th>').join('') +
    '</tr></thead><tbody>' +
    rows +
    '</tbody></table></div>';
  const search = (
    placeholder = '搜索姓名、班级或关键词',
    value = params.get('name') || params.get('q') || '',
  ) =>
    `<label class="grow">搜索<input id="filterSearch" type="search" placeholder="${placeholder}" value="${esc(value)}"></label>`;
  const select = (id, label, options, value) =>
    `<label>${label}<select id="${id}">${options.map(([v, t]) => `<option value="${esc(v)}" ${v === value ? 'selected' : ''}>${esc(t)}</option>`).join('')}</select></label>`;
  const row = (cells, searchText = '', attrs = '') =>
    `<tr data-record data-search="${esc(searchText)}" ${attrs}>${cells.map((c) => '<td>' + c + '</td>').join('')}</tr>`;
  function period(id) {
    return model.periods.find((p) => p.id === id) || model.periods[0];
  }
  function classNames(ids) {
    return ids.map((id) => model.classes.find((c) => c.id === id)).filter(Boolean);
  }
  function studentName(member) {
    return member.studentId
      ? link(sl(member.studentId), member.name, 'record-title')
      : esc(member.name) + badge('档案待匹配', 'check');
  }
  function missing(title, href, text) {
    root.innerHTML = heading(title, '请从列表中选择一个有效记录。') + link(href, text, 'button');
  }
  function toast(text) {
    const el = document.getElementById('statusToast');
    el.textContent = text;
    el.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => (el.hidden = true), 3200);
  }
  function sharePreview(title, text) {
    let dialog = document.getElementById('sharePreview');
    if (!dialog) {
      dialog = document.createElement('dialog');
      dialog.id = 'sharePreview';
      dialog.setAttribute('aria-labelledby', 'shareHeading');
      document.body.append(dialog);
    }
    dialog.innerHTML =
      '<div class="dialog-head"><div><h2 id="shareHeading">' +
      esc(title) +
      '</h2></div><button class="close" aria-label="关闭分享预览">×</button></div><div class="dialog-body"><label for="shareText">分享正文</label><textarea id="shareText" spellcheck="false"></textarea>' +
      tip('复制或下载不会自动发送。关闭此预览后，未导出的修改不保留。', '分享说明') +
      '<div class="action-bar"><button class="button primary" id="copyShare">复制正文</button><button class="button" id="downloadShare">下载文字</button><span id="shareResult" role="status"></span></div></div>';
    dialog.querySelector('textarea').value = text;
    dialog.querySelector('.close').onclick = () => dialog.close();
    dialog.querySelector('#copyShare').onclick = async () => {
      try {
        await navigator.clipboard.writeText(dialog.querySelector('textarea').value);
        dialog.querySelector('#shareResult').textContent = '已复制，可粘贴给家长';
      } catch {
        dialog.querySelector('textarea').select();
        dialog.querySelector('#shareResult').textContent = '请按 Ctrl+C 复制已选正文';
      }
    };
    dialog.querySelector('#downloadShare').onclick = () => {
      const url = URL.createObjectURL(
        new Blob([dialog.querySelector('textarea').value], { type: 'text/plain;charset=utf-8' }),
      );
      const a = document.createElement('a');
      a.href = url;
      a.download = title + '.txt';
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      dialog.querySelector('#shareResult').textContent = '已下载文字文件';
    };
    dialog.showModal();
  }
  let toastTimer;
  return {
    model,
    page,
    params,
    root,
    esc,
    route,
    cl,
    sl,
    link,
    badge,
    tabs,
    tip,
    heading,
    plainTable,
    search,
    select,
    row,
    period,
    classNames,
    studentName,
    missing,
    toast,
    sharePreview,
  };
}
