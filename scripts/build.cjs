const fs = require('node:fs');
const path = require('node:path');
const esbuild = require('esbuild');
const root = path.resolve(__dirname, '..');
process.chdir(root);

async function build() {
  const output = path.join(root, 'public/assets');
  for (const folder of ['js', 'css']) {
    const target = path.join(output, folder);
    if (!target.startsWith(path.join(root, 'public') + path.sep))
      throw Error('Invalid build output');
    fs.rmSync(target, { recursive: true, force: true });
  }
  await esbuild.build({
    entryPoints: {
      home: 'src/entries/home.js',
      workspace: 'src/entries/workspace.js',
      'lesson-share': 'src/entries/lesson-share.js',
      'student-report': 'src/entries/student-report.js',
    },
    bundle: true,
    splitting: true,
    format: 'esm',
    target: ['es2022'],
    outdir: 'public/assets/js',
    chunkNames: 'shared/[name]-[hash]',
    minify: true,
    legalComments: 'inline',
    loader: { '.css': 'text', '.md': 'text' },
  });
  const styleEntries = { app: 'src/styles/app.css' };
  for (const folder of ['pages', 'reports']) {
    for (const file of fs.readdirSync('src/styles/' + folder)) {
      if (
        file.endsWith('.css') &&
        !file.endsWith('-theme.css') &&
        !file.endsWith('-embedding.css')
      ) {
        styleEntries[path.basename(file, '.css')] = 'src/styles/' + folder + '/' + file;
      }
    }
  }
  await esbuild.build({
    entryPoints: styleEntries,
    outdir: 'public/assets/css',
    bundle: true,
    target: ['es2022'],
    legalComments: 'inline',
  });
  const manifest = {};
  function collect(directory) {
    for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
      const file = path.join(directory, entry.name);
      if (entry.isDirectory()) collect(file);
      else {
        const relative = path.relative('public', file).replaceAll(path.sep, '/');
        const route = relative.startsWith('pages/') ? relative.slice(6) : relative;
        manifest[route] = relative;
      }
    }
  }
  collect('public');
  for (const alias of ['demo-logo.svg', 'logo.jpg', 'logo_green.jpg'])
    manifest[alias] = 'assets/images/logo.svg';
  fs.writeFileSync('server/public-files.json.tmp', JSON.stringify(manifest, null, 2) + '\n');
  fs.renameSync('server/public-files.json.tmp', 'server/public-files.json');
  console.log(
    'Built 4 JavaScript entries, shared chunks, ' +
      Object.keys(styleEntries).length +
      ' stylesheets and public routes.',
  );
}

build().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
