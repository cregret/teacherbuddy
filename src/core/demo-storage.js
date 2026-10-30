const KEY = 'teacherbuddy.public-demo.v2';

export async function demoStateRequest(url, options = {}) {
  if (!url.startsWith('/api/state')) throw Error('Unsupported demo operation');
  let saved = sessionStorage.getItem(KEY);
  if (!saved) {
    const response = await fetch('/api/state', { cache: 'no-store' });
    if (!response.ok) throw Error('演示初始记录加载失败');
    saved = JSON.stringify(await response.json());
    sessionStorage.setItem(KEY, saved);
  }
  const state = JSON.parse(saved);
  if (!options.method || options.method === 'GET') return Promise.resolve(state);
  const key = decodeURIComponent(url.slice('/api/state/'.length));
  const input = JSON.parse(options.body);
  if ((state[key]?.revision || 0) !== input.revision) throw Error('演示记录已变化，请刷新后重试');
  state[key] = { value: input.value, revision: input.revision + 1 };
  sessionStorage.setItem(KEY, JSON.stringify(state));
  return Promise.resolve({ revision: input.revision + 1 });
}
