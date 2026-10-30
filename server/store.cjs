const fs = require('node:fs');
const path = require('node:path');
const { randomBytes, createCipheriv, createDecipheriv } = require('node:crypto');
const AAD = Buffer.from('teacherbuddy:store:v1');
function keyFrom(value) {
  if (!/^[a-f0-9]{64}$/i.test(value || ''))
    throw Error('DATA_KEY must contain exactly 64 hexadecimal characters');
  return Buffer.from(value, 'hex');
}
function seal(data, key) {
  const iv = randomBytes(12),
    cipher = createCipheriv('aes-256-gcm', key, iv);
  cipher.setAAD(AAD);
  const ciphertext = Buffer.concat([cipher.update(JSON.stringify(data), 'utf8'), cipher.final()]);
  return JSON.stringify({
    version: 1,
    algorithm: 'aes-256-gcm',
    iv: iv.toString('base64'),
    tag: cipher.getAuthTag().toString('base64'),
    ciphertext: ciphertext.toString('base64'),
  });
}
function unseal(text, key) {
  const box = JSON.parse(text);
  if (box.version !== 1 || box.algorithm !== 'aes-256-gcm')
    throw Error('Unsupported encrypted store');
  const decipher = createDecipheriv('aes-256-gcm', key, Buffer.from(box.iv, 'base64'));
  decipher.setAAD(AAD);
  decipher.setAuthTag(Buffer.from(box.tag, 'base64'));
  return JSON.parse(
    Buffer.concat([
      decipher.update(Buffer.from(box.ciphertext, 'base64')),
      decipher.final(),
    ]).toString('utf8'),
  );
}
function validate(data) {
  if (
    data?.schemaVersion !== 1 ||
    !Array.isArray(data.model?.classes) ||
    !Array.isArray(data.model?.students) ||
    !data.workspace ||
    !data.state ||
    !data.resources
  )
    throw Error('Invalid platform document');
  for (const key of [
    'groups',
    'periods',
    'payments',
    'enrollments',
    'leads',
    'assets',
    'skills',
    'tasks',
  ])
    if (!Array.isArray(data.model[key])) throw Error('Invalid model: ' + key);
  return data;
}
function openStore(directory, key, seed) {
  fs.mkdirSync(directory, { recursive: true, mode: 0o700 });
  const file = path.join(directory, 'workspace.enc.json');
  let data = validate(
    fs.existsSync(file) ? unseal(fs.readFileSync(file, 'utf8'), key) : structuredClone(seed),
  );
  function commit(next) {
    validate(next);
    const temp = file + '.' + randomBytes(6).toString('hex') + '.tmp';
    try {
      const fd = fs.openSync(temp, 'wx', 0o600);
      try {
        fs.writeFileSync(fd, seal(next, key));
        fs.fsyncSync(fd);
      } finally {
        fs.closeSync(fd);
      }
      if (fs.existsSync(file)) fs.copyFileSync(file, file + '.bak');
      fs.renameSync(temp, file);
      data = next;
    } finally {
      if (fs.existsSync(temp)) fs.unlinkSync(temp);
    }
  }
  if (!fs.existsSync(file)) commit(data);
  return { read: () => structuredClone(data), view: () => data, commit, file };
}
module.exports = { keyFrom, seal, unseal, validate, openStore };
