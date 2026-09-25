import { useCallback, useEffect, useState } from 'react';
import type { CelebrationItem, LiveEvent } from '../types';

/** 超過這個時間的事件不補播（例如全新裝置第一次開啟時，不播幾天前的舊動畫） */
const STALE_MS = 30 * 60 * 1000;

function seenKey(playerId: string) {
  return `bhq:lastEventId:${playerId}`;
}

function readSeen(playerId: string): string | null {
  try {
    return localStorage.getItem(seenKey(playerId));
  } catch {
    return null;
  }
}

function writeSeen(playerId: string, id: string) {
  try {
    localStorage.setItem(seenKey(playerId), id);
  } catch {
    /* ignore */
  }
}

/**
 * 依 player.lastEvent 排隊播放慶祝動畫（spec §7.1 / §10.2）。
 * - 以 lastEvent.id 去重：播過（或收到過）的 id 記在 localStorage，重新整理／重連不會重播
 * - 動畫一個一個播，不會疊放；新事件接在佇列尾端
 */
export function useCelebrationQueue(playerId: string, lastEvent: LiveEvent | undefined) {
  const [queue, setQueue] = useState<CelebrationItem[]>([]);

  useEffect(() => {
    if (!lastEvent) return;
    if (readSeen(playerId) === lastEvent.id) return;
    writeSeen(playerId, lastEvent.id); // 先記住，避免重複觸發
    if (Date.now() - new Date(lastEvent.createdAt).getTime() > STALE_MS) return;
    setQueue((q) => [...q, ...lastEvent.items]);
  }, [playerId, lastEvent]);

  const next = useCallback(() => setQueue((q) => q.slice(1)), []);
  const enqueueLocal = useCallback((items: CelebrationItem[]) => setQueue((q) => [...q, ...items]), []);

  return { current: queue[0] ?? null, remaining: queue.length, next, enqueueLocal };
}
