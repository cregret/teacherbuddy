import { escapeHtml as esc } from '../../core/html.js';
import { Product } from '../../core/model.js';
import { LessonState } from '../teaching/lesson-state.js';

const date = (s) => new Date((s || '') + 'T12:00:00Z'),
  iso = (d) => d.toISOString().slice(0, 10),
  add = (s, n) => {
    const d = date(s);
    d.setUTCDate(d.getUTCDate() + n);
    return iso(d);
  },
  monday = (s) => add(s, -((date(s).getUTCDay() + 6) % 7));
const monthName = (s) => date(s).getUTCFullYear() + ' 年 ' + (date(s).getUTCMonth() + 1) + ' 月',
  weekday = ['一', '二', '三', '四', '五', '六', '日'];
const today = () =>
  new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Shanghai',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());
const stateName = {
  recorded: '已完成',
  missing: '未开始',
  scheduled: '未开始',
  archived: '已完成',
};
function defaultDate(events = []) {
  return (
    events
      .filter((e) => e.date <= today() && e.report)
      .sort((a, b) => b.date.localeCompare(a.date))[0]?.date ||
    events.filter((e) => e.date >= today()).sort((a, b) => a.date.localeCompare(b.date))[0]?.date ||
    events.at(-1)?.date ||
    today()
  );
}
window.ProductCalendar = {
  render(root, model) {
    const q = new URLSearchParams(location.search);
    let period = model.periods.some((p) => p.id === q.get('period'))
        ? q.get('period')
        : model.periods.find((p) => p.status === 'active')?.id || model.periods[0]?.id || '',
      view = q.get('view') === 'month' ? 'month' : 'week',
      classId = q.get('class') || '';
    const events = model.classes
      .flatMap((c) =>
        c.lessons.map((l) => ({
          id: c.id + ':' + l.number,
          classId: c.id,
          className: c.label,
          periodId: c.periodId,
          lesson: l.number,
          label: LessonState.label(l),
          date: l.date,
          time: l.time || '',
          location: l.location || c.location || c.venue || '',
          members: c.members.length,
          report: LessonState.hasReport(c, l),
          status: l.status,
          description: (l.description || '')
            .replace(/备课：[\s\S]*?(?=上课：|$)/g, '')
            .replace(/上课：[^，；。]*/g, '')
            .trim(),
        })),
      )
      .filter((e) => /^\d{4}-\d{2}-\d{2}$/.test(e.date));
    let monthEvents = events.filter(
      (e) => e.periodId === period && (!classId || e.classId === classId),
    );
    let anchor = /^\d{4}-\d{2}-\d{2}$/.test(q.get('date') || '')
        ? q.get('date')
        : defaultDate(monthEvents, model),
      selected = /^\d{4}-\d{2}-\d{2}$/.test(q.get('selected') || '') ? q.get('selected') : anchor,
      selectedEvent = q.get('lesson') || '';
    const filtered = () =>
      events
        .filter((e) => e.periodId === period && (!classId || e.classId === classId))
        .sort((a, b) => a.date.localeCompare(b.date) || (a.time || '').localeCompare(b.time || ''));
    const onDay = (d) => filtered().filter((e) => e.date === d);
    const statusTone = (e) => (['recorded', 'archived'].includes(e.status) ? 'done' : '');
    function sync() {
      const u = new URL(location.href);
      u.searchParams.delete('scope');
      u.searchParams.delete('kinds');
      u.searchParams.delete('tab');
      u.searchParams.set('period', period);
      u.searchParams.set('view', view);
      u.searchParams.set('date', anchor);
      u.searchParams.set('selected', selected);
      classId ? u.searchParams.set('class', classId) : u.searchParams.delete('class');
      selectedEvent ? u.searchParams.set('lesson', selectedEvent) : u.searchParams.delete('lesson');
      history.replaceState(null, '', u);
    }
    function dayCells() {
      const first = iso(
          new Date(Date.UTC(date(anchor).getUTCFullYear(), date(anchor).getUTCMonth(), 1, 12)),
        ),
        start = monday(first),
        offset = (date(first).getUTCDay() + 6) % 7,
        total =
          Math.ceil(
            (offset +
              new Date(
                Date.UTC(date(first).getUTCFullYear(), date(first).getUTCMonth() + 1, 0, 12),
              ).getUTCDate()) /
              7,
          ) * 7;
      return Array.from({ length: total }, (_, i) => add(start, i));
    }
    function eventChip(e) {
      return (
        '<button class="record-calendar-event ' +
        statusTone(e) +
        ' ' +
        (selectedEvent === e.id ? 'selected' : '') +
        '" data-event-id="' +
        esc(e.id) +
        '"><span class="record-event-dot"></span><strong>' +
        esc(e.className) +
        ' · ' +
        esc(e.label) +
        '</strong><small>' +
        esc(e.time || '时间未记录') +
        ' · ' +
        esc(stateName[e.status] || '课次记录') +
        '</small></button>'
      );
    }
    function month() {
      return (
        '<div class="record-month"><div class="record-month-weekdays">' +
        weekday.map((d) => '<span>周' + d + '</span>').join('') +
        '</div><div class="record-month-days">' +
        dayCells()
          .map(
            (d) =>
              '<section class="record-month-day ' +
              (d.slice(0, 7) !== anchor.slice(0, 7) ? 'outside' : '') +
              (d === selected ? ' selected' : '') +
              (d === today() ? ' is-today' : '') +
              '"><button class="record-day-number" data-date="' +
              d +
              '">' +
              Number(d.slice(-2)) +
              '</button><div class="record-day-events">' +
              onDay(d).slice(0, 2).map(eventChip).join('') +
              (onDay(d).length > 2
                ? '<button class="record-more" data-date="' +
                  d +
                  '">另有 ' +
                  (onDay(d).length - 2) +
                  ' 条</button>'
                : '') +
              '</div></section>',
          )
          .join('') +
        '</div></div>'
      );
    }
    function week() {
      const start = monday(anchor),
        days = Array.from({ length: 7 }, (_, i) => add(start, i));
      const timelineEvent = (e) => {
        const times = e.time.match(/(\d{1,2}):(\d{2})/g) || [],
          minutes = (t) => Number(t.split(':')[0]) * 60 + Number(t.split(':')[1]);
        const begin = times[0] ? minutes(times[0]) : 8 * 60,
          end = times[1] ? minutes(times[1]) : begin + 60,
          top = (Math.max(0, Math.min(13 * 60, begin - 8 * 60)) / 840) * 100,
          height = Math.max(
            5,
            (Math.min(14 * 60 - (begin - 8 * 60), Math.max(45, end - begin)) / 840) * 100,
          );
        return (
          '<button class="record-calendar-event timed-calendar-event ' +
          statusTone(e) +
          (e.id === selectedEvent ? ' selected' : '') +
          '" style="top:' +
          top +
          '%;height:' +
          height +
          '%" data-event-id="' +
          esc(e.id) +
          '"><strong>' +
          esc(e.className) +
          ' · ' +
          esc(e.label) +
          '</strong><span>' +
          esc(e.time || '时间未记录') +
          '</span><small>' +
          esc(stateName[e.status] || '课次记录') +
          '</small></button>'
        );
      };
      return (
        '<div class="record-week-grid timed-week"><div class="week-time-column"><div class="week-time-heading">时间</div><div class="week-time-axis">' +
        Array.from(
          { length: 14 },
          (_, i) =>
            '<span style="top:' +
            (i / 14) * 100 +
            '%">' +
            String(i + 8).padStart(2, '0') +
            ':00</span>',
        ).join('') +
        '</div></div>' +
        days
          .map(
            (d) =>
              '<section class="record-week-day ' +
              (d === selected ? 'selected' : '') +
              (d === today() ? ' is-today' : '') +
              '"><button class="record-week-date" data-date="' +
              d +
              '"><span>周' +
              weekday[(date(d).getUTCDay() + 6) % 7] +
              '</span><strong>' +
              Number(d.slice(-2)) +
              '</strong></button><div class="record-week-timeline">' +
              onDay(d).map(timelineEvent).join('') +
              '</div></section>',
          )
          .join('') +
        '</div>'
      );
    }
    function selectedPanel() {
      const list = onDay(selected);
      const cards = list
        .map((item) => {
          const c = model.classes.find((c) => c.id === item.classId),
            l = c.lessons.find((l) => l.number === item.lesson),
            r = LessonState.report(c, l),
            target = r.target || l,
            report = target.report;
          const attendance = l.attendance || {},
            present = Number.isFinite(attendance.present) ? attendance.present : null,
            expected = Number.isFinite(attendance.expected) ? attendance.expected : item.members;
          const rich = (parts) =>
            (parts || [])
              .map((p) => {
                const text = esc(p.text);
                return p.tone === 'strong'
                  ? '<strong>' + text + '</strong>'
                  : ['risk', 'warn'].includes(p.tone)
                    ? '<mark class="schedule-mark-' + p.tone + '">' + text + '</mark>'
                    : text;
              })
              .join('');
          const blocks = report?.homeDigest?.length
            ? report.homeDigest
            : report?.summary
              ? [{ label: '学习摘要', parts: [{ text: report.summary }] }]
              : [];
          const content =
            '<div class="schedule-expanded-title"><strong>' +
            esc(c.label) +
            ' · ' +
            esc(LessonState.label(l)) +
            '</strong><span>↗</span></div><dl class="schedule-facts"><dt>时间</dt><dd>' +
            Number(item.date.slice(5, 7)) +
            ' 月 ' +
            Number(item.date.slice(8)) +
            ' 日 · 周' +
            weekday[(date(item.date).getUTCDay() + 6) % 7] +
            ' ' +
            esc(item.time || '时间待填写') +
            '</dd><dt>地点</dt><dd>' +
            esc(item.location || '地点未填写') +
            '</dd><dt>出勤</dt><dd title="' +
            (present === null ? '实到人数未记录；分母为班级应到人数' : '实到人数 / 应到人数') +
            '">' +
            (present === null ? '—' : present) +
            ' / ' +
            expected +
            ' 人' +
            (present === null ? ' <small>未记录</small>' : '') +
            '</dd></dl><div class="schedule-expanded-states">' +
            LessonState.render(c, l) +
            '</div>' +
            (r.previous
              ? '<div class="schedule-review-label">上一讲学情' +
                (r.target ? ' · ' + esc(LessonState.label(r.target)) : '') +
                '</div>'
              : '') +
            (blocks.length
              ? '<section class="schedule-expanded-summary">' +
                (report.title
                  ? '<p class="schedule-report-topic">' + esc(report.title) + '</p>'
                  : '') +
                blocks
                  .map(
                    (b) =>
                      '<div class="schedule-digest-block"><h4>' +
                      esc(b.label) +
                      '</h4><p>' +
                      rich(b.parts) +
                      '</p></div>',
                  )
                  .join('') +
                '</section>'
              : '<p class="schedule-no-learning">' +
                (r.has ? '查看课节学情' : '暂无学情报告') +
                '</p>');
          return r.has
            ? '<a class="schedule-expanded-lesson schedule-learning-card" href="' +
                esc(r.url) +
                '" aria-label="查看' +
                esc(c.label + ' ' + LessonState.label(target)) +
                '学情">' +
                content +
                '</a>'
            : '<article class="schedule-expanded-lesson schedule-learning-card" role="button" tabindex="0" data-unavailable-report="' +
                esc(r.previous ? '上一讲' : '本节') +
                '">' +
                content +
                '</article>';
        })
        .join('');
      return (
        '<aside class="panel record-calendar-side expanded-day"><div class="panel-heading"><h2>' +
        Number(selected.slice(5, 7)) +
        ' 月 ' +
        Number(selected.slice(8)) +
        ' 日 <small>周' +
        weekday[(date(selected).getUTCDay() + 6) % 7] +
        '</small></h2><span class="caption">' +
        list.length +
        ' 节课</span></div><div class="schedule-expanded-list">' +
        (cards || '<div class="schedule-empty">当天没有课程</div>') +
        '</div></aside>'
      );
    }
    function badgeText(e) {
      return stateName[e.status] || '来源记录';
    }
    function fitCalendar() {
      const board = root.querySelector('.calendar-board');
      if (!board || innerWidth <= 1100) return;
      const bottom = root.getBoundingClientRect().bottom;
      const height = Math.max(336, bottom - board.getBoundingClientRect().top - 94);
      root.style.setProperty('--schedule-axis', height + 'px');
    }
    window.addEventListener('resize', fitCalendar);
    function paint() {
      monthEvents = filtered();
      const day = onDay(selected);
      if (!day.some((e) => e.id === selectedEvent)) selectedEvent = day[0]?.id || '';
      sync();
      const item = filtered().find((e) => e.id === selectedEvent);
      const range =
        view === 'month'
          ? monthName(anchor)
          : date(anchor).getUTCFullYear() +
            ' 年 ' +
            monday(anchor).slice(5).replace('-', '/') +
            ' — ' +
            add(monday(anchor), 6).slice(5).replace('-', '/');
      root.innerHTML =
        '<div class="calendar-layout record-calendar-layout"><section class="calendar-main"><div class="calendar-toolbar"><div class="date-navigation"><button class="cal-icon" data-step="-1" aria-label="上一' +
        (view === 'month' ? '月' : '周') +
        '">‹</button><h2>' +
        range +
        '</h2><button class="cal-icon" data-step="1" aria-label="下一' +
        (view === 'month' ? '月' : '周') +
        '">›</button><button class="button" id="calendarToday">今天</button><label class="schedule-jump"><input type="date" id="calendarJump" aria-label="跳转日期" value="' +
        anchor +
        '"></label></div><div class="calendar-controls"><select id="recordPeriod" aria-label="班课分组">' +
        model.periods
          .map(
            (p) =>
              '<option value="' +
              esc(p.id) +
              '" ' +
              (period === p.id ? 'selected' : '') +
              '>' +
              esc(p.name) +
              '</option>',
          )
          .join('') +
        '</select><select id="recordClass" aria-label="筛选班级"><option value="">全部班级</option>' +
        model.classes
          .filter((c) => c.periodId === period)
          .map(
            (c) =>
              '<option value="' +
              esc(c.id) +
              '" ' +
              (classId === c.id ? 'selected' : '') +
              '>' +
              esc(c.label) +
              '</option>',
          )
          .join('') +
        '</select><div class="calendar-view"><button data-view="week" class="' +
        (view === 'week' ? 'active' : '') +
        '">周</button><button data-view="month" class="' +
        (view === 'month' ? 'active' : '') +
        '">月</button></div></div></div><div class="record-calendar-legend"><strong>' +
        filtered().filter((e) =>
          view === 'month'
            ? e.date.slice(0, 7) === anchor.slice(0, 7)
            : e.date >= monday(anchor) && e.date <= add(monday(anchor), 6),
        ).length +
        ' 节课</strong><span><i class="done"></i>已完成</span><span><i></i>未开始</span></div><div class="calendar-board">' +
        (view === 'month' ? month() : week()) +
        '</div></section>' +
        selectedPanel() +
        '</div>';
      requestAnimationFrame(fitCalendar);
      root.querySelectorAll('[data-step]').forEach(
        (b) =>
          (b.onclick = () => {
            if (view === 'week') anchor = add(anchor, Number(b.dataset.step) * 7);
            else {
              const d = date(anchor);
              anchor = iso(
                new Date(
                  Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + Number(b.dataset.step), 1, 12),
                ),
              );
            }
            selected = anchor;
            selectedEvent = '';
            paint();
          }),
      );
      root.querySelectorAll('[data-view]').forEach(
        (b) =>
          (b.onclick = () => {
            view = b.dataset.view;
            paint();
          }),
      );
      root.querySelectorAll('[data-date]').forEach(
        (b) =>
          (b.onclick = () => {
            selected = b.dataset.date;
            selectedEvent = '';
            paint();
          }),
      );
      root.querySelectorAll('[data-event-id]').forEach(
        (b) =>
          (b.onclick = () => {
            selectedEvent = b.dataset.eventId;
            const e = filtered().find((x) => x.id === selectedEvent);
            if (e) selected = e.date;
            paint();
          }),
      );
      root.querySelector('#recordPeriod').onchange = (e) => {
        period = e.target.value;
        classId = '';
        const next = filtered();
        anchor = defaultDate(next, model);
        selected = anchor;
        selectedEvent = '';
        paint();
      };
      root.querySelector('#recordClass').onchange = (e) => {
        classId = e.target.value;
        const next = filtered();
        if (!next.some((x) => x.date === selected)) {
          anchor = defaultDate(next, model);
          selected = anchor;
        }
        selectedEvent = '';
        paint();
      };
      root.querySelector('#calendarToday').onclick = () => {
        anchor = selected = today();
        selectedEvent = '';
        paint();
      };
      root.querySelector('#calendarJump').onchange = (e) => {
        if (!/^\d{4}-\d{2}-\d{2}$/.test(e.target.value) || Number.isNaN(+date(e.target.value)))
          return;
        anchor = selected = e.target.value;
        selectedEvent = '';
        paint();
      };
      root.querySelectorAll('[data-unavailable-report]').forEach(
        (button) =>
          (button.onclick = () => {
            const dialog = document.getElementById('scheduleReportDialog');
            dialog.querySelector('p').textContent =
              button.dataset.unavailableReport +
              '尚未生成学情报告，请使用 AI 工具 上传对应课节的录课或录音生成学情报告。';
            dialog.showModal();
          }),
      );
      root.querySelectorAll('[data-unavailable-report]').forEach(
        (card) =>
          (card.onkeydown = (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              card.click();
            }
          }),
      );
    }
    if (!document.getElementById('scheduleReportDialog')) {
      const dialog = document.createElement('dialog');
      dialog.id = 'scheduleReportDialog';
      dialog.innerHTML =
        '<h2>暂无课节报告</h2><p>这节课尚未生成报告，请使用 AI 工具 生成后查看。</p><form method="dialog"><button class="button primary">知道了</button></form>';
      document.body.append(dialog);
    }
    paint();
  },
};

export const ProductCalendar = window.ProductCalendar;
