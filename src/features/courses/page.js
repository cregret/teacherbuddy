export function createCoursesView(context) {
  const { model, page, params, root, esc, route, cl, link, tabs, search, select, period } = context;
  function bindFilters() {
    const statusFilter = document.getElementById('filterStatus');
    if (statusFilter && [...statusFilter.options].some((o) => o.value === params.get('status')))
      statusFilter.value = params.get('status');
    const counter = document.getElementById('resultCount'),
      bar = root.querySelector('.channel-controls');
    if (counter && bar) {
      counter.classList.add('filter-count');
      bar.append(counter);
    }
    const run = () => {
      const q = (document.getElementById('filterSearch')?.value || '').trim().toLowerCase();
      const status = document.getElementById('filterStatus')?.value || '';
      const cls = document.getElementById('filterClass')?.value || '';
      let count = 0;
      root.querySelectorAll('[data-record]').forEach((n) => {
        const show =
          (!q || n.dataset.search.toLowerCase().includes(q)) &&
          (!status || (n.dataset.status || '').split('|').includes(status)) &&
          (!cls || (n.dataset.classes || '').split('|').includes(cls));
        n.hidden = !show;
        if (show) count++;
      });
      if (document.getElementById('resultCount'))
        document.getElementById('resultCount').textContent = count + ' 条记录';
      if (document.getElementById('noResults'))
        document.getElementById('noResults').hidden = count > 0;
    };
    ['filterSearch', 'filterStatus', 'filterClass'].forEach((id) => {
      document
        .getElementById(id)
        ?.addEventListener(id === 'filterSearch' ? 'input' : 'change', () => {
          const url = new URL(location.href);
          [
            ['filterSearch', 'q'],
            ['filterStatus', 'status'],
            ['filterClass', 'class'],
          ].forEach(([field, key]) => {
            const input = document.getElementById(field);
            if (!input) return;
            input.value ? url.searchParams.set(key, input.value) : url.searchParams.delete(key);
            input.value ? params.set(key, input.value) : params.delete(key);
          });
          url.searchParams.delete('name');
          params.delete('name');
          history.replaceState(null, '', url);
          run();
        });
    });
    run();
  }
  function courses() {
    const requestedGroup = params.get('group') || params.get('period') || '';
    const archived = params.get('view') === 'archived';
    const groupId = model.groups.some((g) => g.id === requestedGroup) ? requestedGroup : '';
    const list = model.classes.filter(
      (c) =>
        (!groupId || c.groupId === groupId) &&
        (archived ? c.status === 'archived' : c.status === 'active'),
    );
    root.innerHTML =
      tabs(
        [
          [
            'active',
            '正在授课',
            route('courses.html', { view: 'active', ...(groupId ? { group: groupId } : {}) }),
          ],
          [
            'archived',
            '已归档班课',
            route('courses.html', { view: 'archived', ...(groupId ? { group: groupId } : {}) }),
          ],
        ],
        archived ? 'archived' : 'active',
      ) +
      '<div class="course-page-navigation">' +
      select(
        'coursePeriod',
        '',
        [['', '全部'], ...model.groups.map((g) => [g.id, g.name])],
        groupId,
      ) +
      '</div>';
    const stored = Product.safeStorage('buddy_course_layout', 'list'),
      layout = params.get('layout') || stored;
    const body = list
      .map((c) => {
        const done = c.lessons.filter(
          (l) => l.kind !== 'supplement' && ['recorded', 'archived'].includes(l.status),
        );
        const planned = Math.max(1, Number(c.planned) || c.lessons.length || 1),
          progress = Math.min(done.length, planned);
        const tone = ['blue', 'green', 'sand', 'rose', 'teal', 'slate'][
          model.classes.indexOf(c) % 6
        ];
        const schedule = (c.schedule || '上课时间未记录').replace(
          /^周([一二三四五六日天])/,
          '每周$1',
        );
        return (
          '<article class="classroom-card classroom-compact tone-' +
          tone +
          '" data-record data-search="' +
          esc(c.label + ' ' + period(c.groupId).name) +
          '"><div class="classroom-cover"><div class="classroom-cover-art" aria-hidden="true"><i></i><i></i><i></i></div><a class="classroom-title" href="' +
          cl(c.id) +
          '"><span>' +
          esc(period(c.groupId).name) +
          '</span><h2>' +
          esc(c.label) +
          '</h2><small>' +
          esc(schedule) +
          '</small></a></div><div class="classroom-card-body"><div class="classroom-core-facts"><span>授课进度</span><strong>' +
          progress +
          ' <small>/ ' +
          planned +
          ' 讲</small></strong><span class="classroom-member-count">' +
          c.members.length +
          ' 位学生</span></div><progress value="' +
          progress +
          '" max="' +
          planned +
          '" aria-label="' +
          esc(c.label) +
          '已记录授课 ' +
          progress +
          ' / ' +
          planned +
          ' 讲"></progress></div></article>'
        );
      })
      .join('');
    root.innerHTML +=
      '<div class="classroom-toolbar"><div class="classroom-tools">' +
      search('搜索班级名称') +
      '<div class="layout-switch" aria-label="班课显示方式"><button data-layout="grid" aria-label="卡片视图" aria-pressed="' +
      (layout !== 'list') +
      '">' +
      BuddyUI.icon('grid') +
      '</button><button data-layout="list" aria-label="列表视图" aria-pressed="' +
      (layout === 'list') +
      '">' +
      BuddyUI.icon('list') +
      '</button></div></div></div><div class="classroom-grid ' +
      (layout === 'list' ? 'list-layout' : '') +
      '" id="classroomGrid">' +
      body +
      '</div><div id="noResults" class="result-empty" hidden><strong>没有匹配的班级</strong><p>试试其他关键词或选择“全部”分组。</p></div><div id="resultCount" class="count-note classroom-count"></div>';
    document.getElementById('coursePeriod')?.addEventListener(
      'change',
      (e) =>
        (location.href = route('courses.html', {
          view: archived ? 'archived' : 'active',
          ...(e.target.value ? { group: e.target.value } : {}),
        })),
    );
    root.querySelectorAll('.classroom-card').forEach((card) => {
      card.tabIndex = 0;
      card.setAttribute('role', 'link');
      card.setAttribute('aria-label', card.querySelector('h2').textContent);
      card.addEventListener('click', (e) => {
        if (!e.target.closest('a,button,input,select'))
          location.href = card.querySelector('.classroom-title').href;
      });
      card.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && e.target === card)
          location.href = card.querySelector('.classroom-title').href;
      });
    });
    const courseNavigation = root.querySelector('.course-page-navigation');
    courseNavigation.append(root.querySelector('.classroom-tools'));
    root.querySelector('.classroom-toolbar').remove();
    root.querySelector('#coursePeriod').setAttribute('aria-label', '选择班课分组');
    bindFilters();
    root.querySelectorAll('[data-layout]').forEach(
      (button) =>
        (button.onclick = () => {
          const listView = button.dataset.layout === 'list';
          root.querySelector('#classroomGrid').classList.toggle('list-layout', listView);
          root
            .querySelectorAll('[data-layout]')
            .forEach((b) => b.setAttribute('aria-pressed', String(b === button)));
          try {
            AppStorage.setItem('buddy_course_layout', JSON.stringify(button.dataset.layout));
          } catch {}
          const url = new URL(location.href);
          url.searchParams.set('layout', button.dataset.layout);
          history.replaceState(null, '', url);
        }),
    );
  }
  return courses;
}
