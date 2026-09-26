/**
 * 念給我聽：用裝置內建的語音朗讀（Web Speech API），不需網路、不花額度。
 * 7 歲小孩讀任務說明、教練的話很吃力，點 🔊 就能聽。
 * iOS 需要在使用者點擊時呼叫 speak()（按鈕的 onClick 即可）。
 */

export const canSpeak = typeof window !== 'undefined' && 'speechSynthesis' in window;

const listeners = new Set<() => void>();
let speakingId: string | null = null;

/** 優先台灣中文，其次任何繁體／中文語音；都沒有就只設 lang 交給系統挑 */
function pickVoice(): SpeechSynthesisVoice | undefined {
  const voices = window.speechSynthesis.getVoices();
  const lang = (v: SpeechSynthesisVoice) => v.lang.replace('_', '-').toLowerCase();
  return (
    voices.find((v) => lang(v) === 'zh-tw') ??
    voices.find((v) => lang(v).startsWith('zh') && /hant|tw/i.test(v.lang + v.name)) ??
    voices.find((v) => lang(v) === 'zh-hk') ??
    voices.find((v) => lang(v).startsWith('zh'))
  );
}

function setSpeaking(id: string | null) {
  speakingId = id;
  listeners.forEach((fn) => fn());
}

/** 朗讀；id 用來讓對應的按鈕顯示「念念中」。再呼叫一次會先停掉前一段 */
export function speak(text: string, id: string): void {
  if (!canSpeak) return;
  const synth = window.speechSynthesis;
  synth.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.lang = 'zh-TW';
  const voice = pickVoice();
  if (voice) u.voice = voice;
  u.rate = 0.9; // 給小孩聽，慢一點
  u.pitch = 1.1;
  u.onend = u.onerror = () => {
    if (speakingId === id) setSpeaking(null);
  };
  setSpeaking(id);
  synth.speak(u);
}

export function stopSpeaking(): void {
  if (!canSpeak) return;
  window.speechSynthesis.cancel();
  setSpeaking(null);
}

export function speakingNow(): string | null {
  return speakingId;
}

export function subscribeSpeaking(fn: () => void): () => void {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}
