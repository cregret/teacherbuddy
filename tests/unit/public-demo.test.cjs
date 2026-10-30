const { test } = require('node:test');
const assert = require('node:assert/strict');
const { sanitizeDemo } = require('../../scripts/create-public-demo.cjs');

test('public fixture anonymizes linked identities, contact information and serialized state', () => {
  const source = {
    model: {
      students: [{ id: 'student-测试姓名', name: '测试姓名' }],
      classes: [{ members: [{ studentId: 'student-测试姓名', name: '测试姓名' }] }],
      leads: [{ id: 'lead-1', name: '咨询姓名' }],
    },
    learning: { 测试姓名: { name: '测试姓名', phone: '13812345678' } },
    resources: {
      'students/测试姓名.html':
        '<p>测试姓名 13812345678 a@example.com</p><script>secret()</script>',
    },
    state: {
      'teacherbuddy.test': {
        value: JSON.stringify({ name: '测试姓名', email: 'a@example.com' }),
        revision: 1,
      },
    },
  };
  const result = sanitizeDemo(source);
  const text = JSON.stringify(result);
  for (const value of ['测试姓名', '咨询姓名', '13812345678', 'a@example.com', 'secret()'])
    assert(!text.includes(value));
  assert.equal(result.model.students[0].id, result.model.classes[0].members[0].studentId);
  assert.equal(
    result.model.students[0].name,
    JSON.parse(result.state['teacherbuddy.test'].value).name,
  );
  assert.equal(source.model.students[0].name, '测试姓名');
});

test('complete public demo keeps class, student, learning and finance relationships', () => {
  const data = require('../../examples/public-demo.json');
  const ids = new Set(data.model.students.map((s) => s.id));
  assert.equal(ids.size, 74);
  assert.equal(data.model.classes.length, 9);
  for (const cls of data.model.classes) {
    for (const member of cls.members) {
      assert(ids.has(member.studentId));
      const student = data.model.students.find((s) => s.id === member.studentId);
      assert.equal(student.name, member.name);
      assert(student.classIds.includes(cls.id));
    }
  }
  for (const f of data.workspace.focus) assert(ids.has(f.studentId));
  const finance = JSON.parse(data.state['teacherbuddy.finance.v1'].value);
  assert.equal(finance.accounts.length, 71);
  for (const a of finance.accounts) assert(ids.has(a.studentId));
  assert.equal(Object.keys(data.resources).length, 88);
});
