const { test } = require('node:test'),
  assert = require('node:assert/strict'),
  fs = require('node:fs'),
  path = require('node:path'),
  { execFileSync } = require('node:child_process');
test('release allowlist excludes private data and includes every entry-point resource', () => {
  const root = path.resolve(__dirname, '../..');
  const files = JSON.parse(
    execFileSync(process.execPath, ['scripts/package.cjs'], { cwd: root, encoding: 'utf8' }),
  );
  assert(!files.includes('.env'));
  assert(
    !files.some(
      (f) => f.startsWith('data/') || f.startsWith('test-results/') || f.startsWith('.migration-'),
    ),
  );
  const publicFiles = require('../../server/public-files.json');
  for (const file of new Set(Object.values(publicFiles))) {
    assert(files.includes('public/' + file));
    if (!file.endsWith('.html')) continue;
    const html = fs.readFileSync(path.join(root, 'public', file), 'utf8');
    for (const match of html.matchAll(
      /(?:src|href)="([^"?#]+\.(?:js|css|svg|jpg|png))(?:[?#][^"]*)?"/g,
    ))
      assert(
        Object.hasOwn(publicFiles, match[1].replace(/^\//, '')),
        file + ' references missing resource ' + match[1],
      );
  }
});
