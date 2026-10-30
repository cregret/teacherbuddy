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
// Public builds only read the reviewed, anonymized fixture; never read the local encrypted store.
const data = structuredClone(require('../examples/public-demo.json'));
fs.mkdirSync(path.join(destination, 'api'), { recursive: true });
for (const [name, value] of Object.entries({
  model: data.model,
  workspace: data.workspace,
  learning: data.learning,
  state: data.state,
  health: { ok: true, demo: true },
})) {
  fs.writeFileSync(path.join(destination, 'api', name + '.json'), JSON.stringify(value));
}
for (const [name, html] of Object.entries(data.resources)) {
  const target = path.resolve(destination, name);
  if (
    !target.startsWith(destination + path.sep) ||
    !/^(students|class|source-records)\/.+\.html$/.test(name)
  )
    throw Error('Invalid public report path');
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, html);
}
fs.copyFileSync(
  path.join(destination, 'assets/images/logo.svg'),
  path.join(destination, 'demo-logo.svg'),
);
console.log(
  'Vercel demo prepared from reviewed anonymized test fixture. No local store or credentials copied.',
);
