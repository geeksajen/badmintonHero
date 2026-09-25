/**
 * Step 4 驗收 #2 的程式化版本：完整跑一次模擬練習
 * （開 App ＋ 簽到 ＋ 5 次核可 ＋ 2 次獎勵 ＋ 1 次兌換 ＋ 看兩次日誌），單一裝置讀取 < 100。
 * 透過 localAdapter（與 firebaseAdapter 相同的讀寫記帳規則）驗證資料流設計沒有放大讀取。
 */
import { beforeAll, describe, expect, it } from 'vitest';
import type { KVStorage } from '../src/store/cache';

function memStorage(): KVStorage & { clear(): void } {
  const m = new Map<string, string>();
  return {
    getItem: (k) => m.get(k) ?? null,
    setItem: (k, v) => void m.set(k, v),
    removeItem: (k) => void m.delete(k),
    clear: () => m.clear(),
  };
}

beforeAll(() => {
  (globalThis as unknown as { localStorage: KVStorage }).localStorage = memStorage();
});

describe('一次練習的讀取預算', () => {
  it('單一裝置讀取 < 100，且日誌 1 小時內第二次開啟不再讀取', async () => {
    const { localAdapter: store } = await import('../src/store/localAdapter');
    const { getCounterStats, resetCounter } = await import('../src/lib/firestore-counter');
    const A = await import('../src/engine/actions');
    const pid = 'budget';

    await store.initPlayer(pid);
    resetCounter();

    let latestPlayer: import('../src/types').Player | null = null;
    const u1 = store.subscribePlayer(pid, (p) => (latestPlayer = p), () => {});
    const u2 = store.subscribeProgress(pid, () => {}, () => {});

    await store.dispatch(pid, A.checkIn, {});
    const plan: [string, number][] = [['q1_1', 5], ['q1_2', 3], ['q1_3', 5], ['q1_4', 3], ['q1_5', 3]];
    for (const [nodeId, count] of plan) {
      await store.saveCount(pid, nodeId, count); // 小孩 ＋1（debounce 後一次）
      await store.dispatch(pid, A.submitQuest, { nodeId, count });
      await store.dispatch(pid, A.approveQuest, { nodeId });
    }
    await store.dispatch(pid, A.grantBonus, { exp: 20, coins: 10 });
    await store.dispatch(pid, A.grantBonus, { exp: 10, coins: 5 });
    await store.dispatch(pid, A.redeemReward, { itemId: 'rw_cartoon' });

    const rev = latestPlayer!.logsRev ?? 0;
    const logs1 = await store.fetchLogs(pid, rev);
    const readsAfterFirst = getCounterStats().reads;
    const logs2 = await store.fetchLogs(pid, rev);
    expect(getCounterStats().reads).toBe(readsAfterFirst); // 快取命中，0 讀取
    expect(logs2).toEqual(logs1);
    expect(logs1.length).toBeLessThanOrEqual(20);

    const { reads, writes, byLabel } = getCounterStats();
    console.log(`一次模擬練習：reads=${reads} writes=${writes}`, byLabel);
    expect(reads).toBeLessThan(100);

    u1();
    u2();
  });
});
