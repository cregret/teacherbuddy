const read = () =>
  fetch('/api/workspace', { cache: 'no-store' }).then((r) => {
    if (!r.ok) throw Error('工作区记录读取失败');
    return r.json();
  });
function latestStudents(data) {
  const students = { ...(data.students || {}) },
    scoped = {};
  for (const records of Object.values(data.classLearning || {}))
    for (const [name, record] of Object.entries(records)) {
      const current = scoped[name];
      if (
        !current ||
        (current.archived && !record.archived) ||
        (Boolean(current.archived) === Boolean(record.archived) &&
          (record.updatedAt || '') > (current.updatedAt || ''))
      )
        scoped[name] = record;
    }
  return { ...students, ...scoped };
}
async function apply(model) {
  const data = await read();
  if (data.schemaVersion !== 1) return model;
  model.classLearning = data.classLearning || {};
  // Give every roster member a stable profile identity, including records without a legacy HTML file.
  for (const cls of model.classes) {
    for (const member of cls.members) {
      let student = model.students.find((s) => s.id === member.studentId || s.name === member.name);
      if (!student && model.classLearning[cls.id]?.[member.name]) {
        student = {
          id: 'student-' + member.name,
          name: member.name,
          profile: '',
          classIds: [],
          sourceClass: cls.label,
          alerts: [],
        };
        model.students.push(student);
      }
      if (student) {
        member.studentId = student.id;
        if (!student.classIds.includes(cls.id)) student.classIds.push(cls.id);
      }
    }
  }
  for (const record of data.lessons || []) {
    const cls = model.classes.find((c) => c.id === record.classId);
    if (!cls) continue;
    let lesson = cls.lessons.find((l) => Number(l.number) === Number(record.number));
    if (!lesson && record.kind === 'supplement' && Number.isFinite(Number(record.number))) {
      lesson = { number: Number(record.number), status: 'scheduled' };
      cls.lessons.push(lesson);
    }
    if (!lesson) continue;
    for (const key of [
      'date',
      'time',
      'location',
      'status',
      'prepared',
      'description',
      'report',
      'label',
      'kind',
      'topic',
      'plan',
      'attendance',
    ])
      if (record[key] !== undefined) lesson[key] = record[key];
  }
  model.focusRecords = (data.focus || []).filter((x) =>
    model.students.some((s) => s.id === x.studentId),
  );
  for (const student of model.students) {
    const signals = model.focusRecords
      .filter((x) => x.studentId === student.id)
      .map((x) => x.category);
    if (signals.length)
      student.alerts = [...new Set([...signals, ...student.alerts.filter((a) => /资料/.test(a))])];
  }
  model.receivedDrafts = data.drafts || [];
  model.receivedLearning = latestStudents(data);
  model.receivedAt = data.updatedAt || '';
  for (const record of data.leads || []) {
    const lead = model.leads.find((l) => l.id === record.id);
    if (lead)
      for (const key of ['priority', 'status', 'signal', 'source', 'contactHistory', 'nextStep'])
        if (record[key] !== undefined) lead[key] = record[key];
  }
  return model;
}
window.WorkspaceRecords = {
  read,
  apply,
  resolve: (model, name, classId) =>
    model.classLearning?.[classId]?.[name] ||
    (!classId || model.receivedLearning?.[name]?.classId === classId
      ? model.receivedLearning?.[name]
      : null),
  learning: async (original) => ({ ...original, ...latestStudents(await read()) }),
};

export const WorkspaceRecords = window.WorkspaceRecords;
