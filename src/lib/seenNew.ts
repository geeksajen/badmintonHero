/** 地圖 NEW 徽章：首次點開後消失（spec §12.6）。純本機顯示狀態，存 localStorage 即可。 */
const KEY = 'bhq:seenNewNodes';

export function readSeenNew(): Set<string> {
  try {
    return new Set(JSON.parse(localStorage.getItem(KEY) ?? '[]') as string[]);
  } catch {
    return new Set();
  }
}

export function markSeenNew(nodeId: string): void {
  try {
    const s = readSeenNew();
    s.add(nodeId);
    localStorage.setItem(KEY, JSON.stringify([...s]));
  } catch {
    /* ignore */
  }
}
