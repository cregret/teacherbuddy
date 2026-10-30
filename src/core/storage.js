import { demoStateRequest } from './demo-storage.js';

const isDemo = typeof __TEACHERBUDDY_DEMO__ !== 'undefined' && __TEACHERBUDDY_DEMO__;
const values = new Map(),
  revisions = new Map();
let pending = Promise.resolve(),
  dirty = 0,
  failed = false;
function indicator(text, error = false) {
  let node = document.getElementById('storageStatus');
  if (!node) {
    node = document.createElement('span');
    node.id = 'storageStatus';
    node.setAttribute('role', 'status');
    node.style.cssText =
      'position:fixed;bottom:12px;right:16px;padding:6px 10px;background:#fff;border:1px solid #dce4ef;border-radius:6px;font:12px system-ui;z-index:100';
    document.body.append(node);
  }
  node.textContent = text;
  node.style.color = error ? '#a12d24' : '#526277';
  node.hidden = !text;
}
async function request(url, options) {
  if (isDemo) return demoStateRequest(url, options);
  const r = await fetch(url, options);
  if (!r.ok) {
    const data = await r.json().catch(() => ({}));
    throw Error(data.error || '服务器保存失败');
  }
  return r.json();
}
window.AppStorage = {
  getItem: (key) => values.get(key) ?? null,
  setItem(key, value) {
    if (failed) throw Error('保存失败，请先刷新并核对记录');
    value = String(value);
    values.set(key, value);
    dirty++;
    indicator('正在保存…');
    pending = pending
      .then(async () => {
        if (failed) throw Error('前一次保存失败');
        const result = await request('/api/state/' + encodeURIComponent(key), {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ value, revision: revisions.get(key) || 0 }),
        });
        revisions.set(key, result.revision);
        dirty--;
        if (!dirty) indicator('');
      })
      .catch((error) => {
        failed = true;
        indicator('未保存：' + error.message + '。请复制修改内容后刷新。', true);
      });
  },
  flush: () =>
    pending.then(() => {
      if (failed) throw Error('服务器保存失败');
    }),
};
window.DataReady = request('/api/state').then((state) => {
  for (const [key, record] of Object.entries(state)) {
    values.set(key, record.value);
    revisions.set(key, record.revision);
  }
});
window.DataReady.catch((error) => indicator('读取失败：' + error.message, true));
window.addEventListener('beforeunload', (event) => {
  if (dirty || failed) {
    event.preventDefault();
    event.returnValue = '';
  }
});
document.addEventListener(
  'click',
  (event) => {
    const link = event.target.closest('a[href]');
    if (!dirty || !link || link.target === '_blank' || event.ctrlKey || event.metaKey) return;
    event.preventDefault();
    pending.then(() => {
      if (!failed) location.href = link.href;
    });
  },
  true,
);

export const AppStorage = window.AppStorage;
export const DataReady = window.DataReady;
