const KEY = 'teacherbuddy.public-demo.v1';

export function demoStateRequest(url, options = {}) {
  if (!url.startsWith('/api/state')) throw Error('Unsupported demo operation');
  const state = JSON.parse(sessionStorage.getItem(KEY) || '{}');
  if (!options.method || options.method === 'GET') return Promise.resolve(state);
  const key = decodeURIComponent(url.slice('/api/state/'.length));
  const input = JSON.parse(options.body);
  if ((state[key]?.revision || 0) !== input.revision) throw Error('演示记录已变化，请刷新后重试');
  state[key] = { value: input.value, revision: input.revision + 1 };
  sessionStorage.setItem(KEY, JSON.stringify(state));
  return Promise.resolve({ revision: input.revision + 1 });
}
