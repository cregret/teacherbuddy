const { deflateRawSync } = require('node:zlib');

const crcTable = Array.from({ length: 256 }, (_, n) => {
  for (let k = 0; k < 8; k++) n = n & 1 ? 0xedb88320 ^ (n >>> 1) : n >>> 1;
  return n >>> 0;
});
function crc32(bytes) {
  let crc = 0xffffffff;
  for (const byte of bytes) crc = crcTable[(crc ^ byte) & 255] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}

// Small deterministic ZIP writer for release files; no runtime package installation required.
function zip(entries) {
  if (entries.length > 65535) throw Error('Too many ZIP entries');
  const local = [],
    central = [],
    seen = new Set();
  let offset = 0;
  for (const entry of [...entries].sort((a, b) => a.name.localeCompare(b.name))) {
    const name = entry.name.replaceAll('\\', '/');
    if (
      !name ||
      name.startsWith('/') ||
      name.split('/').some((part) => part === '..' || part === '.') ||
      /^[A-Za-z]:/.test(name) ||
      seen.has(name)
    )
      throw Error('Invalid ZIP path: ' + name);
    seen.add(name);
    const filename = Buffer.from(name),
      bytes = Buffer.from(entry.data),
      compressed = deflateRawSync(bytes);
    if (filename.length > 65535 || bytes.length > 0xffffffff || compressed.length > 0xffffffff)
      throw Error('ZIP entry too large');
    const header = Buffer.alloc(30);
    header.writeUInt32LE(0x04034b50, 0);
    header.writeUInt16LE(20, 4);
    header.writeUInt16LE(0x800, 6);
    header.writeUInt16LE(8, 8);
    header.writeUInt16LE(33, 12);
    header.writeUInt32LE(crc32(bytes), 14);
    header.writeUInt32LE(compressed.length, 18);
    header.writeUInt32LE(bytes.length, 22);
    header.writeUInt16LE(filename.length, 26);
    local.push(header, filename, compressed);
    const record = Buffer.alloc(46);
    record.writeUInt32LE(0x02014b50, 0);
    record.writeUInt16LE(20, 4);
    header.copy(record, 6, 4, 30);
    record.writeUInt32LE(offset, 42);
    central.push(record, filename);
    offset += header.length + filename.length + compressed.length;
  }
  const directory = Buffer.concat(central),
    end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0);
  end.writeUInt16LE(entries.length, 8);
  end.writeUInt16LE(entries.length, 10);
  end.writeUInt32LE(directory.length, 12);
  end.writeUInt32LE(offset, 16);
  return Buffer.concat([...local, directory, end]);
}
module.exports = { zip };
