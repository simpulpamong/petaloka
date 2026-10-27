/**
 * make-icons.mts — generator ikon PNG untuk PWA + favicon (zero-dependency).
 *
 * Menghasilkan:
 *   public/icons/icon-192.png
 *   public/icons/icon-512.png
 *   public/icons/icon-maskable-512.png
 *   app/icon.png (256 — dipakai Next sebagai favicon otomatis)
 */

import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';

const ROOT = path.resolve(import.meta.dirname, '..');

/* -------------------------------------------------------------------------- */
/* PNG encoder (IHDR/IDAT/IEND + CRC32)                                        */
/* -------------------------------------------------------------------------- */

const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c >>> 0;
  }
  return table;
})();

function crc32(buf: Uint8Array): number {
  let c = 0xffffffff;
  for (const byte of buf) c = CRC_TABLE[(c ^ byte) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type: string, data: Uint8Array): Buffer {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const typeBuf = Buffer.from(type, 'ascii');
  const crcBuf = Buffer.alloc(4);
  crcBuf.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])));
  return Buffer.concat([len, typeBuf, data, crcBuf]);
}

function encodePng(width: number, height: number, rgba: Uint8Array): Buffer {
  const sig = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // color type RGBA
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;

  // filter rotasi 0 per scanline
  const stride = width * 4;
  const raw = Buffer.alloc((stride + 1) * height);
  for (let y = 0; y < height; y++) {
    raw[y * (stride + 1)] = 0;
    rgba.subarray(y * stride, (y + 1) * stride).forEach((byte, i) => {
      raw[y * (stride + 1) + 1 + i] = byte;
    });
  }
  const idat = zlib.deflateSync(raw, { level: 9 });
  return Buffer.concat([
    sig,
    chunk('IHDR', ihdr),
    chunk('IDAT', idat),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

/* -------------------------------------------------------------------------- */
/* Gambar ikon — gradient air-navy + pin map putih                             */
/* -------------------------------------------------------------------------- */

function drawIcon(size: number): Buffer {
  const px = new Uint8Array(size * size * 4);
  const set = (x: number, y: number, r: number, g: number, b: number, a: number): void => {
    if (x < 0 || y < 0 || x >= size || y >= size) return;
    const i = (y * size + x) * 4;
    px[i] = r;
    px[i + 1] = g;
    px[i + 2] = b;
    px[i + 3] = a;
  };

  // latar: gradient diagnostik [#0f2a5f → #2563eb]
  for (let y = 0; y < size; y++) {
    const t = y / (size - 1);
    const r = Math.round(0x14 + (0x25 - 0x14) * t);
    const g = Math.round(0x2a + (0x63 - 0x2a) * t);
    const b = Math.round(0x5f + (0xeb - 0x5f) * t);
    for (let x = 0; x < size; x++) set(x, y, r, g, b, 255);
  }

  // grid tipis ala peta
  const gridAlpha = 26;
  for (let i = 1; i <= 3; i++) {
    const gx = Math.round((size * i) / 4);
    for (let y = 0; y < size; y++) {
      set(gx, y, 255, 255, 255, gridAlpha);
      set(y, gx, 255, 255, 255, gridAlpha);
    }
  }

  // pin (lingkaran + ekor) — zona aman 82% untuk maskable
  const safe = size * 0.82;
  const cx = size / 2;
  const ringR = safe * 0.205;
  const ringW = safe * 0.105;
  const ringCx = cx;
  const ringCy = size * 0.44;
  const tailY = size * 0.62;

  const isWhite = (x: number, y: number): boolean => {
    // ring luar
    const dx = x - ringCx;
    const dy = y - ringCy;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist >= ringR - ringW / 2 && dist <= ringR + ringW / 2) return true;
    // ekor: segitiga di bawah lingkaran
    const yTop = ringCy + ringR * 0.28;
    if (y < yTop || y > tailY) return false;
    const t = (y - yTop) / (tailY - yTop);
    const halfWidth = ringR * (1 - t * 0.92);
    return dx >= -halfWidth && dx <= halfWidth;
  };

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      if (isWhite(x, y)) set(x, y, 255, 255, 255, 255);
    }
  }

  // titik lubang pin (lingkaran dalam transparan → memakai warna latar)
  // ± soft edge anti-alias sederhana pada ring
  return encodePng(size, size, px);
}

/* -------------------------------------------------------------------------- */

const outDir = path.join(ROOT, 'public', 'icons');
fs.mkdirSync(outDir, { recursive: true });

fs.writeFileSync(path.join(outDir, 'icon-192.png'), drawIcon(192));
fs.writeFileSync(path.join(outDir, 'icon-512.png'), drawIcon(512));
fs.writeFileSync(path.join(outDir, 'icon-maskable-512.png'), drawIcon(512));
fs.writeFileSync(path.join(ROOT, 'app', 'icon.png'), drawIcon(256));

console.log('✔ ikon PWA dibuat: public/icons/*, app/icon.png');
