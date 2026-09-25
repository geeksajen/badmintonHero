import { useCallback, useEffect, useRef, useState } from 'react';
import type { ActivityLog, PracticeSession, RedemptionOrder } from '../types';
import { useGameActions } from './useGameActions';

interface HistoryMap {
  logs: ActivityLog;
  sessions: PracticeSession;
  orders: RedemptionOrder;
}

/**
 * 歷史型資料：getDocs ＋ 1 小時快取（spec §2.2 ③-4），不監聽。
 * rev 來自 player 文件（另一台裝置寫入時會變），是 primitive，放進 deps 安全。
 */
export function useHistory<K extends keyof HistoryMap>(kind: K, rev: number) {
  const actions = useGameActions();
  const [data, setData] = useState<HistoryMap[K][]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tick, setTick] = useState(0);
  const forceNext = useRef(false);

  useEffect(() => {
    let alive = true;
    const force = forceNext.current;
    forceNext.current = false;
    setLoading(true);
    const fetcher =
      kind === 'logs' ? actions.fetchLogs : kind === 'sessions' ? actions.fetchSessions : actions.fetchOrders;
    (fetcher(rev, force) as Promise<HistoryMap[K][]>)
      .then((d) => {
        if (!alive) return;
        setData(d);
        setError(null);
      })
      .catch((e: Error) => alive && setError(e.message))
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, [actions, kind, rev, tick]);

  const refresh = useCallback(() => {
    forceNext.current = true;
    setTick((t) => t + 1);
  }, []);

  return { data, loading, error, refresh };
}
