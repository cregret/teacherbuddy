import { Product } from '../../core/model.js';
import { TeacherbuddyReading } from './lesson-view.js';

const params = new URLSearchParams(location.search);
const classId = params.get('class') || '';
const lessonNo = Number(params.get('lesson')) || 0;
const title = document.getElementById('shareTitle');
const meta = document.getElementById('shareMeta');
const host = document.getElementById('shareBrief');
const error = document.getElementById('shareError');
const copy = document.getElementById('copyShareUrl');
const showError = (message) => {
  error.textContent = message;
  error.hidden = false;
  host.hidden = true;
  title.textContent = '暂时无法打开这份简报';
};
try {
  if (!classId || !lessonNo) throw Error('分享链接缺少班级或课次信息。');
  const model = await Product.load();
  const cls = model.classes.find((c) => c.id === classId);
  const reportNo = Number(cls?.brief?.label?.match(/第\s*(\d+)\s*讲/)?.[1] || 0);
  const lesson = cls?.lessons.find((item) => Number(item.number) === lessonNo);
  if (
    !cls ||
    !lesson ||
    (!lesson.report && (!cls.brief?.href || reportNo !== lessonNo || cls.periodId !== 'autumn'))
  )
    throw Error('没有找到这节课对应的简报。');
  title.textContent = cls.label + ' · 第 ' + String(lessonNo).padStart(2, '0') + ' 讲';
  meta.textContent = [lesson?.date, lesson?.time].filter(Boolean).join(' · ') || cls.brief.label;
  if (lesson.report) TeacherbuddyReading.mountRecord(host, cls, lesson, true);
  else await TeacherbuddyReading.mount(host, cls.brief.href);
  copy.hidden = false;
  copy.onclick = async () => {
    try {
      await navigator.clipboard.writeText(location.href);
      copy.textContent = '链接已复制';
    } catch {
      copy.textContent = '请从地址栏复制链接';
    }
  };
} catch (e) {
  showError(e.message || '简报暂时无法读取，请联系老师重新分享链接。');
}
