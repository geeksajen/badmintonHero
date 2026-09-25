/**
 * 歷史型資料（logs / sessions / orders）的 LocalStorage TTL 快取（spec §2.2 ③-4）。
 *
 * - TTL 1 小時；未過期就完全不發 Firestore 請求
 * - 額外帶一個 rev（來自 player.logsRev 等）：另一台裝置寫入後 rev 會變，
 *   本機快取即使未過期也視為失效 —— 否則家長核可後，小孩的日誌要等 1 小時才看得到
 * - 自己寫入新資料時 unshift 進快取，而非重新抓取
 */
export const CACHE_TTL_MS = 3_600_000;

export interface CacheEntry<T> {
  data: T[];
  fetchedAt: number;
  rev?: number;
}

export interface KVStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

let storage: KVStorage | null = null;
function getStorage(): KVStorage | null {
  if (storage) return storage;
  try {
    return typeof localStorage !== 'undefined' ? localStorage : null;
  } catch {
    return null;
  }
}

/** 測試用：注入記憶體 storage */
export function setCacheStorage(s: KVStorage | null): void {
  storage = s;
}

export function cacheKey(playerId: string, kind: 'logs' | 'sessions' | 'orders'): string {
  return `bhq:cache:${playerId}:${kind}`;
}

function readEntry<T>(key: string): CacheEntry<T> | null {
  try {
    const raw = getStorage()?.getItem(key);
    return raw ? (JSON.parse(raw) as CacheEntry<T>) : null;
  } catch {
    return null;
  }
}

function writeEntry<T>(key: string, entry: CacheEntry<T>): void {
  try {
    getStorage()?.setItem(key, JSON.stringify(entry));
  } catch {
    /* storage 滿了或被封鎖：快取只是加速，失敗不影響功能 */
  }
}

/** 命中（未過期且 rev 相同）回傳資料，否則 null */
export function readCache<T>(key: string, rev?: number, now: number = Date.now()): T[] | null {
  const e = readEntry<T>(key);
  if (!e) return null;
  if (now - e.fetchedAt >= CACHE_TTL_MS) return null;
  if (rev !== undefined && e.rev !== undefined && e.rev !== rev) return null;
  return e.data;
}

export function writeCache<T>(key: string, data: T[], rev?: number, now: number = Date.now()): void {
  writeEntry(key, { data, fetchedAt: now, rev });
}

/**
 * 自己寫入後就地更新：新項目放最前面、同 id 取代，保留原本的 fetchedAt（不延長 TTL）。
 * 快取不存在時不建立（下次開啟分頁再完整抓取）。
 */
export function upsertCache<T extends { id: string }>(key: string, items: T[], rev?: number, max = 50): void {
  const e = readEntry<T>(key);
  if (!e) return;
  const ids = new Set(items.map((i) => i.id));
  const data = [...items, ...e.data.filter((d) => !ids.has(d.id))].slice(0, max);
  writeEntry(key, { data, fetchedAt: e.fetchedAt, rev: rev ?? e.rev });
}

export function clearCache(playerId: string): void {
  for (const k of ['logs', 'sessions', 'orders'] as const) {
    try {
      getStorage()?.removeItem(cacheKey(playerId, k));
    } catch {
      /* ignore */
    }
  }
}
