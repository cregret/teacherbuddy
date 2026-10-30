import { escapeHtml as esc } from './html.js';
import { Product } from './model.js';
import { AppStorage } from './storage.js';
import '../features/teaching/lesson-state.js';
import '../components/material.js';
function initializeNavigation() {
  const page = document.body.dataset.page || 'home';
  const active = ['class', 'courses'].includes(page)
    ? 'courses'
    : page === 'student'
      ? 'students'
      : page;
  const nav = [
    ['home', '首页', 'index.html'],
    ['schedule', '日程', 'yilan.html'],
    ['courses', '班课', 'courses.html'],
    ['students', '学生', 'xue.html'],
    ['payments', '缴费课消', 'payment.html'],
    null,
    ['marketing', '营销招生', 'marketing.html'],
    ['leads', '潜在客池', 'qianke.html'],
    ['skills', 'Skills 指令', 'zhiling.html'],
  ];
  const route = (file, params = {}) =>
    file + '?' + new URLSearchParams({ v: 'recorddesk4', ...params });
  const sidebar = document.querySelector('.sidebar');
  const icons = {
    home: '<path d="m3 10 9-7 9 7v10a1 1 0 0 1-1 1h-6v-6h-4v6H4a1 1 0 0 1-1-1z"/>',
    schedule: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
    courses: '<rect x="4" y="4" width="16" height="16" rx="2"/><path d="M8 8h8M8 12h8M8 16h5"/>',
    students:
      '<circle cx="9" cy="8" r="3"/><path d="M3.5 19v-1.5a5.5 5.5 0 0 1 11 0V19zM16 5.5a3 3 0 0 1 0 5.8M17 14a4.5 4.5 0 0 1 3.5 4.4V19h-3"/>',
    payments: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 10h18M7 15h4"/>',
    marketing: '<path d="M4 14V9a2 2 0 0 1 2-2h3l9-4v17l-9-4H6a2 2 0 0 1-2-2zM9 16l2 5h4l-3-6"/>',
    leads: '<circle cx="10" cy="10" r="6"/><path d="m14.5 14.5 5 5M10 7v6M7 10h6"/>',
    skills:
      '<path d="M12 3 14 9l6 3-6 2-2 7-2-7-6-2 6-3z"/><path d="m19 2 .7 2.3L22 5l-2.3.7L19 8l-.7-2.3L16 5l2.3-.7z"/>',
  };
  if (sidebar)
    sidebar.innerHTML =
      '<a class="logo" href="' +
      route('index.html') +
      '">teacherbuddy</a><nav aria-label="主导航">' +
      nav
        .map((n) =>
          n
            ? '<a class="nav-link ' +
              (active === n[0] ? 'active' : '') +
              '" href="' +
              route(n[2]) +
              '"' +
              (active === n[0] ? ' aria-current="page"' : '') +
              '><svg class="nav-icon" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">' +
              icons[n[0]] +
              '</svg><span>' +
              n[1] +
              '</span></a>'
            : '<hr>',
        )
        .join('') +
      '</nav><nav class="sidebar-bottom" aria-label="使用帮助"><a class="nav-link ' +
      (page === 'getting-started' ? 'active' : '') +
      '" href="' +
      route('getting-started.html') +
      '"' +
      (page === 'getting-started' ? ' aria-current="page"' : '') +
      ' title="开始使用"><svg class="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M9 9a3 3 0 0 1 6 0c0 2-3 2-3 5M12 17h.01"/></svg><span>开始使用</span></a></nav>';
}
initializeNavigation();

function initializeShell() {
  const paths = {
    more: 'M5 12h.01M12 12h.01M19 12h.01',
    menu: 'M4 6h16M4 12h16M4 18h16',
    search: 'M21 21l-5-5M18 10a8 8 0 1 1-16 0 8 8 0 0 1 16 0',
    grid: 'M3 3h7v7H3zM14 3h7v7h-7zM3 14h7v7H3zM14 14h7v7h-7z',
    list: 'M8 5h13M8 12h13M8 19h13M3 5h.01M3 12h.01M3 19h.01',
    close: 'M6 6l12 12M6 18 18 6',
    settings: 'M4 7h16M4 17h16M9 4v6M15 14v6',
    help: 'M9.1 9a3 3 0 0 1 5.8 1c0 2-3 2-3 4M12 17h.01',
    star: 'm12 3 2.8 5.7 6.2.9-4.5 4.4 1.1 6.2-5.6-3-5.6 3 1.1-6.2L2 9.6l6.2-.9z',
    calendar: 'M4 5h16v16H4zM8 2v6M16 2v6M4 11h16',
    arrow: 'M5 12h14M13 6l6 6-6 6',
    people:
      'M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M16 3a4 4 0 0 1 0 8M22 21v-2a4 4 0 0 0-3-3.87M13 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0',
  };
  const icon = (name) =>
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="' +
    (paths[name] || paths.grid) +
    '"/></svg>';
  const tip = (text, label = '说明') =>
    '<button type="button" class="info-tip" aria-label="' +
    esc(label) +
    '" data-tip="' +
    esc(text) +
    '">?</button>';
  window.BuddyUI = { icon, tip };
  const bubble = document.createElement('div');
  bubble.className = 'info-tooltip';
  bubble.id = 'buddyTooltip';
  bubble.setAttribute('role', 'tooltip');
  bubble.hidden = true;
  document.body.append(bubble);
  let tipTarget = null,
    tipTimer;
  const hideTip = () => {
    clearTimeout(tipTimer);
    tipTarget?.removeAttribute('aria-describedby');
    tipTarget = null;
    bubble.hidden = true;
  };
  const showTip = (button) => {
    clearTimeout(tipTimer);
    if (tipTarget !== button) tipTarget?.removeAttribute('aria-describedby');
    tipTarget = button;
    const tipHost = button.closest('dialog[open]') || document.body;
    if (bubble.parentElement !== tipHost) tipHost.append(bubble);
    bubble.textContent = button.dataset.tip;
    bubble.hidden = false;
    button.setAttribute('aria-describedby', bubble.id);
    const r = button.getBoundingClientRect(),
      w = bubble.offsetWidth,
      h = bubble.offsetHeight;
    bubble.style.left = Math.max(10, Math.min(innerWidth - w - 10, r.left)) + 'px';
    bubble.style.top =
      (r.bottom + h + 16 < innerHeight ? r.bottom + 8 : Math.max(8, r.top - h - 8)) + 'px';
  };
  document.addEventListener('pointerover', (e) => {
    const b = e.target.closest?.('[data-tip]');
    if (b) showTip(b);
    if (e.target.closest?.('.info-tooltip')) clearTimeout(tipTimer);
  });
  document.addEventListener('pointerout', (e) => {
    if (e.target.closest?.('[data-tip],.info-tooltip'))
      tipTimer = setTimeout(() => {
        if (
          !bubble.matches(':hover') &&
          !tipTarget?.matches(':hover') &&
          document.activeElement !== tipTarget
        )
          hideTip();
      }, 120);
  });
  document.addEventListener('focusin', (e) => {
    const b = e.target.closest?.('[data-tip]');
    if (b) showTip(b);
    else hideTip();
  });
  document.addEventListener('click', (e) => {
    const b = e.target.closest?.('[data-tip]');
    if (b) {
      showTip(b);
    } else if (!e.target.closest?.('.info-tooltip')) hideTip();
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') hideTip();
  });
  document.addEventListener('scroll', hideTip, true);
  window.addEventListener('resize', hideTip);

  const sidebar = document.querySelector('.sidebar'),
    workspace = document.querySelector('.workspace');
  if (!workspace) return;
  const read = (key, fallback) => {
    try {
      return JSON.parse(AppStorage.getItem(key)) ?? fallback;
    } catch {
      return fallback;
    }
  };
  const write = (key, value) => {
    try {
      AppStorage.setItem(key, JSON.stringify(value));
    } catch {}
  };
  document.body.classList.add('google-workspace');
  if (read('buddy_nav_compact', false) && innerWidth > 760)
    document.body.classList.add('nav-compact');
  document.body.classList.toggle('comfortable', read('buddy_comfortable', true));
  const previousBar = workspace.querySelector('.topbar'),
    refresh = previousBar?.querySelector('button');
  // Keep the existing breadcrumb node available to detail-page renderers.
  if (previousBar) previousBar.classList.add('legacy-topbar');
  const header = document.createElement('header');
  header.className = 'app-header';
  header.innerHTML =
    '<div class="app-brand"><md-icon-button id="navToggle" aria-label="收起导航" title="展开或收起导航">' +
    icon('menu') +
    '</md-icon-button><a href="index.html" aria-label="TeacherBuddy 首页"><span class="brand-symbol">' +
    icon('grid') +
    '</span><span>Teacher<span class="brand-light">Buddy</span></span></a></div><div class="app-search-wrap"><form class="app-search" role="search"><span>' +
    icon('search') +
    '</span><input id="globalSearch" placeholder="搜索班级、学生和频道" aria-label="搜索班级、学生和频道" autocomplete="off" aria-controls="globalResults" aria-expanded="false"><kbd>/</kbd><button type="button" id="clearSearch" aria-label="清空搜索" hidden>' +
    icon('close') +
    '</button></form><div id="globalResults" class="search-results" hidden></div></div><div class="app-header-actions"><md-icon-button id="displaySettings" aria-label="更多选项" title="更多选项" aria-expanded="false" aria-controls="workspaceOptions">' +
    icon('more') +
    '</md-icon-button></div>';
  document.body.prepend(header);
  if (typeof __TEACHERBUDDY_DEMO__ !== 'undefined' && __TEACHERBUDDY_DEMO__) {
    const demoLink = document.createElement('a');
    demoLink.href = 'getting-started.html';
    demoLink.className = 'demo-mode-link';
    demoLink.textContent = '演示版';
    demoLink.title = '已脱敏测试数据，修改仅保留在当前浏览器会话。点击安装自己的工作台。';
    header.querySelector('.app-header-actions').prepend(demoLink);
  }
  sidebar?.querySelectorAll('.nav-link').forEach((link) => (link.title = link.textContent.trim()));
  const logo = sidebar?.querySelector('.logo');
  if (logo) logo.remove();

  const overlay = document.createElement('button');
  overlay.className = 'nav-backdrop';
  overlay.setAttribute('aria-label', '关闭导航');
  document.body.append(overlay);
  const toggle = document.getElementById('navToggle');
  const updateNav = () => {
    toggle.setAttribute(
      'aria-expanded',
      String(
        innerWidth <= 760
          ? document.body.classList.contains('nav-open')
          : !document.body.classList.contains('nav-compact'),
      ),
    );
    toggle.setAttribute(
      'aria-label',
      toggle.getAttribute('aria-expanded') === 'true' ? '收起导航' : '展开导航',
    );
  };
  toggle.onclick = () => {
    if (innerWidth <= 760) document.body.classList.toggle('nav-open');
    else {
      document.body.classList.toggle('nav-compact');
      write('buddy_nav_compact', document.body.classList.contains('nav-compact'));
    }
    updateNav();
  };
  overlay.onclick = () => {
    document.body.classList.remove('nav-open');
    updateNav();
  };
  updateNav();
  const popover = document.createElement('section');
  popover.id = 'workspaceOptions';
  popover.className = 'display-popover';
  popover.hidden = true;
  popover.setAttribute('aria-label', '更多选项');
  popover.innerHTML =
    '<div class="options-label">显示</div><label><input type="checkbox" id="densitySetting">宽松间距</label><div class="options-actions"><div class="shortcut-help">快捷键' +
    tip('按 / 搜索；方向键选择搜索结果；Enter 打开；Esc 关闭弹层。', '快捷键说明') +
    '</div></div>';
  header.append(popover);
  if (refresh) {
    refresh.className = 'options-refresh';
    refresh.textContent = '刷新记录';
    refresh.title = '重新读取教学记录';
    popover.querySelector('.options-actions').prepend(refresh);
  }
  const optionsButton = document.getElementById('displaySettings');
  const setOptions = (open) => {
    popover.hidden = !open;
    optionsButton.setAttribute('aria-expanded', String(open));
  };
  const density = popover.querySelector('input');
  density.checked = document.body.classList.contains('comfortable');
  density.onchange = () => {
    document.body.classList.toggle('comfortable', density.checked);
    write('buddy_comfortable', density.checked);
  };
  optionsButton.onclick = () => setOptions(popover.hidden);
  const input = document.getElementById('globalSearch'),
    results = document.getElementById('globalResults'),
    clear = document.getElementById('clearSearch');
  let model;
  const close = () => {
    results.hidden = true;
    input.setAttribute('aria-expanded', 'false');
  };
  const search = () => {
    const q = input.value.trim().toLowerCase();
    clear.hidden = !q;
    if (!q) {
      close();
      return;
    }
    const entries = [...document.querySelectorAll('.sidebar .nav-link')].map((a) => ({
      title: a.textContent.trim(),
      sub: '工作入口',
      href: a.getAttribute('href'),
    }));
    if (model) {
      model.classes.forEach((c) =>
        entries.push({
          title: c.label,
          sub:
            model.groups.find((g) => g.id === c.groupId)?.name +
            (c.status === 'archived' ? ' · 已归档' : ''),
          href: Product.classLink(c.id),
        }),
      );
      model.students.forEach((s) =>
        entries.push({ title: s.name, sub: '学生档案', href: Product.studentLink(s.id) }),
      );
    }
    const matches = entries
      .filter((e) => (e.title + ' ' + e.sub).toLowerCase().includes(q))
      .slice(0, 9);
    results.innerHTML =
      '<div class="search-results-label">搜索结果</div>' +
      (matches.length
        ? matches
            .map(
              (e) =>
                '<a href="' +
                esc(e.href) +
                '"><span>' +
                icon(e.sub === '学生档案' ? 'people' : 'arrow') +
                '</span><div><strong>' +
                esc(e.title) +
                '</strong><small>' +
                esc(e.sub) +
                '</small></div></a>',
            )
            .join('')
        : '<p>没有匹配的班级或学生</p>');
    results.hidden = false;
    input.setAttribute('aria-expanded', 'true');
  };
  Product.load()
    .then((m) => {
      model = m;
      if (input.value) search();
    })
    .catch(() => {});
  input.oninput = search;
  input.onfocus = () => {
    if (input.value) search();
  };
  clear.onclick = () => {
    input.value = '';
    clear.hidden = true;
    close();
    input.focus();
  };
  header.querySelector('form').onsubmit = (e) => {
    e.preventDefault();
    results.querySelector('a')?.click();
  };
  input.onkeydown = (e) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      results.querySelector('a')?.focus();
    }
  };
  results.onkeydown = (e) => {
    const links = [...results.querySelectorAll('a')],
      i = links.indexOf(document.activeElement);
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      links[(i + (e.key === 'ArrowDown' ? 1 : -1) + links.length) % links.length]?.focus();
    }
  };
  document.addEventListener('keydown', (e) => {
    if (e.key === '/' && !/INPUT|TEXTAREA|SELECT/.test(document.activeElement.tagName)) {
      e.preventDefault();
      input.focus();
    }
    if (e.key === 'Escape') {
      close();
      setOptions(false);
      document.body.classList.remove('nav-open');
      updateNav();
    }
  });
  document.addEventListener('click', (e) => {
    if (!e.target.closest('.app-search-wrap')) close();
    if (!e.target.closest('.display-popover') && !e.target.closest('#displaySettings'))
      setOptions(false);
  });
}
initializeShell();

export const BuddyUI = window.BuddyUI;
