import { AppStorage } from '../../core/storage.js';

export const FOLLOWUPS = 'teacherbuddy.student.followups.v1';
export const PROCESSED = 'teacherbuddy.home.processed-focus.v1';
export const RESOLUTIONS = 'teacherbuddy.student.resolutions.v1';
export const readStudentState = (key, fallback) => {
  try {
    return JSON.parse(AppStorage.getItem(key)) ?? fallback;
  } catch {
    return fallback;
  }
};
export async function saveStudentState(key, value) {
  AppStorage.setItem(key, JSON.stringify(value));
  await AppStorage.flush();
}
export function studentEvents(model, studentId, classId) {
  const processed = new Set(readStudentState(PROCESSED, []));
  const resolutions = readStudentState(RESOLUTIONS, {});
  return [
    ...(model.focusRecords || [])
      .filter((f) => f.studentId === studentId)
      .map((f) => ({
        ...f,
        status: processed.has(f.id) ? 'resolved' : f.status || 'open',
        resolution: resolutions[f.id]?.text || f.resolution || '',
        source: '课堂关注',
        local: false,
      })),
    ...readStudentState(FOLLOWUPS, [])
      .filter((f) => f.studentId === studentId)
      .map((f) => ({ ...f, local: true, source: '教师跟进' })),
  ].filter((f) => classId === undefined || (f.classId || '') === classId);
}
export function scopedLearning(model, student, cls) {
  if (!cls) return null;
  return (
    model.classLearning?.[cls.id]?.[student.name] ||
    (model.receivedLearning?.[student.name]?.classId === cls.id
      ? model.receivedLearning[student.name]
      : null)
  );
}
export function findLearningLesson(cls, row) {
  if (!cls || !row) return null;
  const exact = cls.lessons.filter((l) => l.label === row[0] && l.date === row[1]);
  if (exact.length === 1) return exact[0];
  const number = row[0]?.match(/第\s*(\d+)\s*[讲课节]|L\d+[_-](\d+)/i);
  const candidates = cls.lessons.filter((l) =>
    number ? Number(l.number) === Number(number[1] || number[2]) : l.date === row[1],
  );
  if (candidates.length !== 1) return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(row[1]) && candidates[0].date !== row[1]) return null;
  return candidates[0];
}
