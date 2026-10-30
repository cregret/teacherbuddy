const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const root = path.resolve(__dirname, '..');
const destination = path.join(root, 'dist');
if (path.dirname(destination) !== root || path.basename(destination) !== 'dist')
  throw Error('Invalid build directory');
fs.rmSync(destination, { recursive: true, force: true });
execFileSync(process.execPath, ['scripts/build.cjs'], {
  cwd: root,
  env: { ...process.env, TEACHERBUDDY_DEMO: '1' },
  stdio: 'inherit',
});
function copy(directory) {
  for (const item of fs.readdirSync(directory, { withFileTypes: true })) {
    const source = path.join(directory, item.name);
    const relative = path.relative(path.join(root, 'public'), source).replaceAll(path.sep, '/');
    if (relative === 'assets/js' || relative === 'assets/css') continue;
    if (item.isDirectory()) copy(source);
    else {
      const target = path.join(
        destination,
        relative.startsWith('pages/') ? relative.slice(6) : relative,
      );
      fs.mkdirSync(path.dirname(target), { recursive: true });
      fs.copyFileSync(source, target);
    }
  }
}
copy(path.join(root, 'public'));
// The public deployment has exactly one data source: the repository's synthetic fixture.
const data = structuredClone(require('../examples/demo.json'));
data.model.snapshot = '合成演示数据';
data.model.leads = [
  {
    id: 'demo-lead-1',
    name: '示例咨询家长',
    source: '体验课',
    status: '有意向',
    signal: '希望了解分数专题课安排',
    nextStep: '确认适合的上课时间',
    contactHistory: [{ date: '2026-10-25', text: '已介绍每周课程安排，等待家长确认。' }],
  },
];
const archived = structuredClone(data.model.classes[0]);
archived.id = 'demo-archived-class';
archived.label = archived.name = '已归档示例班';
archived.status = 'archived';
archived.members = [];
data.model.classes.push(archived);
fs.mkdirSync(path.join(destination, 'api'), { recursive: true });
for (const [name, value] of Object.entries({
  model: data.model,
  workspace: data.workspace,
  learning: data.learning,
  state: {},
  health: { ok: true, demo: true },
})) {
  fs.writeFileSync(path.join(destination, 'api', name + '.json'), JSON.stringify(value));
}
fs.copyFileSync(
  path.join(destination, 'assets/images/logo.svg'),
  path.join(destination, 'demo-logo.svg'),
);
console.log(
  'Vercel demo prepared with synthetic data only. No server, credentials or workspace files copied.',
);
