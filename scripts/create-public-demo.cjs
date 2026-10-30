const fs = require('node:fs');
const path = require('node:path');

function sanitizeDemo(source) {
  const substitutions = new Map();
  const identities = new Map();
  function identity(name, prefix) {
    if (typeof name !== 'string' || !name.trim()) return;
    if (!identities.has(name))
      identities.set(name, prefix + String(identities.size + 1).padStart(2, '0'));
  }
  source.model.students.forEach((s) => identity(s.name, '学员'));
  source.model.classes.forEach((c) => c.members.forEach((s) => identity(s.name, '学员')));
  Object.keys(source.learning || {}).forEach((name) => identity(name, '学员'));
  source.model.leads.forEach((s) => identity(s.name, '咨询学员'));
  function remember(from, to) {
    if (!from || from === to) return;
    substitutions.set(from, to);
    substitutions.set(encodeURIComponent(from), encodeURIComponent(to));
    substitutions.set([...from].map((c) => '&#' + c.codePointAt(0) + ';').join(''), to);
  }
  source.model.students.forEach((s, index) => remember(s.id, 'public-student-' + (index + 1)));
  source.model.leads.forEach((s, index) => remember(s.id, 'public-lead-' + (index + 1)));
  for (const [name, alias] of identities) remember(name, alias);
  const escape = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const pattern = new RegExp(
    [...substitutions.keys()]
      .sort((a, b) => b.length - a.length)
      .map(escape)
      .join('|'),
    'g',
  );
  function text(value) {
    return value
      .replace(pattern, (match) => substitutions.get(match))
      .replace(/(?<!\d)(?:\+?86[- ]?)?1[3-9]\d{9}(?!\d)/g, '联系方式已隐藏')
      .replace(/(?<!\d)\d{17}[\dXx](?!\w)/g, '证件信息已隐藏')
      .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, '邮箱已隐藏')
      .replace(/[A-Z]:[\\/][^\s"<>\r\n]+/gi, '本地路径已隐藏')
      .replace(/https?:\/\/[^\s"'<>\\)]+/gi, '#')
      .replace(/<script\b[^>]*>[\s\S]*?<\/script\s*>/gi, '')
      .replace(/\s+on\w+\s*=\s*(?:"[^"]*"|'[^']*')/gi, '');
  }
  function walk(value) {
    if (typeof value === 'string') return text(value);
    if (Array.isArray(value)) return value.map(walk);
    if (value && typeof value === 'object') {
      return Object.fromEntries(
        Object.entries(value)
          .filter(
            ([key]) =>
              !/^(sourceUrl|phone|mobile|email|address|wechat|contactPhone|parentPhone)$/i.test(
                key,
              ),
          )
          .map(([key, value]) => [text(key), walk(value)]),
      );
    }
    return value;
  }
  const data = walk(source);
  // State values are serialized JSON; scrub their fields as structured data as well.
  for (const record of Object.values(data.state)) {
    if (typeof record.value === 'string') {
      try {
        record.value = JSON.stringify(walk(JSON.parse(record.value)));
      } catch {}
    }
  }
  data.model.snapshot = '完整测试场景 · 已脱敏';
  data.publicDemo = { version: 2, kind: 'anonymized-test-fixture' };
  const serialized = JSON.stringify(data);
  for (const name of identities.keys()) {
    if (serialized.includes(name) || serialized.includes(encodeURIComponent(name)))
      throw Error('Identity remains in public fixture');
  }
  return data;
}

if (require.main === module) {
  if (!process.argv.includes('--from-current-workspace'))
    throw Error('Use --from-current-workspace to explicitly generate the public test fixture');
  const root = path.resolve(__dirname, '..');
  process.loadEnvFile(path.join(root, '.env'));
  const { openStore, keyFrom } = require('../server/store.cjs');
  const directory = path.resolve(root, process.env.DATA_DIR || 'data');
  if (!fs.existsSync(path.join(directory, 'workspace.enc.json')))
    throw Error('Existing workspace required');
  const original = openStore(directory, keyFrom(process.env.DATA_KEY), {}).read();
  const result = sanitizeDemo(original);
  fs.writeFileSync(path.join(root, 'examples/public-demo.json'), JSON.stringify(result));
  console.log(
    JSON.stringify({
      classes: result.model.classes.length,
      students: result.model.students.length,
      lessons: result.workspace.lessons.length,
      leads: result.model.leads.length,
      articles: result.model.marketingArticles.length,
      resources: Object.keys(result.resources).length,
      financeAccounts: JSON.parse(result.state['teacherbuddy.finance.v1'].value).accounts.length,
    }),
  );
}
module.exports = { sanitizeDemo };
