const { test } = require('node:test');
const assert = require('node:assert/strict');
const { inflateRawSync } = require('node:zlib');
const { zip } = require('../../scripts/zip.cjs');

test('release ZIP has valid UTF-8 names, CRC, central offsets and lossless payloads', () => {
  const bytes = zip([{ name: '创建班级/SKILL.md', data: '123456789' }]);
  assert.equal(bytes.readUInt32LE(0), 0x04034b50);
  assert.equal(bytes.readUInt32LE(14), 0xcbf43926);
  assert.equal(bytes.readUInt16LE(6), 0x800);
  const nameLength = bytes.readUInt16LE(26),
    size = bytes.readUInt32LE(18);
  assert.equal(bytes.subarray(30, 30 + nameLength).toString(), '创建班级/SKILL.md');
  assert.equal(
    inflateRawSync(bytes.subarray(30 + nameLength, 30 + nameLength + size)).toString(),
    '123456789',
  );
  const centralOffset = bytes.readUInt32LE(bytes.length - 6);
  assert.equal(centralOffset, 30 + nameLength + size);
  assert.equal(bytes.readUInt32LE(centralOffset), 0x02014b50);
  assert.equal(bytes.readUInt32LE(centralOffset + 42), 0);
  assert.equal(bytes.readUInt16LE(bytes.length - 14), 1);
  assert.throws(() => zip([{ name: '../secret', data: '' }]));
  assert.throws(() =>
    zip([
      { name: 'same', data: '' },
      { name: 'same', data: '' },
    ]),
  );
});
