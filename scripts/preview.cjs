const fs = require('node:fs'),
  path = require('node:path'),
  { spawn, execFileSync } = require('node:child_process');
const root = path.resolve(__dirname, '..');
process.chdir(root);
if (!fs.existsSync('.env'))
  execFileSync(process.execPath, ['scripts/setup.cjs'], { stdio: 'inherit' });
process.loadEnvFile('.env');
const port = Number(process.env.PORT || 3000),
  url = 'http://127.0.0.1:' + port + '/';
function openBrowser() {
  console.log('Preview: ' + url + ' (no login required on this computer)');
  if (process.argv.includes('--no-open')) return;
  const command =
    process.platform === 'win32' ? 'rundll32' : process.platform === 'darwin' ? 'open' : 'xdg-open';
  const args = process.platform === 'win32' ? ['url.dll,FileProtocolHandler', url] : [url];
  const browser = spawn(command, args, { detached: true, stdio: 'ignore', windowsHide: true });
  browser.on('error', () => console.log('Open ' + url + ' in your browser.'));
  browser.unref();
}
(async () => {
  let health;
  try {
    const r = await fetch(url + 'api/health', { signal: AbortSignal.timeout(1000) });
    if (r.ok) health = await r.json();
  } catch {}
  if (health?.ok) {
    if (health.preview) {
      openBrowser();
      return;
    }
    throw Error(
      'A password-protected service is already running at ' +
        url +
        '. Stop it before starting local preview.',
    );
  }
  const child = spawn(process.execPath, ['server/index.cjs', '--preview'], {
    cwd: root,
    stdio: ['inherit', 'pipe', 'inherit'],
    windowsHide: true,
  });
  let opened = false;
  child.stdout.on('data', (data) => {
    process.stdout.write(data);
    if (!opened && String(data).includes('TeacherBuddy:')) {
      opened = true;
      openBrowser();
    }
  });
  child.on('error', (error) => {
    console.error(error.message);
    process.exitCode = 1;
  });
  child.on('exit', (code) => {
    process.exitCode = code || 0;
  });
  for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => child.kill(signal));
})().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
