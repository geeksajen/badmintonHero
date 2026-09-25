/**
 * 音效（spec §8.4）：Howler、預設音量 0.4、靜音狀態存 localStorage。
 * iOS 需在第一次使用者互動時 resume AudioContext，見 unlockAudioOnFirstGesture()。
 */
import { Howl, Howler } from 'howler';

export type SoundName = 'tada' | 'levelup' | 'coin' | 'tap' | 'unlock' | 'medal';

const MUTE_KEY = 'bhq:muted';
const VOLUME = 0.4;

const howls = new Map<SoundName, Howl>();
const listeners = new Set<() => void>();

let muted = (() => {
  try {
    return localStorage.getItem(MUTE_KEY) === '1';
  } catch {
    return false;
  }
})();

Howler.volume(VOLUME);
Howler.mute(muted);

function howl(name: SoundName): Howl {
  let h = howls.get(name);
  if (!h) {
    // 音檔由 scripts/gen-assets.mjs 產生（.wav）；要換成 .mp3 只需放同名檔並改這裡的副檔名
    h = new Howl({ src: [`${import.meta.env.BASE_URL}sounds/${name}.wav`], volume: 1, preload: true });
    howls.set(name, h);
  }
  return h;
}

export function playSound(name: SoundName): void {
  if (muted) return;
  try {
    howl(name).play();
  } catch {
    /* 音效失敗不影響遊戲 */
  }
}

export function isMuted(): boolean {
  return muted;
}

export function setMuted(v: boolean): void {
  muted = v;
  Howler.mute(v);
  try {
    localStorage.setItem(MUTE_KEY, v ? '1' : '0');
  } catch {
    /* ignore */
  }
  listeners.forEach((fn) => fn());
}

export function subscribeMuted(fn: () => void): () => void {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}

/** iOS autoplay 解鎖：第一次觸控時 resume，並預載全部音效 */
export function unlockAudioOnFirstGesture(): void {
  const unlock = () => {
    try {
      void Howler.ctx?.resume();
    } catch {
      /* ignore */
    }
    (['tada', 'levelup', 'coin', 'tap', 'unlock', 'medal'] as SoundName[]).forEach(howl);
    window.removeEventListener('pointerdown', unlock);
    window.removeEventListener('keydown', unlock);
  };
  window.addEventListener('pointerdown', unlock, { once: true });
  window.addEventListener('keydown', unlock, { once: true });
}
