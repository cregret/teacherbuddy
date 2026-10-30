const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const { createHash } = require('node:crypto');
const { zip } = require('./zip.cjs');
const { buildGuides } = require('./build-guides.cjs');
const root = path.resolve(__dirname, '..');
process.chdir(root);
buildGuides();
execFileSync(process.execPath, ['scripts/build.cjs'], { stdio: 'inherit' });
const release = path.join(root, 'releases');
fs.mkdirSync(release, { recursive: true });
const files = JSON.parse(
  execFileSync(process.execPath, ['scripts/package.cjs'], { encoding: 'utf8' }),
);
fs.writeFileSync(
  path.join(release, 'teacherbuddy.zip'),
  zip(files.map((file) => ({ name: 'teacherbuddy/' + file, data: fs.readFileSync(file) }))),
);
const skillsRoot = path.join(release, 'teacherbuddy-skills');
fs.mkdirSync(skillsRoot, { recursive: true });
const skillIds = ['teacherbuddy-create-class', 'teacherbuddy-after-class'];
for (const id of skillIds) {
  const source = path.join(root, 'src/features/skills/library', id, 'SKILL.md');
  const target = path.join(skillsRoot, id);
  fs.mkdirSync(target, { recursive: true });
  fs.copyFileSync(source, path.join(target, 'SKILL.md'));
  fs.writeFileSync(
    path.join(release, id + '.zip'),
    zip([{ name: id + '/SKILL.md', data: fs.readFileSync(source) }]),
  );
}
fs.copyFileSync('LICENSE', path.join(skillsRoot, 'LICENSE'));
fs.copyFileSync('docs/skills-package.md', path.join(skillsRoot, 'README.md'));
const artifacts = ['teacherbuddy.zip', ...skillIds.map((id) => id + '.zip')];
fs.writeFileSync(
  path.join(release, 'SHA256SUMS.txt'),
  artifacts
    .map(
      (file) =>
        createHash('sha256')
          .update(fs.readFileSync(path.join(release, file)))
          .digest('hex') +
        '  ' +
        file,
    )
    .join('\n') + '\n',
);
console.log('Release packages ready: ' + artifacts.join(', '));
