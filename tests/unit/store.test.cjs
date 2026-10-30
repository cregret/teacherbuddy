const { test } = require('node:test'),
  assert = require('node:assert/strict');
const fs = require('node:fs'),
  os = require('node:os'),
  path = require('node:path'),
  { randomBytes } = require('node:crypto');
const { seal, unseal, openStore, keyFrom } = require('../../server/store.cjs');
const seed = require('../../examples/demo.json');
test('authenticated encryption conceals content and rejects tampering or wrong keys', () => {
  const key = randomBytes(32),
    encrypted = seal(seed, key);
  assert(!encrypted.includes('示例学生'));
  assert.deepEqual(unseal(encrypted, key), seed);
  assert.throws(() => unseal(encrypted, randomBytes(32)));
  const changed = JSON.parse(encrypted),
    bytes = Buffer.from(changed.ciphertext, 'base64');
  bytes[0] ^= 1;
  changed.ciphertext = bytes.toString('base64');
  assert.throws(() => unseal(JSON.stringify(changed), key));
  assert.throws(() => keyFrom('short'));
});
test('commits survive restart, retain previous encrypted version, and never overwrite unreadable data', () => {
  const base = path.resolve(__dirname, '../../.cache/test-results');
  fs.mkdirSync(base, { recursive: true });
  const dir = fs.mkdtempSync(path.join(base, 'store-')),
    key = randomBytes(32);
  try {
    const store = openStore(dir, key, seed),
      next = store.read();
    next.state['teacherbuddy.test'] = { value: 'saved', revision: 1 };
    store.commit(next);
    assert.deepEqual(openStore(dir, key, {}).read(), next);
    assert.deepEqual(unseal(fs.readFileSync(store.file + '.bak', 'utf8'), key), seed);
    const prior = fs.readFileSync(store.file, 'utf8');
    assert.throws(() => openStore(dir, randomBytes(32), seed));
    assert.equal(fs.readFileSync(store.file, 'utf8'), prior);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});
