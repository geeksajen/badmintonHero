import { beforeEach, describe, expect, it } from 'vitest';
import { CACHE_TTL_MS, readCache, setCacheStorage, upsertCache, writeCache, type KVStorage } from '../src/store/cache';

function memStorage(): KVStorage {
  const m = new Map<string, string>();
  return {
    getItem: (k) => m.get(k) ?? null,
    setItem: (k, v) => void m.set(k, v),
    removeItem: (k) => void m.delete(k),
  };
}

type Item = { id: string; v: number };

describe('cache.ts（1 小時 TTL）', () => {
  beforeEach(() => setCacheStorage(memStorage()));

  it('未過期直接命中，不需重抓', () => {
    writeCache<Item>('k', [{ id: 'a', v: 1 }], 1, 1000);
    expect(readCache<Item>('k', 1, 1000 + CACHE_TTL_MS - 1)).toEqual([{ id: 'a', v: 1 }]);
  });

  it('過期回傳 null', () => {
    writeCache<Item>('k', [{ id: 'a', v: 1 }], 1, 1000);
    expect(readCache<Item>('k', 1, 1000 + CACHE_TTL_MS)).toBeNull();
  });

  it('rev 不同（另一台裝置寫入過）視為失效', () => {
    writeCache<Item>('k', [{ id: 'a', v: 1 }], 1, 1000);
    expect(readCache<Item>('k', 2, 1001)).toBeNull();
  });

  it('寫入後就地更新：新項目放最前、同 id 取代、不延長 TTL、rev 跟著更新', () => {
    writeCache<Item>('k', [{ id: 'a', v: 1 }, { id: 'b', v: 1 }], 1, 1000);
    upsertCache<Item>('k', [{ id: 'c', v: 1 }, { id: 'a', v: 2 }], 2);
    expect(readCache<Item>('k', 2, 1001)).toEqual([{ id: 'c', v: 1 }, { id: 'a', v: 2 }, { id: 'b', v: 1 }]);
    expect(readCache<Item>('k', 2, 1000 + CACHE_TTL_MS)).toBeNull();
  });

  it('快取不存在時 upsert 不建立', () => {
    upsertCache<Item>('none', [{ id: 'x', v: 1 }], 1);
    expect(readCache<Item>('none', 1)).toBeNull();
  });
});
