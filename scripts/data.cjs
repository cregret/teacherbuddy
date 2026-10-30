const fs = require('node:fs'),
  path = require('node:path');
const { keyFrom, openStore, validate } = require('../server/store.cjs');
const root = path.resolve(__dirname, '..');
if (fs.existsSync(path.join(root, '.env'))) process.loadEnvFile(path.join(root, '.env'));
const [command, file] = process.argv.slice(2),
  dir = path.resolve(process.env.DATA_DIR || path.join(root, 'data'));
if (!['import', 'export'].includes(command) || !file)
  throw Error('Usage: node scripts/data.cjs import|export PATH');
if (fs.existsSync(path.join(dir, 'server.lock')))
  throw Error('Stop the server before importing or exporting');
const store = openStore(dir, keyFrom(process.env.DATA_KEY), require('../examples/empty.json'));
if (command === 'import') {
  store.commit(validate(JSON.parse(fs.readFileSync(path.resolve(file), 'utf8'))));
  console.log('Imported into encrypted store.');
} else {
  fs.writeFileSync(path.resolve(file), JSON.stringify(store.read(), null, 2), {
    flag: 'wx',
    mode: 0o600,
  });
  console.log('Exported plaintext JSON; keep outside the public repository.');
}
