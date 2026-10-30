import { Product } from '../../core/model.js';

const ended = (l) => !!l && ['recorded', 'archived'].includes(l.status);
const hasReport = (c, l) =>
  !!(
    l &&
    (l.report ||
      (c.periodId === 'autumn' &&
        c.brief?.href &&
        Number(c.brief.label.match(/第\s*(\d+)\s*讲/)?.[1]) === Number(l.number)))
  );
function report(c, l) {
  const previous = !ended(l),
    target = previous
      ? [...c.lessons]
          .filter((x) => Number(x.number) < Number(l.number))
          .sort((a, b) => b.number - a.number)[0]
      : l;
  const has = hasReport(c, target);
  return {
    previous,
    target,
    has,
    url: has ? Product.route('lesson-share.html', { class: c.id, lesson: target.number }) : '',
    label: previous ? '回顾本班上一讲' : has ? '课节报告' : '暂无报告',
  };
}
function render(c, l) {
  if (!l) return '';
  const has = hasReport(c, l);
  return (
    '<span class="lesson-state-set"><span class="lesson-completion">' +
    (ended(l) ? '已完成' : '未开始') +
    '</span>' +
    (ended(l)
      ? '<span class="lesson-report-state ' +
        (has ? 'available' : 'unavailable') +
        '">' +
        (has ? '有课节报告' : '暂无课节报告') +
        '</span>'
      : '<span class="lesson-preparation">' + (l.prepared ? '已备课' : '待备课') + '</span>') +
    '</span>'
  );
}
const label = (l) => l?.label || '第 ' + String(l?.number || 0).padStart(2, '0') + ' 讲';
window.LessonState = { render, label, prepared: (c, l) => !!l?.prepared, ended, report, hasReport };

export const LessonState = window.LessonState;
