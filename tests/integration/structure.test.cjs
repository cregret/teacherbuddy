const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const postcss = require('postcss');
const root = path.resolve(__dirname, '../..');

function files(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const file = path.join(directory, entry.name);
    return entry.isDirectory() ? files(file) : [file];
  });
}

test('frontend sources have owned directories and resolvable imports', () => {
  assert(!fs.readdirSync(root).some((name) => /\.(?:js|css|html)$/.test(name)));
  for (const file of files(path.join(root, 'src'))) {
    const text = fs.readFileSync(file, 'utf8');
    if (file.endsWith('.js')) {
      for (const match of text.matchAll(/\bimport\s+(?:[^;]*?\sfrom\s+)?['"](\.[^'"]+)['"]/g)) {
        assert(
          fs.existsSync(path.resolve(path.dirname(file), match[1])),
          'Broken import in ' + file,
        );
      }
    } else if (file.endsWith('.css')) {
      const stylesheet = postcss.parse(text, { from: file });
      stylesheet.walkRules((rule) => {
        assert(rule.nodes.length, 'Empty style rule in ' + file);
        if (!file.includes(path.sep + 'reports' + path.sep)) {
          assert(
            !/\.student-(?:directory|snapshot|current)[\w-]*/.test(rule.selector),
            'Retired student styles in ' + file,
          );
        }
      });
      stylesheet.walkAtRules('import', (rule) => {
        const target = rule.params.match(/['"]([^'"]+)['"]/)?.[1];
        assert(
          target && fs.existsSync(path.resolve(path.dirname(file), target)),
          'Broken CSS import in ' + file,
        );
      });
    }
  }
});

test('generated JavaScript chunks resolve through the static route manifest', () => {
  const manifest = require('../../server/public-files.json');
  for (const file of new Set(Object.values(manifest))) {
    if (!file.endsWith('.js')) continue;
    const source = fs.readFileSync(path.join(root, 'public', file), 'utf8');
    for (const match of source.matchAll(/(?:\bfrom|\bimport)\s*['"](\.[^'"]+)['"]/g)) {
      const target = path.posix.normalize(path.posix.join(path.posix.dirname(file), match[1]));
      assert(Object.hasOwn(manifest, target), 'Missing generated chunk ' + target);
    }
  }
});
