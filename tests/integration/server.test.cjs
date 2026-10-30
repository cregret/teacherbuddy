const { test } = require('node:test'),
  assert = require('node:assert/strict');
const fs = require('node:fs'),
  os = require('node:os'),
  path = require('node:path'),
  { randomBytes } = require('node:crypto'),
  { spawn } = require('node:child_process');
test(
  'server enforces authentication, resource whitelist, origin protection and revision conflicts',
  { timeout: 20000 },
  async () => {
    const base = path.resolve(__dirname, '../../.cache/test-results');
    fs.mkdirSync(base, { recursive: true });
    const dir = fs.mkdtempSync(path.join(base, 'http-')),
      password = randomBytes(24).toString('hex');
    const child = spawn(process.execPath, ['server/index.cjs'], {
      cwd: path.resolve(__dirname, '../..'),
      windowsHide: true,
      env: {
        ...process.env,
        PORT: '0',
        HOST: '127.0.0.1',
        DATA_DIR: dir,
        DATA_KEY: randomBytes(32).toString('hex'),
        ADMIN_PASSWORD: password,
      },
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    let error = '';
    child.stderr.on('data', (d) => (error += d));
    try {
      // Query the actual ephemeral port printed by the server.
      const address = await new Promise((resolve, reject) => {
        child.stdout.on('data', (d) => {
          const m = String(d).match(/http:\/\/[^\s]+/);
          if (m) resolve(m[0]);
        });
        child.on('exit', () => reject(Error(error)));
      });
      const auth = {
        Authorization: 'Basic ' + Buffer.from('admin:' + password).toString('base64'),
      };
      assert.equal((await fetch(address + '/api/model')).status, 401);
      assert.equal((await fetch(address + '/.env', { headers: auth })).status, 404);
      assert.equal(
        (await fetch(address + '/data/workspace.enc.json', { headers: auth })).status,
        404,
      );
      assert.equal((await fetch(address + '/examples/demo.json', { headers: auth })).status, 404);
      assert.equal((await fetch(address + '/index.html', { headers: auth })).status, 200);
      assert.equal(
        (await (await fetch(address + '/api/model', { headers: auth })).json()).classes.length,
        0,
      );
      const put = (value, revision, extra = {}) =>
        fetch(address + '/api/state/teacherbuddy.test', {
          method: 'PUT',
          headers: { ...auth, 'Content-Type': 'application/json', ...extra },
          body: JSON.stringify({ value, revision }),
        });
      assert.equal((await put('one', 0, { Origin: 'https://other.invalid' })).status, 403);
      assert.equal((await put('one', 0)).status, 200);
      assert.equal((await put('stale', 0)).status, 409);
      assert.equal((await put('two', 1)).status, 200);
      assert.equal(
        (await (await fetch(address + '/api/state', { headers: auth })).json())['teacherbuddy.test']
          .value,
        'two',
      );
    } finally {
      child.kill();
      await new Promise((r) => (child.exitCode !== null ? r() : child.once('exit', r)));
      fs.rmSync(dir, { recursive: true, force: true });
    }
  },
);
