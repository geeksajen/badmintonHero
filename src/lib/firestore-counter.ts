/**
 * 開發期讀寫計數器（spec §2.2 ④）。
 * 所有 Firestore（以及 Local Mode 模擬的）讀寫都經過這裡記帳；
 * DEV 時畫面角落常駐顯示，單次 session 超過 500 次讀取就 console.error。
 * 這是唯一能在開發階段就抓到「監聽／快取寫錯造成迴圈」的實際手段。
 */
export const READ_ALARM = 500;

export interface CounterStats {
  reads: number;
  writes: number;
  byLabel: Record<string, { reads: number; writes: number }>;
}

const stats: CounterStats = { reads: 0, writes: 0, byLabel: {} };
const listeners = new Set<(s: CounterStats) => void>();
let alarmed = false;

const isDev = (() => {
  try {
    return !!import.meta.env?.DEV && typeof window !== 'undefined';
  } catch {
    return false;
  }
})();

function bump(kind: 'reads' | 'writes', n: number, label: string) {
  if (n <= 0) return;
  stats[kind] += n;
  const l = (stats.byLabel[label] ??= { reads: 0, writes: 0 });
  l[kind] += n;
  if (isDev) console.debug(`[firestore-counter] ${kind === 'reads' ? 'R' : 'W'} +${n} ${label} (R=${stats.reads} W=${stats.writes})`);
  if (kind === 'reads' && stats.reads > READ_ALARM && !alarmed) {
    alarmed = true;
    console.error(
      `🚨🚨🚨 [firestore-counter] 本次 session 讀取已超過 ${READ_ALARM} 次（目前 ${stats.reads}）！` +
        '很可能有 useEffect 迴圈或多餘的監聽，請立刻檢查（spec §2.2 ④）。',
      stats.byLabel,
    );
  }
  const snapshot = getCounterStats();
  listeners.forEach((fn) => fn(snapshot));
}

export function countRead(n: number, label: string): void {
  bump('reads', n, label);
}

export function countWrite(n: number, label: string): void {
  bump('writes', n, label);
}

export function getCounterStats(): CounterStats {
  return { reads: stats.reads, writes: stats.writes, byLabel: { ...stats.byLabel } };
}

export function subscribeCounter(fn: (s: CounterStats) => void): () => void {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}

/** 測試用 */
export function resetCounter(): void {
  stats.reads = 0;
  stats.writes = 0;
  stats.byLabel = {};
  alarmed = false;
}
