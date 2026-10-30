import { renderStudentDetail } from '../students/detail.js';
import { WorkspaceRecords } from '../../core/records.js';
import { TeacherbuddyReading } from '../reports/lesson-view.js';
import { StudentReportView } from '../reports/student-view.js';
import { LessonState } from '../teaching/lesson-state.js';
import { AppStorage } from '../../core/storage.js';
export function createTeachingViews(context) {
  const {
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
  } = context;
  async function classDetail() {
    const c = model.classes.find((c) => c.id === params.get('id'));
    if (!c) return missing('没有找到这个班级', route('courses.html'), '返回班级列表');
    const p = period(c.periodId),
      requested = params.get('tab'),
      tab = requested === 'students' ? 'students' : 'lessons',
      archived = c.status === 'archived';
    const reportNo = Number(c.brief?.label?.match(/第\s*(\d+)\s*讲/)?.[1] || 0);
    const recorded = [...c.lessons].filter((l) => ['recorded', 'archived'].includes(l.status));
    const latestDone = Math.max(0, ...recorded.map((l) => Number(l.number) || 0));
    const requestedLesson = Number(params.get('lesson'));
    const requestedExists = c.lessons.some((l) => l.number === requestedLesson);
    const selectedNo = requestedExists
      ? requestedLesson
      : archived
        ? Number(c.lessons.at(-1)?.number) || 0
        : latestDone || Number(c.lessons[0]?.number) || 0;
    const selected = c.lessons.find((l) => l.number === selectedNo);
    document.getElementById('breadcrumbLabel').innerHTML = link(
      route('courses.html', { group: p.id, ...(archived ? { view: 'archived' } : {}) }),
      archived ? '← 已归档班课' : '← 正在授课',
    );
    root.innerHTML =
      '<div class="class-heading"><div><h1>' +
      esc(c.label) +
      '</h1><span class="class-meta">' +
      esc(c.schedule) +
      ' · ' +
      c.members.length +
      ' 位学生</span>' +
      badge(archived ? '已归档 · 只读' : '教学中', archived ? 'check' : 'done') +
      '</div>' +
      select(
        'classSwitch',
        '切换班级',
        model.classes.filter((x) => x.periodId === p.id).map((x) => [x.id, x.label]),
        c.id,
      ) +
      '</div>' +
      tabs(
        [
          ['lessons', '课节', cl(c.id, 'lessons')],
          ['students', '学生', cl(c.id, 'students')],
        ],
        tab,
      );
    if (tab === 'lessons') {
      const workspace = document.createElement('div');
      workspace.className = 'lesson-workspace';
      root.append(workspace);
      const lessonRows = [...c.lessons]
        .sort((a, b) => a.number - b.number)
        .map((l) => {
          const active = l.number === selectedNo,
            hasBrief = !!(
              c.periodId === 'autumn' &&
              c.brief?.href &&
              reportNo === Number(l.number)
            );
          const detail =
            l.status === 'archived' && l.description
              ? '<span class="lesson-select-description">' + esc(l.description) + '</span>'
              : '';
          const item =
            '<span class="lesson-select-main"><strong>' +
            esc(LessonState.label(l)) +
            '</strong><span>' +
            esc(l.date) +
            (l.time ? ' · ' + esc(l.time) : '') +
            '</span></span><span class="lesson-select-meta">' +
            LessonState.render(c, l) +
            '</span>' +
            detail;
          return (
            '<button type="button" class="lesson-select ' +
            (active ? 'active' : '') +
            '" data-lesson="' +
            esc(l.number) +
            '" aria-pressed="' +
            active +
            '">' +
            item +
            '</button>'
          );
        })
        .join('');
      workspace.innerHTML =
        '<section class="panel lesson-calendar"><div class="panel-heading"><div><h2>课节</h2></div><span class="record-sub">' +
        c.lessons.length +
        ' 条课节</span></div><div class="lesson-select-list">' +
        (lessonRows || '<p class="info-body">暂时没有可展示的课节记录。</p>') +
        '</div></section>';
      const briefMatches = !!(
        selected &&
        (selected.report ||
          (c.periodId === 'autumn' && c.brief?.href && reportNo === Number(selected.number)))
      );
      const shareLink =
        selected && briefMatches
          ? route('lesson-share.html', { class: c.id, lesson: selected.number })
          : '';
      const statusLabel = selected
        ? { recorded: '已结束', missing: '未开始', scheduled: '未开始', archived: '已结束' }[
            selected.status
          ] || '课节记录'
        : '';
      const summary = (selected?.description || c.teachingNote || '')
        .replace(/备课：[\s\S]*?(?=上课：|$)/g, '')
        .replace(/上课：[^，；。]*/g, '')
        .trim();
      const recordBody = selected
        ? '<div class="lesson-record-detail"><div class="lesson-record-facts"><span>' +
          esc(p.name) +
          ' · ' +
          esc(c.label) +
          '</span><span>' +
          esc(selected.date || '日期未记录') +
          (selected.time ? ' · ' + esc(selected.time) : '') +
          '</span><span>' +
          esc(statusLabel) +
          '</span></div><section class="lesson-record-summary"><h3>' +
          (selected.status === 'scheduled' ? '本节课安排' : '本节课记录') +
          '</h3><p>' +
          esc(summary || '暂无课节摘要') +
          '</p></section></div>'
        : '<p class="info-body">没有可选的课节记录。</p>';
      workspace.insertAdjacentHTML(
        'beforeend',
        '<section class="panel lesson-brief"><div class="panel-heading"><div><h2>' +
          esc(LessonState.label(selected)) +
          ' · ' +
          (briefMatches ? '课节简报' : selected?.status === 'scheduled' ? '课节安排' : '课节记录') +
          '</h2></div><div class="row-actions">' +
          (briefMatches
            ? '<a class="button" target="_blank" rel="noopener" href="' +
              esc(shareLink) +
              '">独立阅读 ↗</a><button class="button" id="copyLessonLink">复制链接</button><button class="button" id="copyLessonBrief" disabled>复制正文</button>'
            : '') +
          (briefMatches
            ? '<button class="button" id="lessonMarketing">留作文章素材</button>'
            : '') +
          '</div></div>' +
          (briefMatches && selected.status === 'missing'
            ? '<div class="lesson-status-warning">' +
              tip('课表标记待补录，但本讲简报标记已完课。请核对授课记录。', '授课状态说明') +
              '</div>'
            : '') +
          '<div class="lesson-current-states">' +
          LessonState.render(c, selected) +
          '</div><div class="lesson-brief-body" id="lessonBriefContent">' +
          (briefMatches ? '<p class="reading-loading">正在读取这节课的原始简报…</p>' : recordBody) +
          '</div></section>',
      );
      const renderSourceBrief = () => {
        if (selected.report) {
          TeacherbuddyReading.mountRecord(
            document.getElementById('lessonBriefContent'),
            c,
            selected,
          );
          const b = document.getElementById('copyLessonBrief');
          b.disabled = false;
          b.onclick = () =>
            sharePreview(
              c.label + ' · 第 ' + selected.number + ' 讲',
              document.getElementById('lessonBriefContent').shadowRoot?.querySelector('.container')
                ?.innerText || document.getElementById('lessonBriefContent').innerText,
            );
        } else loadBrief(c.brief.href, 'lessonBriefContent', 'copyLessonBrief');
      };
      if (briefMatches) renderSourceBrief();
      root.querySelectorAll('[data-lesson]').forEach(
        (button) =>
          (button.onclick = async () => {
            const scroll = root.querySelector('.lesson-select-list').scrollTop;
            params.set('lesson', button.dataset.lesson);
            history.replaceState(
              null,
              '',
              route('class-detail.html', {
                id: c.id,
                tab: 'lessons',
                lesson: button.dataset.lesson,
              }),
            );
            await classDetail();
            root.querySelector('.lesson-select-list').scrollTop = scroll;
            root.querySelector('.lesson-brief-body').scrollTop = 0;
          }),
      );
      const copyLink = document.getElementById('copyLessonLink');
      if (copyLink)
        copyLink.onclick = async () => {
          const absolute = new URL(shareLink, location.href).href;
          try {
            await navigator.clipboard.writeText(absolute);
            toast(
              location.hostname === '127.0.0.1' || location.hostname === 'localhost'
                ? '简报独立链接已复制；当前本地地址仅本机可打开'
                : '简报独立链接已复制，可发给家长',
            );
          } catch {
            sharePreview('课节简报独立链接', absolute);
          }
        };
      const marketing = document.getElementById('lessonMarketing');
      if (marketing && selected) {
        marketing.disabled = !briefMatches;
        marketing.onclick = async () => {
          const id = c.id + '-' + selected.number,
            title = selected.report?.title || c.label + '第 ' + selected.number + ' 讲课堂素材',
            text = selected.report
              ? [
                  title,
                  selected.report.summary,
                  ...(selected.report.content || []),
                  '教师表达：' + (selected.report.highlights || []).join('\n'),
                ].join('\n\n')
              : document
                  .getElementById('lessonBriefContent')
                  .shadowRoot?.querySelector('.container')?.innerText || selected.description;
          try {
            const drafts = Product.safeStorage('buddy_lesson_materials', []);
            const item = {
              id,
              tag: '课堂素材 · 待成文',
              title,
              body: text,
              source: cl(c.id, 'lessons') + '&lesson=' + selected.number,
            };
            const at = drafts.findIndex((d) => d.id === id);
            if (at < 0) drafts.unshift(item);
            else drafts[at] = item;
            AppStorage.setItem('buddy_lesson_materials', JSON.stringify(drafts));
            await AppStorage.flush();
            location.href = route('marketing.html', { material: id });
          } catch {
            toast('保存失败，请复制正文留存');
          }
        };
      }
      if (params.get('lesson') && !selected)
        root.querySelector('.lesson-brief-body').innerHTML =
          '<p class="info-body">课节编号不在本班记录中。</p>';
    } else if (tab === 'students') {
      await renderClassStudents(c, p, archived);
    }
    document.getElementById('classSwitch').onchange = (e) =>
      (location.href = cl(e.target.value, tab));
    if (tab === 'lessons')
      requestAnimationFrame(() => {
        const list = root.querySelector('.lesson-select-list'),
          item = list?.querySelector('.active');
        if (item) {
          const top = item.getBoundingClientRect().top - list.getBoundingClientRect().top;
          if (top < 0 || top + item.offsetHeight > list.clientHeight)
            list.scrollTop += top - (list.clientHeight - item.offsetHeight) / 2;
        }
      });
  }
  function studentLearningBrief(student, d, c, full = false) {
    const href =
      'student-report.html?class=' +
      encodeURIComponent(c?.id || d?.classId || '') +
      '&id=' +
      encodeURIComponent(student.id);
    return (
      '<div class="original-student-tools">' +
      link(
        route('student-detail.html', { id: student.id, class: c?.id || '', from: 'class' }),
        '学生详情与跟进 →',
      ) +
      '<a href="' +
      esc(href) +
      '" target="_blank" rel="noopener">独立阅读 ↗</a></div><div id="originalStudentReport"></div>'
    );
  }
  function bindStudentFeedback(student, d, c) {
    const host = root.querySelector('#originalStudentReport');
    if (!host) return;
    StudentReportView.mount(
      host,
      d,
      student,
      c ? period(c.periodId).name + ' · ' + c.label : d?.className || '',
    ).catch(() => {
      if (host.isConnected) host.textContent = '简报暂时无法读取，请刷新重试。';
    });
  }
  async function renderClassStudents(c, p, archived) {
    const getRecord = (m) => WorkspaceRecords.resolve(model, m.name, c.id);
    let current = c.members.find((m) => m.studentId === params.get('student')) || c.members[0];
    root.innerHTML +=
      '<div class="class-student-workspace"><aside class="panel class-student-roster"><div class="panel-heading"><div><h2>班级学生</h2><p class="caption">' +
      c.members.length +
      ' 位学生</p></div></div><label class="student-list-search">快速查找<input id="classStudentSearch" type="search" placeholder="输入姓名"></label><div class="class-student-list" id="classStudentList"></div></aside><section class="class-student-detail" id="classStudentDetail" aria-live="polite"></section></div>';
    const detail = root.querySelector('#classStudentDetail'),
      list = root.querySelector('#classStudentList'),
      search = root.querySelector('#classStudentSearch');
    function showStudent(member) {
      current = member;
      root.querySelectorAll('.class-student-choice').forEach((b) => {
        const active = b.dataset.studentName === member?.name;
        b.classList.toggle('active', active);
        b.setAttribute('aria-pressed', String(active));
      });
      if (!member) {
        detail.innerHTML =
          '<section class="panel result-empty">没有匹配的学生，请调整搜索内容。</section>';
        return;
      }
      const d = getRecord(member),
        student = model.students.find((x) => x.id === member.studentId) || {
          id: 'student-' + member.name,
          name: member.name,
        };
      const url = new URL(location.href);
      url.searchParams.set('student', student.id);
      history.replaceState(null, '', url);
      params.set('student', student.id);
      detail.innerHTML = studentLearningBrief(student, d, c);
      detail.scrollTop = 0;
      bindStudentFeedback(student, d, c);
    }
    function draw() {
      const q = search.value.trim(),
        visible = c.members.filter((m) => m.name.includes(q));
      list.innerHTML =
        visible
          .map((m) => {
            const d = getRecord(m);
            return (
              '<button type="button" class="class-student-choice" data-student-name="' +
              esc(m.name) +
              '" aria-pressed="false"><strong>' +
              esc(m.name) +
              '</strong><span>' +
              esc(d?.lessons?.length || 0) +
              ' 节 · ' +
              esc(d?.state || '学习记录') +
              '</span></button>'
            );
          })
          .join('') || '<p class="result-empty">没有匹配的学生</p>';
      showStudent(visible.includes(current) ? current : visible[0]);
      list.querySelectorAll('button').forEach((button) => {
        button.onclick = () =>
          showStudent(visible.find((m) => m.name === button.dataset.studentName));
        button.onkeydown = (e) => {
          if (!['ArrowUp', 'ArrowDown'].includes(e.key)) return;
          e.preventDefault();
          const i = visible.findIndex((m) => m.name === button.dataset.studentName),
            next =
              visible[
                Math.max(0, Math.min(visible.length - 1, i + (e.key === 'ArrowDown' ? 1 : -1)))
              ];
          showStudent(next);
          list.querySelectorAll('button')[visible.indexOf(next)].focus();
        };
      });
    }
    search.oninput = draw;
    draw();
    requestAnimationFrame(() => {
      const item = list.querySelector('.active');
      if (item) list.scrollTop = Math.max(0, item.offsetTop - list.offsetTop - 80);
    });
  }
  async function loadBrief(href, hostId = 'briefContent', buttonId = 'copyBrief') {
    const host = document.getElementById(hostId),
      button = document.getElementById(buttonId);
    try {
      await TeacherbuddyReading.mount(host, href);
      if (!host.isConnected) return;
      if (button) {
        button.disabled = false;
        button.textContent = '复制简报';
        button.onclick = () =>
          sharePreview('课节学习简报', host.shadowRoot.querySelector('.container').innerText);
      }
    } catch {
      if (host.isConnected) {
        host.innerHTML =
          '<p class="reading-loading">简报暂时无法加载。 <button class="button" id="retryBrief">重试</button> ' +
          link(href, '打开原版') +
          '</p>';
        document.getElementById('retryBrief').onclick = () => loadBrief(href, hostId, buttonId);
      }
    }
  }
  function studentDetail() {
    return renderStudentDetail(root, model);
  }
  return { classDetail, studentDetail };
}
