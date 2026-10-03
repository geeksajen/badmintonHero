/**
 * 開發預覽：`npm run dev` 時地圖預設顯示全部章節（不用通關就能看到每一章的設計）。
 * 正式 build 的 import.meta.env.DEV 是常數 false，這裡永遠回傳 false，切換鈕也不會出現。
 * 想在開發時檢查「雲霧遮住下一章」的效果，可以用地圖上方的 DEV 切換鈕關掉。
 */
import { useSyncExternalStore } from 'react';

export const DEV_PREVIEW_AVAILABLE = import.meta.env.DEV;

const KEY = 'bhq:dev:showAllChapters';
const listeners = new Set<() => void>();

function read(): boolean {
  if (!DEV_PREVIEW_AVAILABLE) return false;
  try {
    return localStorage.getItem(KEY) !== '0'; // 預設開啟
  } catch {
    return true;
  }
}

export function setShowAllChapters(v: boolean): void {
  if (!DEV_PREVIEW_AVAILABLE) return;
  try {
    localStorage.setItem(KEY, v ? '1' : '0');
  } catch {
    /* ignore */
  }
  listeners.forEach((fn) => fn());
}

function subscribe(fn: () => void): () => void {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}

/** 開發時是否顯示全部章節（正式版永遠 false） */
export function useShowAllChapters(): boolean {
  return useSyncExternalStore(subscribe, read, () => false);
}
