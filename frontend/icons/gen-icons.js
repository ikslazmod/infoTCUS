const zlib = require('zlib');
const fs = require('fs');
const path = require('path');

function crc32(buf) {
  let table = crc32.table;
  if (!table) {
    table = crc32.table = [];
    for (let n = 0; n < 256; n++) {
      let c = n;
      for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
      table[n] = c >>> 0;
    }
  }
  let crc = 0xffffffff;
  for (const b of buf) crc = table[(crc ^ b) & 0xff] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([len, body, crc]);
}

function png(size, bg, fg) {
  const half = size / 2;
  const rows = [];
  for (let y = 0; y < size; y++) {
    const row = Buffer.alloc(1 + size * 3);
    row[0] = 0;
    for (let x = 0; x < size; x++) {
      let r = bg[0], g = bg[1], b = bg[2];
      const inCircle = (x - half) ** 2 + (y - half) ** 2 <= (half * 0.86) ** 2;
      if (inCircle) {
        const band = (x + y) % 48 < 24;
        if (y > size * 0.3 && y < size * 0.7 && x > size * 0.12 && x < size * 0.88) {
          r = fg[0]; g = fg[1]; b = fg[2];
        } else if (band) {
          r = bg[0] + 18; g = bg[1] + 18; b = bg[2] + 18;
        }
        if (y > size * 0.42 && y < size * 0.58 && x > size * 0.3 && x < size * 0.7) {
          r = bg[0]; g = bg[1]; b = bg[2];
        }
      }
      const o = 1 + x * 3;
      row[o] = r; row[o + 1] = g; row[o + 2] = b;
    }
    rows.push(row);
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; ihdr[9] = 2;
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', zlib.deflateSync(Buffer.concat(rows))),
    chunk('IEND', Buffer.empty || Buffer.alloc(0))
  ]);
}

const dir = __dirname;
for (const size of [192, 512]) {
  fs.writeFileSync(path.join(dir, `icon-${size}.png`), png(size, [26, 86, 158], [255, 214, 66]));
}
console.log('Ikony wygenerowane.');
