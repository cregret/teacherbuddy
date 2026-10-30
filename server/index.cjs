const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const { createHash, timingSafeEqual } = require('node:crypto');
const { keyFrom, openStore } = require('./store.cjs');
const ROOT = path.resolve(__dirname, '..');
if (fs.existsSync(path.join(ROOT, '.env'))) process.loadEnvFile(path.join(ROOT, '.env'));
const password = process.env.ADMIN_PASSWORD;
if (!password || password.length < 16)
  throw Error('Set ADMIN_PASSWORD (at least 16 characters); run npm run setup');
const directory = path.resolve(process.env.DATA_DIR || path.join(ROOT, 'data'));
const localPreview = process.argv.includes('--preview');
const lock = path.join(directory, 'server.lock');
fs.mkdirSync(directory, { recursive: true, mode: 0o700 });
if (fs.existsSync(lock)) {
  const previous = fs.readFileSync(lock, 'utf8');
  const pid = Number(previous);
  let alive = true;
  if (Number.isSafeInteger(pid) && pid > 0) {
    try {
      process.kill(pid, 0);
    } catch (error) {
      if (error.code === 'ESRCH') alive = false;
    }
  } else alive = false;
  if (!alive && fs.readFileSync(lock, 'utf8') === previous) fs.unlinkSync(lock);
}
try {
  fs.writeFileSync(lock, String(process.pid), { flag: 'wx', mode: 0o600 });
} catch (error) {
  if (error.code === 'EEXIST')
    throw Error('TeacherBuddy is already running. Open the existing preview instead.');
  throw error;
}
function unlock() {
  try {
    if (fs.readFileSync(lock, 'utf8') === String(process.pid)) fs.unlinkSync(lock);
  } catch {}
}
process.on('exit', unlock);
const store = openStore(
  directory,
  keyFrom(process.env.DATA_KEY),
  require('../examples/empty.json'),
);
const digest = (value) => createHash('sha256').update(value).digest();
const manifestPath = path.join(__dirname, 'public-files.json');
let publicFiles = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
let manifestVersion = fs.statSync(manifestPath).mtimeMs;
function resolvePublicFile(file) {
  const modified = fs.statSync(manifestPath).mtimeMs;
  if (modified !== manifestVersion) {
    publicFiles = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
    manifestVersion = modified;
  }
  return Object.hasOwn(publicFiles, file) ? publicFiles[file] : null;
}
const publicRoot = path.join(ROOT, 'public');
const mime = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
};
const failCounts = new Map();
function authorized(req) {
  const hostname = (req.headers.host || '').split(':')[0];
  if (
    localPreview &&
    ['127.0.0.1', '::1', '::ffff:127.0.0.1'].includes(req.socket.remoteAddress) &&
    ['127.0.0.1', 'localhost'].includes(hostname)
  )
    return true;
  const auth = req.headers.authorization || '';
  if (!auth.startsWith('Basic ')) return false;
  const credentials = Buffer.from(auth.slice(6), 'base64').toString('utf8');
  return timingSafeEqual(digest(credentials), digest('admin:' + password));
}
function json(res, status, value) {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify(value));
}
async function body(req) {
  const parts = [];
  let size = 0;
  for await (const chunk of req) {
    size += chunk.length;
    if (size > 2 * 1024 * 1024) {
      const e = Error('Request too large');
      e.status = 413;
      throw e;
    }
    parts.push(chunk);
  }
  try {
    return JSON.parse(Buffer.concat(parts).toString('utf8'));
  } catch {
    const e = Error('Invalid JSON');
    e.status = 400;
    throw e;
  }
}
const server = http.createServer(async (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'same-origin');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  try {
    const url = new URL(req.url, 'http://localhost');
    if (url.pathname === '/api/health' && req.method === 'GET')
      return json(res, 200, { ok: true, preview: localPreview });
    const ip = req.socket.remoteAddress,
      failed = failCounts.get(ip);
    if (failed && failed.until > Date.now() && failed.count >= 20)
      return json(res, 429, { error: 'Too many login attempts. Try again later.' });
    if (!authorized(req)) {
      const old =
        failed && failed.until > Date.now() ? failed : { count: 0, until: Date.now() + 60000 };
      old.count++;
      failCounts.set(ip, old);
      if (failCounts.size > 1000)
        for (const [k, v] of failCounts) if (v.until < Date.now()) failCounts.delete(k);
      res.setHeader('WWW-Authenticate', 'Basic realm="TeacherBuddy", charset="UTF-8"');
      return json(res, 401, { error: 'Authentication required' });
    }
    failCounts.delete(ip);
    if (req.method === 'PUT') {
      const origin = req.headers.origin;
      if (
        req.headers['sec-fetch-site'] === 'cross-site' ||
        (origin && new URL(origin).host !== req.headers.host)
      )
        return json(res, 403, { error: 'Cross-origin writes are forbidden' });
      if (!req.headers['content-type']?.startsWith('application/json'))
        return json(res, 415, { error: 'JSON required' });
      if (!url.pathname.startsWith('/api/state/')) return json(res, 404, { error: 'Not found' });
      const key = decodeURIComponent(url.pathname.slice('/api/state/'.length));
      if (!/^(teacherbuddy[._]|buddy_)[a-zA-Z0-9_.:-]{1,180}$/.test(key))
        return json(res, 400, { error: 'Invalid state key' });
      const input = await body(req),
        data = store.read();
      if (
        typeof input.value !== 'string' ||
        input.value.length > 1500000 ||
        !Number.isSafeInteger(input.revision)
      )
        return json(res, 400, { error: 'Invalid state value or revision' });
      const revision = data.state[key]?.revision || 0;
      if (input.revision !== revision)
        return json(res, 409, {
          error: 'This record changed in another window. Reload before editing.',
        });
      data.state[key] = { value: input.value, revision: revision + 1 };
      store.commit(data);
      return json(res, 200, { revision: revision + 1 });
    }
    if (req.method !== 'GET' && req.method !== 'HEAD')
      return json(res, 405, { error: 'Method not allowed' });
    const data = store.view();
    if (url.pathname === '/api/model') return json(res, 200, data.model);
    if (url.pathname === '/api/state') return json(res, 200, data.state);
    if (url.pathname === '/api/workspace') return json(res, 200, data.workspace);
    if (url.pathname === '/api/learning') return json(res, 200, data.learning || {});
    let file = decodeURIComponent(url.pathname).replace(/^\//, '') || 'index.html';
    if (Object.hasOwn(data.resources, file)) {
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      return res.end(req.method === 'HEAD' ? '' : data.resources[file]);
    }
    const target = resolvePublicFile(file);
    if (!target) return json(res, 404, { error: 'Not found' });
    res.writeHead(200, {
      'Content-Type': mime[path.extname(target)] || 'application/octet-stream',
    });
    res.end(req.method === 'HEAD' ? undefined : fs.readFileSync(path.join(publicRoot, target)));
  } catch (e) {
    console.error(e.message);
    if (!res.headersSent)
      json(res, e.status || 500, { error: e.status ? e.message : 'Storage or server error' });
    else res.end();
  }
});
for (const signal of ['SIGINT', 'SIGTERM'])
  process.on(signal, () => server.close(() => process.exit(0)));
server.on('error', (e) => {
  console.error(e.message);
  process.exit(1);
});
const host = localPreview ? '127.0.0.1' : process.env.HOST || '127.0.0.1';
server.listen(Number(process.env.PORT || 3000), host, () =>
  console.log('TeacherBuddy: http://' + host + ':' + server.address().port),
);
