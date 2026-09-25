import { useMemo } from 'react';
import * as A from '../engine/actions';
import type { GameAction } from '../store';
import { useGameState } from './useGameState';

/** UI 呼叫遊戲動作的唯一入口；實際讀寫由 store adapter 處理 */
export function useGameActions() {
  const { store, playerId } = useGameState();
  return useMemo(() => {
    const run = <I,>(action: GameAction<I>, input: I) => {
      if (!store) return Promise.reject(new Error('尚未連線'));
      return store.dispatch(playerId, action, input);
    };
    return {
      checkIn: (i: Parameters<typeof A.checkIn>[2] = {}) => run(A.checkIn, i),
      submitQuest: (i: Parameters<typeof A.submitQuest>[2]) => run(A.submitQuest, i),
      approveQuest: (i: Parameters<typeof A.approveQuest>[2]) => run(A.approveQuest, i),
      retryQuest: (i: Parameters<typeof A.retryQuest>[2]) => run(A.retryQuest, i),
      grantBonus: (i: Parameters<typeof A.grantBonus>[2]) => run(A.grantBonus, i),
      sendCoachNote: (i: Parameters<typeof A.sendCoachNote>[2]) => run(A.sendCoachNote, i),
      redeemReward: (i: Parameters<typeof A.redeemReward>[2]) => run(A.redeemReward, i),
      fulfillOrder: (i: Parameters<typeof A.fulfillOrder>[2]) => run(A.fulfillOrder, i),
      cancelOrder: (i: Parameters<typeof A.cancelOrder>[2]) => run(A.cancelOrder, i),
      graduate: (i: Parameters<typeof A.graduate>[2] = {}) => run(A.graduate, i),
      reconcile: () => run(A.reconcileAction, undefined),
      setShopOverride: (i: Parameters<typeof A.setShopOverride>[2]) => run(A.setShopOverride, i),
      updateProfile: (i: Parameters<typeof A.updateProfile>[2]) => run(A.updateProfile, i),
      adminAdjust: (i: Parameters<typeof A.adminAdjust>[2]) => run(A.adminAdjust, i),
      resetProgress: () => run(A.resetProgress, undefined),
      saveCount: (nodeId: string, count: number) =>
        store ? store.saveCount(playerId, nodeId, count) : Promise.resolve(),
      fetchLogs: (rev: number, force?: boolean) => (store ? store.fetchLogs(playerId, rev, force) : Promise.resolve([])),
      fetchSessions: (rev: number, force?: boolean) =>
        store ? store.fetchSessions(playerId, rev, force) : Promise.resolve([]),
      fetchOrders: (rev: number, force?: boolean) =>
        store ? store.fetchOrders(playerId, rev, force) : Promise.resolve([]),
      signOut: () => (store ? store.auth.signOut() : Promise.resolve()),
    };
  }, [store, playerId]);
}

export type GameActions = ReturnType<typeof useGameActions>;
