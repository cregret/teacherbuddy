// Package only owned source folders; never recursively archive the workspace.
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const files = new Set([
  'package.json',
  'package-lock.json',
  '.gitignore',
  '.dockerignore',
  '.env.example',
  '.editorconfig',
  '.prettierrc.json',
  '.prettierignore',
  'Dockerfile',
  'compose.yaml',
  'README.md',
  'LICENSE',
  'AGENTS.md',
  '启动预览.cmd',
]);
function collect(folder) {
  for (const entry of fs.readdirSync(path.join(root, folder), { withFileTypes: true })) {
    const file = folder + '/' + entry.name;
    if (entry.isDirectory()) collect(file);
    else files.add(file);
  }
}
for (const folder of [
  'public',
  'src',
  'server',
  'scripts',
  'tests',
  'examples',
  'licenses',
  'docs',
])
  collect(folder);
for (const file of files) {
  if (!fs.existsSync(path.join(root, file))) throw Error('Missing release file: ' + file);
  if (file.startsWith('data/') || file === '.env' || file.includes('..'))
    throw Error('Unsafe release file: ' + file);
}
process.stdout.write(JSON.stringify([...files].sort(), null, 2) + '\n');
