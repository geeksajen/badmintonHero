// Generates the game's sound effects (.wav) and PWA icons (.png / .svg) with zero dependencies.
// Usage: npm run gen:assets   (outputs to public/sounds and public/icons)
// Sounds are synthesized (FM bells, brass-like fanfare, filtered noise, small reverb), so there is
// no licensing to worry about. Replace any file with a recorded asset of the same name at any time.
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
const RATE = 32000;
const TAU = 2 * Math.PI;

function wav(samples) {
  const data = Buffer.alloc(samples.length * 2);
  samples.forEach((s, i) => data.writeInt16LE(Math.round(Math.max(-1, Math.min(1, s)) * 32767), i * 2));
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

/** MIDI note number → Hz (69 = A4, 72 = C5, 84 = C6, 96 = C7) */
const midi = (m) => 440 * 2 ** ((m - 69) / 12);

/** Deterministic noise so regenerating gives identical files */
let seed = 1;
const rand = () => {
  seed = (seed * 1664525 + 1013904223) >>> 0;
  return seed / 2 ** 31 - 1;
};

/**
 * Amplitude envelope: linear attack, then exponential decay (time constant `decay`, or sustain if null),
 * and a linear release over the last `release` seconds.
 */
function env(t, dur, { attack = 0.005, decay = null, release = 0.03 }) {
  let a = t < attack ? t / attack : 1;
  if (decay !== null && t >= attack) a *= Math.exp(-(t - attack) / decay);
  const r = dur - t;
  if (r < release) a *= Math.max(0, r / release);
  return a;
}

/** Brass-like additive tone (1/k harmonics, darker overall) */
const BRASS = Array.from({ length: 10 }, (_, i) => (1 / (i + 1)) * 0.74 ** i);
const BRASS_NORM = BRASS.reduce((s, x) => s + x, 0);

/**
 * tone({ start, dur, freq, wave, vol, attack, decay, release, glide, vibrato, ratio, index, detune })
 * wave: sine | tri | square | brass | bell (FM, ratio/index)
 * glide: (progress 0..1) => frequency multiplier
 */
function tone(out, o) {
  const s0 = Math.floor(o.start * RATE);
  const len = Math.floor(o.dur * RATE);
  const vol = o.vol ?? 0.3;
  let phase = 0;
  for (let i = 0; i < len && s0 + i < out.length; i++) {
    const t = i / RATE;
    let f = o.freq * (o.glide ? o.glide(t / o.dur) : 1) * 2 ** ((o.detune ?? 0) / 1200);
    if (o.vibrato && t > 0.12) f *= 1 + o.vibrato * Math.sin(TAU * (o.vibratoRate ?? 5.5) * t) * Math.min(1, (t - 0.12) / 0.2);
    phase += (TAU * f) / RATE;
    let v;
    switch (o.wave ?? 'sine') {
      case 'tri':
        v = (2 / Math.PI) * Math.asin(Math.sin(phase));
        break;
      case 'square': // soft square: odd harmonics up to 9
        v = (Math.sin(phase) + Math.sin(3 * phase) / 3 + Math.sin(5 * phase) / 5 + Math.sin(7 * phase) / 7 + Math.sin(9 * phase) / 9) * 0.8;
        break;
      case 'brass': {
        v = 0;
        // brighter at the start of the note, mellower as it sustains
        const bright = 0.55 + 0.45 * Math.exp(-t / 0.15);
        for (let k = 0; k < BRASS.length; k++) v += Math.sin((k + 1) * phase) * BRASS[k] * bright ** k;
        v /= BRASS_NORM * 0.6;
        break;
      }
      case 'bell': {
        const index = (o.index ?? 2) * Math.exp(-t / ((o.decay ?? 0.4) * 0.6));
        v = Math.sin(phase + index * Math.sin((o.ratio ?? 3.5) * phase));
        break;
      }
      default:
        v = Math.sin(phase);
    }
    out[s0 + i] += v * vol * env(t, o.dur, o);
  }
}

/** Filtered noise (state-variable filter). cutoff may be a function of progress 0..1 */
function noise(out, o) {
  const s0 = Math.floor(o.start * RATE);
  const len = Math.floor(o.dur * RATE);
  const q = o.q ?? 0.7;
  let low = 0, band = 0;
  for (let i = 0; i < len && s0 + i < out.length; i++) {
    const t = i / RATE;
    const fc = typeof o.cutoff === 'function' ? o.cutoff(t / o.dur) : o.cutoff ?? 2000;
    const f = 2 * Math.sin((Math.PI * Math.min(fc, RATE / 4)) / RATE);
    const input = rand();
    low += f * band;
    const high = input - low - q * band;
    band += f * high;
    const v = o.mode === 'low' ? low : o.mode === 'high' ? high : band;
    out[s0 + i] += v * (o.vol ?? 0.2) * env(t, o.dur, o);
  }
}

/** Small room reverb (Schroeder: 4 damped combs + 2 allpasses) */
function reverb(x, wet) {
  if (!wet) return x;
  const combs = [29.7, 37.1, 41.1, 43.7].map((ms) => ({ buf: new Float32Array(Math.round((ms * RATE) / 1000)), i: 0, lp: 0 }));
  const aps = [5.0, 1.7].map((ms) => ({ buf: new Float32Array(Math.round((ms * RATE) / 1000)), i: 0 }));
  const out = new Float32Array(x.length);
  for (let n = 0; n < x.length; n++) {
    let s = 0;
    for (const c of combs) {
      const y = c.buf[c.i];
      c.lp = y * 0.6 + c.lp * 0.4; // damping
      c.buf[c.i] = x[n] + c.lp * 0.8;
      c.i = (c.i + 1) % c.buf.length;
      s += y;
    }
    s *= 0.25;
    for (const a of aps) {
      const y = a.buf[a.i];
      const v = s + y * 0.5;
      a.buf[a.i] = v;
      a.i = (a.i + 1) % a.buf.length;
      s = y - v * 0.5;
    }
    out[n] = x[n] + s * wet;
  }
  return out;
}

/**
 * Render a sound: build into a buffer with a reverb tail, normalize, fade the end.
 * level scales the normalized peak so short, dense sounds (coin) don't feel louder than the rest.
 */
function sound(seconds, wet, build, level = 1) {
  const x = new Float32Array(Math.ceil(seconds * RATE));
  build(x);
  const y = reverb(x, wet);
  let peak = 0;
  for (const v of y) peak = Math.max(peak, Math.abs(v));
  const gain = peak > 0 ? (0.89 * level) / peak : 1;
  const fade = Math.floor(0.04 * RATE);
  return Array.from(y, (v, i) => v * gain * Math.min(1, (y.length - i) / fade));
}

const sounds = {
  // UI 按鈕：柔和的「啵」
  tap: sound(0.16, 0.05, (x) => {
    tone(x, { start: 0, dur: 0.1, freq: 1000, glide: (p) => 1 - 0.48 * Math.min(1, p * 2.5), vol: 0.6, attack: 0.002, decay: 0.03 });
    tone(x, { start: 0, dur: 0.012, freq: 2600, wave: 'tri', vol: 0.08, attack: 0.001, decay: 0.004 });
  }),

  // ＋1 計數：往上滑的泡泡聲（播放時會隨進度升高音調）
  pop: sound(0.2, 0.08, (x) => {
    tone(x, { start: 0, dur: 0.12, freq: 520, glide: (p) => 1 + 0.7 * Math.min(1, p * 2), vol: 0.55, attack: 0.003, decay: 0.05 });
    tone(x, { start: 0, dur: 0.08, freq: 1040, glide: (p) => 1 + 0.7 * Math.min(1, p * 2), vol: 0.12, attack: 0.003, decay: 0.03 });
  }),

  // 金幣：經典兩音 ＋ 一點閃光
  coin: sound(0.6, 0.15, (x) => {
    tone(x, { start: 0, dur: 0.075, freq: midi(83), wave: 'square', vol: 0.22, attack: 0.002, release: 0.01 });
    tone(x, { start: 0.075, dur: 0.42, freq: midi(88), wave: 'square', vol: 0.22, attack: 0.002, decay: 0.13 });
    tone(x, { start: 0.075, dur: 0.3, freq: midi(100), wave: 'bell', ratio: 3.5, index: 1.5, vol: 0.07, decay: 0.08 });
  }, 0.6),

  // 獎牌：鐘琴琶音 ＋ 高音閃爍
  medal: sound(1.4, 0.25, (x) => {
    [84, 88, 91, 96].forEach((m, i) => {
      tone(x, { start: i * 0.07, dur: 1.0, freq: midi(m), wave: 'bell', ratio: 3.5, index: 2.2, vol: 0.26, decay: 0.35 });
      tone(x, { start: i * 0.07, dur: 0.8, freq: midi(m - 12), vol: 0.08, attack: 0.01, decay: 0.3 });
    });
    noise(x, { start: 0.21, dur: 0.5, cutoff: 9000, mode: 'high', vol: 0.025, attack: 0.01, decay: 0.15 });
  }),

  // 解鎖／送出：魔法「咻～」＋ 上行五聲音階
  unlock: sound(1.2, 0.3, (x) => {
    noise(x, { start: 0, dur: 0.55, cutoff: (p) => 400 + 4600 * p, q: 0.4, vol: 0.3, attack: 0.3, decay: 0.12 });
    [79, 81, 84, 86, 88, 91, 93, 96].forEach((m, i) => {
      tone(x, { start: 0.1 + i * 0.045, dur: 0.5, freq: midi(m), wave: 'bell', ratio: 3.5, index: 1.6, vol: 0.15, decay: 0.18 });
    });
    tone(x, { start: 0.46, dur: 0.6, freq: midi(96), wave: 'bell', ratio: 1.4, index: 1.2, vol: 0.12, decay: 0.3 });
  }),

  // 新區域出現：漸強的和弦墊 ＋ 雲霧散開 ＋ 鐘聲
  reveal: sound(2.2, 0.35, (x) => {
    for (const m of [60, 64, 67, 72]) {
      for (const d of [-5, 5]) {
        tone(x, { start: 0, dur: 1.5, freq: midi(m), detune: d, wave: 'tri', vol: 0.07, attack: 0.8, release: 0.5, vibrato: 0.003 });
      }
    }
    noise(x, { start: 0, dur: 1.1, cutoff: (p) => 200 + 2800 * p, q: 0.5, vol: 0.18, attack: 0.8, release: 0.25 });
    [84, 88, 91, 96].forEach((m, i) => {
      tone(x, { start: 0.85 + i * 0.05, dur: 1.1, freq: midi(m), wave: 'bell', ratio: 3.5, index: 2, vol: 0.17, decay: 0.45 });
    });
  }),

  // 升級：銅管琶音 ＋ 長音 ＋ 高音閃爍
  levelup: sound(1.6, 0.22, (x) => {
    [72, 76, 79].forEach((m, i) => {
      tone(x, { start: i * 0.1, dur: 0.13, freq: midi(m), wave: 'brass', vol: 0.22, attack: 0.015, release: 0.03 });
    });
    tone(x, { start: 0.3, dur: 0.95, freq: midi(84), wave: 'brass', vol: 0.22, attack: 0.02, release: 0.35, vibrato: 0.006 });
    tone(x, { start: 0.3, dur: 0.95, freq: midi(76), wave: 'brass', vol: 0.1, attack: 0.03, release: 0.35 });
    tone(x, { start: 0.3, dur: 0.95, freq: midi(79), wave: 'brass', vol: 0.1, attack: 0.03, release: 0.35 });
    [96, 100, 103, 108].forEach((m, i) => {
      tone(x, { start: 0.32 + i * 0.05, dur: 0.5, freq: midi(m), wave: 'bell', ratio: 3.5, index: 1.4, vol: 0.08, decay: 0.15 });
    });
  }),

  // 完成：小鼓滾奏 → 「噹～噹！」銅管和弦 ＋ 鈸 ＋ 鐘聲
  tada: sound(2.3, 0.3, (x) => {
    for (let t = 0, k = 0; t < 0.38; t += 0.034, k++) {
      noise(x, { start: t, dur: 0.06, cutoff: 1900, q: 0.6, vol: 0.2 + 0.35 * (t / 0.38), attack: 0.001, decay: 0.022 });
    }
    for (const m of [55, 59, 62, 67]) {
      tone(x, { start: 0.42, dur: 0.13, freq: midi(m), wave: 'brass', vol: 0.13, attack: 0.012, release: 0.03 });
    }
    for (const m of [60, 64, 67, 72]) {
      tone(x, { start: 0.58, dur: 1.35, freq: midi(m), wave: 'brass', vol: 0.13, attack: 0.02, release: 0.45, vibrato: 0.005 });
    }
    tone(x, { start: 0.58, dur: 1.2, freq: midi(48), vol: 0.22, attack: 0.01, decay: 0.5 });
    noise(x, { start: 0.58, dur: 1.2, cutoff: 6000, mode: 'high', vol: 0.12, attack: 0.002, decay: 0.45 });
    noise(x, { start: 0.58, dur: 0.12, cutoff: 180, mode: 'low', vol: 0.35, attack: 0.002, decay: 0.05 });
    [96, 100, 103].forEach((m, i) => {
      tone(x, { start: 0.62 + i * 0.06, dur: 0.8, freq: midi(m), wave: 'bell', ratio: 3.5, index: 1.8, vol: 0.1, decay: 0.3 });
    });
  }),
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
