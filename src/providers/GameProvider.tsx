import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { getCurriculum } from '../data';
import { reconcileAction } from '../engine/actions';
import { getStore, PLAYER_ID, type AuthUser, type GameStore } from '../store';
import type { Player, QuestProgressDoc } from '../types';
import { GameContext, type GameContextValue, type GameStatus } from './gameContext';

/**
 * ★ 全 app 唯二的即時監聽在這裡建立（spec §2.2 ③-1）：
 *   players/{id} 與 players/{id}/state/questProgress。
 *   建立監聽的 useEffect 依賴陣列必須是 []，並回傳 unsubscribe。
 *   元件一律透過 context 讀資料，禁止自行訂閱。
 */
export function GameProvider({ children }: { children: ReactNode }) {
  const [store, setStore] = useState<GameStore | null>(null);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [authKnown, setAuthKnown] = useState(false);
  const [player, setPlayer] = useState<Player | null>(null);
  const [progress, setProgress] = useState<QuestProgressDoc | null>(null);
  const [loaded, setLoaded] = useState({ player: false, progress: false });
  const [error, setError] = useState<string | null>(null);
  const [online, setOnline] = useState(() => (typeof navigator === 'undefined' ? true : navigator.onLine));

  useEffect(() => {
    let cancelled = false;
    let unsubAuth: () => void = () => {};
    let unsubData: Array<() => void> = [];
    let initRequested = false;
    const stopData = () => {
      unsubData.forEach((u) => u());
      unsubData = [];
    };
    const onErr = (e: Error) => setError(e.message || String(e));

    getStore()
      .then((s) => {
        if (cancelled) return;
        setStore(s);
        unsubAuth = s.auth.onChange((u) => {
          setUser(u);
          setAuthKnown(true);
          if (!u) {
            stopData();
            setPlayer(null);
            setProgress(null);
            setLoaded({ player: false, progress: false });
            return;
          }
          if (unsubData.length > 0) return; // 已在監聽，不重複訂閱
          unsubData = [
            s.subscribePlayer(
              PLAYER_ID,
              (p) => {
                setPlayer(p);
                setLoaded((l) => (l.player ? l : { ...l, player: true }));
                if (!p && !initRequested) {
                  initRequested = true;
                  s.initPlayer(PLAYER_ID).catch(onErr);
                }
              },
              onErr,
            ),
            s.subscribeProgress(
              PLAYER_ID,
              (d) => {
                setProgress(d);
                setLoaded((l) => (l.progress ? l : { ...l, progress: true }));
              },
              onErr,
            ),
          ];
        });
      })
      .catch(onErr);

    const on = () => setOnline(true);
    const off = () => setOnline(false);
    window.addEventListener('online', on);
    window.addEventListener('offline', off);
    return () => {
      cancelled = true;
      unsubAuth();
      stopData();
      window.removeEventListener('online', on);
      window.removeEventListener('offline', off);
    };
  }, []);

  const curriculum = getCurriculum(player?.curriculumId);

  // 關卡表改版 → 自動 reconcile 一次（spec §12.5）。ref 保證每個 session 最多一次，不會迴圈。
  const reconcileTried = useRef(false);
  const needsReconcile = !!player && !!progress && player.curriculumVersion < curriculum.version;
  useEffect(() => {
    if (!needsReconcile || !store || reconcileTried.current) return;
    reconcileTried.current = true;
    store.dispatch(PLAYER_ID, reconcileAction, undefined).catch((e: Error) => console.error('reconcile 失敗', e));
  }, [needsReconcile, store]);

  const status: GameStatus = error
    ? 'error'
    : !store || !authKnown
      ? 'loading'
      : !user
        ? 'needs-login'
        : loaded.player && loaded.progress && player && progress
          ? 'ready'
          : 'loading';

  const value = useMemo<GameContextValue>(
    () => ({ status, error, store, playerId: PLAYER_ID, user, player, progress, curriculum, online }),
    [status, error, store, user, player, progress, curriculum, online],
  );

  return <GameContext.Provider value={value}>{children}</GameContext.Provider>;
}
