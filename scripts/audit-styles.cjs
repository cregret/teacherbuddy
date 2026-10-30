const fs = require('node:fs');
const path = require('node:path');
const postcss = require('postcss');
const root = path.resolve(__dirname, '..');

function styles(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const file = path.join(directory, entry.name);
    return entry.isDirectory() ? styles(file) : file.endsWith('.css') ? [file] : [];
  });
}

function context(rule) {
  const parts = [];
  for (let node = rule.parent; node?.type !== 'root'; node = node.parent) {
    parts.unshift('@' + node.name + ' ' + node.params);
  }
  return parts.join(' | ');
}

const blocks = new Map();
const selectors = new Map();
let ruleCount = 0;
let declarations = 0;
const files = styles(path.join(root, 'src/styles'));
for (const file of files) {
  const ast = postcss.parse(fs.readFileSync(file, 'utf8'), { from: file });
  ast.walkRules((rule) => {
    ruleCount++;
    const values = rule.nodes
      .filter((node) => node.type === 'decl')
      .map((node) => node.prop + ':' + node.value + (node.important ? '!important' : ''));
    declarations += values.length;
    const record = {
      file: path.relative(root, file).replaceAll(path.sep, '/'),
      line: rule.source.start.line,
      selector: rule.selector,
      context: context(rule),
      declarations: values,
    };
    if (values.length >= 2) {
      const key = record.context + ' | ' + values.join(';');
      if (!blocks.has(key)) blocks.set(key, []);
      blocks.get(key).push(record);
    }
    const key = record.context + ' | ' + rule.selector.replace(/\s+/g, ' ').trim();
    if (!selectors.has(key)) selectors.set(key, []);
    selectors.get(key).push(record);
  });
}

const duplicates = [...blocks.values()]
  .filter((group) => group.length > 1)
  .sort((a, b) => b.length * b[0].declarations.length - a.length * a[0].declarations.length);
const repeatedSelectors = [...selectors.values()]
  .filter((group) => group.length > 1)
  .sort((a, b) => b.length - a.length);
const result = {
  files: files.length,
  rules: ruleCount,
  declarations,
  identicalBlocks: duplicates.length,
  repeatedSelectorGroups: repeatedSelectors.length,
  duplicates,
  repeatedSelectors,
};

if (process.argv.includes('--json')) process.stdout.write(JSON.stringify(result, null, 2) + '\n');
else {
  console.log(
    `${result.files} sources, ${result.rules} rules, ${result.declarations} declarations; ` +
      `${result.identicalBlocks} identical blocks, ${result.repeatedSelectorGroups} repeated selector groups.`,
  );
  console.log('Candidates require cascade and surface review; counts alone are not removal rules.');
  for (const group of duplicates.slice(0, 12)) {
    console.log(group.map((item) => `${item.file}:${item.line} ${item.selector}`).join(' | '));
  }
}
