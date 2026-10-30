const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { spawn, execFileSync } = require('node:child_process');
const { randomBytes } = require('node:crypto');

// Run against a freshly extracted release, never against the teacher's workspace.
(async () => {
  const root = path.resolve(__dirname, '../..');
  const directory = path.join(root, '.cache/release-smoke/teacherbuddy');
  assert(
    fs.existsSync(path.join(directory, 'server/index.cjs')),
    'Extract teacherbuddy.zip into .cache/release-smoke first',
  );
  assert(!fs.existsSync(path.join(directory, 'node_modules')));
  execFileSync(process.execPath, ['scripts/setup.cjs'], { cwd: directory, stdio: 'pipe' });
  assert(fs.existsSync(path.join(directory, '.env')));
  const data = fs.mkdtempSync(path.join(root, '.cache/release-smoke/data-'));
  const child = spawn(process.execPath, ['server/index.cjs', '--preview'], {
    cwd: directory,
    env: {
      ...process.env,
      PORT: '0',
      HOST: '127.0.0.1',
      DATA_DIR: data,
      DATA_KEY: randomBytes(32).toString('hex'),
      ADMIN_PASSWORD: randomBytes(24).toString('hex'),
    },
    windowsHide: true,
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  let diagnostics = '';
  child.stderr.on('data', (value) => (diagnostics += value));
  try {
    const base = await new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(Error('Packaged server startup timed out')), 10000);
      child.stdout.on('data', (value) => {
        const match = String(value).match(/http:\/\/\S+/);
        if (match) {
          clearTimeout(timer);
          resolve(match[0]);
        }
      });
      child.on('error', (error) => {
        clearTimeout(timer);
        reject(error);
      });
      child.on('exit', () => {
        clearTimeout(timer);
        reject(Error(diagnostics));
      });
    });
    const model = await (await fetch(base + '/api/model')).json();
    assert.equal(model.classes.length, 0);
    assert.equal(model.students.length, 0);
    const manifest = JSON.parse(
      fs.readFileSync(path.join(directory, 'server/public-files.json'), 'utf8'),
    );
    for (const route of [
      '/',
      '/getting-started.html',
      '/zhiling.html',
      '/assets/css/getting-started.css',
      '/assets/images/guides/classroom.png',
      ...Object.keys(manifest)
        .filter((p) => p.endsWith('.js'))
        .map((p) => '/' + p),
    ]) {
      const response = await fetch(base + route);
      assert.equal(response.status, 200, route);
    }
    console.log(
      'PASS clean release starts without node_modules, creates empty private workspace and serves onboarding and built resources',
    );
  } finally {
    child.kill();
    await new Promise((resolve) =>
      child.exitCode !== null ? resolve() : child.once('exit', resolve),
    );
  }
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
