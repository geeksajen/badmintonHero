// Generates placeholder sound effects (.wav) and PWA icons (.png / .svg) with zero dependencies.
// Usage: npm run gen:assets   (outputs to public/sounds and public/icons)
// Replace any file with a real asset of the same name at any time.
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { deflateSync } from 'node:zlib';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const SOUNDS = join(ROOT, 'public', 'sounds');
const ICONS = join(ROOT, 'public', 'icons');
mkdirSync(SOUNDS, { recursive: true });
mkdirSync(ICONS, { recursive: true });

// ---------------------------------------------------------------- sounds
const RATE = 22050;

function wav(samples) {
  const data = Buffer.alloc(samples.length * 2);
  samples.forEach((s, i) => data.writeInt16LE(Math.max(-1, Math.min(1, s)) * 32767, i * 2));
  const h = Buffer.alloc(44);
  h.write('RIFF', 0);
  h.writeUInt32LE(36 + data.length, 4);
  h.write('WAVE', 8);
  h.write('fmt ', 12);
  h.writeUInt32LE(16, 16);
  h.writeUInt16LE(1, 20); // PCM
  h.writeUInt16LE(1, 22); // mono
  h.writeUInt32LE(RATE, 24);
  h.writeUInt32LE(RATE * 2, 28);
  h.writeUInt16LE(2, 32);
  h.writeUInt16LE(16, 34);
  h.write('data', 36);
  h.writeUInt32LE(data.length, 40);
  return Buffer.concat([h, data]);
}

const NOTE = { C5: 523.25, E5: 659.25, G5: 783.99, C6: 1046.5, E6: 1318.5, G6: 1568, B5: 987.77, G4: 392 };

/** notes: [{ f, start, dur, type, vol }] ; f may be a function of t for sweeps */
function render(total, notes) {
  const out = new Float32Array(Math.ceil(total * RATE));
  for (const n of notes) {
    const s0 = Math.floor(n.start * RATE);
    const len = Math.floor(n.dur * RATE);
    let phase = 0;
    for (let i = 0; i < len && s0 + i < out.length; i++) {
      const t = i / RATE;
      const f = typeof n.f === 'function' ? n.f(t / n.dur) : n.f;
      phase += (2 * Math.PI * f) / RATE;
      const attack = Math.min(1, t / 0.008);
      const env = attack * Math.exp((-t * (n.decay ?? 6)) / n.dur);
      let v = Math.sin(phase);
      if (n.type === 'square') v = Math.sign(v) * 0.6;
      if (n.type === 'bell') v = Math.sin(phase) * 0.7 + Math.sin(phase * 2.01) * 0.2 + Math.sin(phase * 3.02) * 0.1;
      out[s0 + i] += v * env * (n.vol ?? 0.5);
    }
  }
  return Array.from(out);
}

const sounds = {
  tap: render(0.08, [{ f: 880, start: 0, dur: 0.07, vol: 0.4, decay: 8 }]),
  coin: render(0.35, [
    { f: NOTE.B5, start: 0, dur: 0.08, type: 'square', vol: 0.3, decay: 2 },
    { f: NOTE.E6, start: 0.08, dur: 0.26, type: 'square', vol: 0.3, decay: 5 },
  ]),
  medal: render(0.7, [
    { f: NOTE.C6, start: 0, dur: 0.5, type: 'bell', vol: 0.45 },
    { f: NOTE.E6, start: 0.1, dur: 0.5, type: 'bell', vol: 0.45 },
    { f: NOTE.G6, start: 0.2, dur: 0.5, type: 'bell', vol: 0.45 },
  ]),
  unlock: render(0.45, [{ f: (p) => 400 + 900 * p, start: 0, dur: 0.4, vol: 0.4, decay: 3 }]),
  levelup: render(0.95, [
    { f: NOTE.C5, start: 0, dur: 0.14, type: 'square', vol: 0.28, decay: 2 },
    { f: NOTE.E5, start: 0.11, dur: 0.14, type: 'square', vol: 0.28, decay: 2 },
    { f: NOTE.G5, start: 0.22, dur: 0.14, type: 'square', vol: 0.28, decay: 2 },
    { f: NOTE.C6, start: 0.33, dur: 0.6, type: 'square', vol: 0.28, decay: 4 },
  ]),
  tada: render(1.3, [
    { f: NOTE.G4, start: 0, dur: 0.12, type: 'bell', vol: 0.4, decay: 2 },
    { f: NOTE.C5, start: 0.12, dur: 0.12, type: 'bell', vol: 0.4, decay: 2 },
    { f: NOTE.E5, start: 0.24, dur: 0.12, type: 'bell', vol: 0.4, decay: 2 },
    ...[NOTE.C5, NOTE.E5, NOTE.G5, NOTE.C6].map((f) => ({ f, start: 0.4, dur: 0.9, type: 'bell', vol: 0.25, decay: 4 })),
  ]),
};
for (const [name, s] of Object.entries(sounds)) writeFileSync(join(SOUNDS, `${name}.wav`), wav(s));

// ---------------------------------------------------------------- icons
const CRC_TABLE = Array.from({ length: 256 }, (_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});
const crc32 = (buf) => {
  let c = 0xffffffff;
  for (const b of buf) c = CRC_TABLE[(c ^ b) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
};
function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const td = Buffer.concat([Buffer.from(type), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(td));
  return Buffer.concat([len, td, crc]);
}
function png(size, pixel) {
  const raw = Buffer.alloc(size * (size * 4 + 1));
  const SS = 3; // supersampling
  for (let y = 0; y < size; y++) {
    raw[y * (size * 4 + 1)] = 0;
    for (let x = 0; x < size; x++) {
      let r = 0, g = 0, b = 0;
      for (let sy = 0; sy < SS; sy++)
        for (let sx = 0; sx < SS; sx++) {
          const [pr, pg, pb] = pixel((x + (sx + 0.5) / SS) / size, (y + (sy + 0.5) / SS) / size);
          r += pr; g += pg; b += pb;
        }
      const o = y * (size * 4 + 1) + 1 + x * 4;
      raw[o] = r / (SS * SS);
      raw[o + 1] = g / (SS * SS);
      raw[o + 2] = b / (SS * SS);
      raw[o + 3] = 255;
    }
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; ihdr[9] = 6; ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw)),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

const mix = (a, b, t) => a.map((v, i) => v + (b[i] - v) * t);
const TOP = [124, 58, 237]; // violet-600
const BOTTOM = [30, 27, 75]; // indigo-950

/** Shuttlecock on a violet gradient, gold ring. Coordinates are 0..1. */
function iconPixel(x, y) {
  let c = mix(TOP, BOTTOM, y);
  const dx = x - 0.5, dy = y - 0.5;
  const d = Math.hypot(dx, dy);
  if (d > 0.36 && d < 0.4) c = [245, 183, 0]; // gold ring
  // feather skirt: trapezoid from y=0.24 (wide) to y=0.6 (narrow)
  if (y > 0.24 && y < 0.6) {
    const t = (y - 0.24) / 0.36;
    const half = 0.2 - 0.11 * t;
    if (Math.abs(dx) < half) {
      c = [255, 255, 255];
      const stripe = Math.abs(((dx / half) * 3) % 1);
      if (stripe < 0.08 || (y > 0.34 && y < 0.37)) c = [203, 213, 225];
    }
  }
  // cork
  if (Math.hypot(dx, y - 0.64) < 0.1 && y > 0.58) c = [251, 191, 36];
  return c;
}

writeFileSync(join(ICONS, 'icon-192.png'), png(192, iconPixel));
writeFileSync(join(ICONS, 'icon-512.png'), png(512, iconPixel));
writeFileSync(join(ICONS, 'apple-touch-icon.png'), png(180, iconPixel));
writeFileSync(
  join(ICONS, 'icon.svg'),
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
  <defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#7c3aed"/><stop offset="1" stop-color="#1e1b4b"/></linearGradient></defs>
  <rect width="100" height="100" rx="22" fill="url(#g)"/>
  <circle cx="50" cy="50" r="38" fill="none" stroke="#f5b700" stroke-width="4"/>
  <path d="M30 24 L70 24 L59 60 L41 60 Z" fill="#fff"/>
  <path d="M30 35 L70 35" stroke="#cbd5e1" stroke-width="3"/>
  <circle cx="50" cy="64" r="10" fill="#fbbf24"/>
</svg>
`,
);

console.log('Generated', Object.keys(sounds).length, 'sounds and 4 icons.');
