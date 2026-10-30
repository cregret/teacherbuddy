const fs = require('node:fs'),
  path = require('node:path'),
  { randomBytes } = require('node:crypto');
const file = path.resolve(__dirname, '../.env');
if (fs.existsSync(file)) {
  console.log('.env already exists; left unchanged.');
  process.exit(0);
}
const password = randomBytes(24).toString('base64url');
fs.writeFileSync(
  file,
  'HOST=127.0.0.1\nPORT=3000\nDATA_DIR=./data\nDATA_KEY=' +
    randomBytes(32).toString('hex') +
    '\nADMIN_PASSWORD=' +
    password +
    '\n',
  { flag: 'wx', mode: 0o600 },
);
console.log(
  'Created .env. Login: admin. Read ADMIN_PASSWORD in .env. Keep DATA_KEY backed up separately.',
);
