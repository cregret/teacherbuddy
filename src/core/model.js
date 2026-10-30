import { AppStorage, DataReady } from './storage.js';
import { WorkspaceRecords } from './records.js';
import { mergeTeachingSkills } from '../features/skills/catalog.js';

const version = 'platform1';
const route = (file, params = {}) => file + '?' + new URLSearchParams({ v: version, ...params });
let cached;
async function build() {
  await DataReady;
  const response = await fetch('/api/model', { cache: 'no-store' });
  if (!response.ok) throw Error('数据读取失败');
  const model = await response.json();
  model.skills = mergeTeachingSkills(model.skills);
  window.MarketingArticles = model.marketingArticles || [];
  return WorkspaceRecords.apply(model);
}
window.Product = {
  version,
  route,
  classLink: (id, tab) => route('class-detail.html', { id, ...(tab ? { tab } : {}) }),
  studentLink: (id) => route('student-detail.html', { id }),
  snapshotLink: (file) => 'source-records/' + file,
  load: (fresh = false) => {
    if (fresh || !cached)
      cached = build().catch((error) => {
        cached = null;
        throw error;
      });
    return cached;
  },
  safeStorage: (key, fallback) => {
    try {
      return JSON.parse(AppStorage.getItem(key) || 'null') ?? fallback;
    } catch {
      return fallback;
    }
  },
};

export const Product = window.Product;
