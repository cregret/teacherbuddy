const fs = require('node:fs');
const path = require('node:path');
const { spawn } = require('node:child_process');
const { randomBytes } = require('node:crypto');
const { chromium } = require('@playwright/test');
const { keyFrom, openStore } = require('../../server/store.cjs');

const root = path.resolve(__dirname, '../..');
const results = path.join(root, '.cache/test-results');

async function startFixture({ current = false, fixture } = {}) {
  process.chdir(root);
  if (fs.existsSync('.env')) process.loadEnvFile('.env');
  fs.mkdirSync(results, { recursive: true });
  fixture ||= current
    ? openStore(
        path.resolve(process.env.DATA_DIR || 'data'),
        keyFrom(process.env.DATA_KEY),
        {},
      ).read()
    : structuredClone(require('../../examples/demo.json'));
  const directory = fs.mkdtempSync(path.join(results, 'browser-'));
  const key = randomBytes(32);
  openStore(directory, key, fixture);
  const child = spawn(process.execPath, ['server/index.cjs', '--preview'], {
    cwd: root,
    env: {
      ...process.env,
      DATA_DIR: directory,
      DATA_KEY: key.toString('hex'),
      ADMIN_PASSWORD: randomBytes(24).toString('hex'),
      PORT: '0',
    },
    windowsHide: true,
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  let diagnostics = '';
  child.stderr.on('data', (data) => (diagnostics += data));
  const base = await new Promise((resolve, reject) => {
    child.stdout.on('data', (data) => {
      const match = String(data).match(/http:\/\/\S+/);
      if (match) resolve(match[0]);
    });
    child.once('exit', () => reject(Error(diagnostics)));
    child.once('error', reject);
  });
  return {
    root,
    results,
    fixture,
    base,
    async close() {
      child.kill();
      await new Promise((resolve) =>
        child.exitCode !== null ? resolve() : child.once('exit', resolve),
      );
      fs.rmSync(directory, { recursive: true, force: true });
    },
  };
}

function launchBrowser() {
  return chromium.launch({
    channel: process.env.BROWSER_CHANNEL || (process.platform === 'win32' ? 'msedge' : 'chromium'),
    headless: true,
  });
}

module.exports = { root, results, startFixture, launchBrowser };
