// Pure-Node PNG generator for the PWA app icons — no image libraries, no
// network calls. Draws a simple on-brand mark (rounded square + location
// "pulse" rings + center dot) at each required size so the app has real
// icons out of the box; swap these for real branded artwork whenever.
import { deflateSync } from "node:zlib";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");

const BRAND = [0x37, 0x57, 0xf0]; // #3757F0
const WHITE = [0xff, 0xff, 0xff];

const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
    table[n] = c >>> 0;
  }
  return table;
})();

function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  }
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const typeBuf = Buffer.from(type, "ascii");
  const lenBuf = Buffer.alloc(4);
  lenBuf.writeUInt32BE(data.length, 0);
  const crcBuf = Buffer.alloc(4);
  crcBuf.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])), 0);
  return Buffer.concat([lenBuf, typeBuf, data, crcBuf]);
}

function encodePNG(width, height, rgba) {
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  const ihdrData = Buffer.alloc(13);
  ihdrData.writeUInt32BE(width, 0);
  ihdrData.writeUInt32BE(height, 4);
  ihdrData[8] = 8; // bit depth
  ihdrData[9] = 6; // color type RGBA
  ihdrData[10] = 0;
  ihdrData[11] = 0;
  ihdrData[12] = 0;
  const ihdr = chunk("IHDR", ihdrData);

  const stride = width * 4;
  const raw = Buffer.alloc((stride + 1) * height);
  for (let y = 0; y < height; y++) {
    raw[y * (stride + 1)] = 0; // filter: none
    rgba.copy(raw, y * (stride + 1) + 1, y * stride, y * stride + stride);
  }
  const idat = chunk("IDAT", deflateSync(raw, { level: 9 }));
  const iend = chunk("IEND", Buffer.alloc(0));

  return Buffer.concat([signature, ihdr, idat, iend]);
}

/**
 * @param {number} size
 * @param {{ maskable?: boolean, cornerRadiusRatio?: number }} opts
 */
function drawIcon(size, opts = {}) {
  const { maskable = false, cornerRadiusRatio = 0.22 } = opts;
  const rgba = Buffer.alloc(size * size * 4);

  const cx = size / 2;
  const cy = size / 2;
  const cornerRadius = maskable ? 0 : size * cornerRadiusRatio;

  // Maskable icons need content within the ~80% "safe zone" circle; give
  // them extra padding around the mark. Regular icons can use more space.
  const markScale = maskable ? 0.42 : 0.5;
  const ringOuter = size * markScale;
  const ringInner = size * markScale * 0.72;
  const dotRadius = size * markScale * 0.34;

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const i = (y * size + x) * 4;

      const insideRoundedRect = isInsideRoundedRect(x, y, size, cornerRadius);
      if (!insideRoundedRect) {
        rgba[i + 3] = 0; // transparent corner
        continue;
      }

      const dx = x - cx + 0.5;
      const dy = y - cy + 0.5;
      const dist = Math.sqrt(dx * dx + dy * dy);

      let color = BRAND;
      if (dist <= dotRadius) {
        color = WHITE;
      } else if (dist <= ringOuter && dist >= ringInner) {
        color = WHITE;
      }

      rgba[i] = color[0];
      rgba[i + 1] = color[1];
      rgba[i + 2] = color[2];
      rgba[i + 3] = 255;
    }
  }

  return encodePNG(size, size, rgba);
}

function isInsideRoundedRect(x, y, size, r) {
  if (r <= 0) return true;
  const inX = x >= r && x <= size - r;
  const inY = y >= r && y <= size - r;
  if (inX || inY) return true;

  const corners = [
    [r, r],
    [size - r, r],
    [r, size - r],
    [size - r, size - r],
  ];
  return corners.some(([ccx, ccy]) => {
    const dx = x - ccx;
    const dy = y - ccy;
    return dx * dx + dy * dy <= r * r;
  });
}

const outDir = join(ROOT, "public", "icons");
mkdirSync(outDir, { recursive: true });

const targets = [
  { file: "icon-192.png", size: 192, maskable: false },
  { file: "icon-512.png", size: 512, maskable: false },
  { file: "icon-maskable-192.png", size: 192, maskable: true },
  { file: "icon-maskable-512.png", size: 512, maskable: true },
  { file: "apple-touch-icon.png", size: 180, maskable: false, cornerRadiusRatio: 0 },
];

for (const t of targets) {
  const png = drawIcon(t.size, t);
  writeFileSync(join(outDir, t.file), png);
  console.log(`wrote public/icons/${t.file}`);
}

// Next.js App Router favicon convention.
const appDir = join(ROOT, "app");
writeFileSync(join(appDir, "icon.png"), drawIcon(64, { maskable: false }));
console.log("wrote app/icon.png");
