/**
 * Local Mode（spec §2.3）：localStorage 實作，開發、除錯、跑動畫時一律用它，避免消耗 Firestore 額度。
 * 同一台裝置的兩個分頁透過 `storage` 事件即時同步（Step 3 驗收：Admin 分頁核可 → Player 分頁更新）。
 * 讀寫同樣經過 firestore-counter 記帳，讓迴圈在 Local Mode 就會被抓到。
 */
import { createInitialState, type ActionResult } from '../engine/actions';
import { countRead, countWrite } from '../lib/firestore-counter';
import type { ActivityLog, Player, PracticeSession, QuestProgressDoc, RedemptionOrder } from '../types';
import { cacheKey, readCache, writeCache } from './cache';
import { applyResultToCaches, HISTORY_LIMIT, makeCtx, MAX_SESSION_PAGES, writeCountOf } from './common';
import type { AuthUser, GameAction, GameStore, Unsubscribe } from './types';

const PREFIX = 'bhq:local:';
const k = (pid: string, part: 'player' | 'progress' | 'logs' | 'sessions' | 'orders') => `${PREFIX}${pid}:${part}`;

function read<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

/** JSON 化時去掉 undefined 欄位，行為與 Firestore 的 ignoreUndefinedProperties 一致 */
function write(key: string, value: unknown): void {
  localStorage.setItem(key, JSON.stringify(value));
}

type Listener = (raw: string | null) => void;
const listeners = new Map<string, Set<Listener>>();

function listen(key: string, fn: Listener): Unsubscribe {
  let set = listeners.get(key);
  if (!set) listeners.set(key, (set = new Set()));
  set.add(fn);
  return () => {
    set!.delete(fn);
  };
}

function emit(key: string) {
  const raw = localStorage.getItem(key);
  listeners.get(key)?.forEach((fn) => fn(raw));
}

// 其他分頁寫入 → 本分頁收到 storage 事件
if (typeof window !== 'undefined') {
  window.addEventListener('storage', (e) => {
    if (e.key && listeners.has(e.key)) listeners.get(e.key)!.forEach((fn) => fn(e.newValue));
  });
}

function subscribeDoc<T>(key: string, label: string, cb: (v: T | null) => void): Unsubscribe {
  // 先註冊再送初始值：初始值的 callback 可能同步觸發寫入（例如 initPlayer），不能漏接
  const unsub = listen(key, (raw) => {
    countRead(1, label); // 每次變更
    cb(raw ? (JSON.parse(raw) as T) : null);
  });
  countRead(1, label); // 初次訂閱
  cb(read<T>(key));
  return unsub;
}

function mergeById<T extends { id: string }>(items: T[], existing: T[]): T[] {
  const ids = new Set(items.map((i) => i.id));
  return [...items, ...existing.filter((e) => !ids.has(e.id))];
}

const LOCAL_USER: AuthUser = { uid: 'local', email: 'local@device' };

export const localAdapter: GameStore = {
  mode: 'local',

  auth: {
    onChange(cb) {
      cb(LOCAL_USER);
      return () => {};
    },
    async signIn() {},
    async signOut() {},
  },

  subscribePlayer(playerId, cb) {
    return subscribeDoc<Player>(k(playerId, 'player'), 'onSnapshot:player', cb);
  },

  subscribeProgress(playerId, cb) {
    return subscribeDoc<QuestProgressDoc>(k(playerId, 'progress'), 'onSnapshot:questProgress', cb);
  },

  async initPlayer(playerId) {
    if (read<Player>(k(playerId, 'player'))) return;
    const s = createInitialState(makeCtx(null), { playerId });
    write(k(playerId, 'player'), s.player);
    write(k(playerId, 'progress'), s.progress);
    countWrite(2, 'initPlayer');
    emit(k(playerId, 'player'));
    emit(k(playerId, 'progress'));
  },

  async dispatch<I>(playerId: string, action: GameAction<I>, input: I): Promise<ActionResult> {
    const player = read<Player>(k(playerId, 'player'));
    const progress = read<QuestProgressDoc>(k(playerId, 'progress'));
    countRead(2, 'tx:get');
    if (!player || !progress) throw new Error('找不到玩家資料');

    // 與 Firebase 版一致：訂單以儲存的最新狀態為準
    let finalInput = input;
    if (input && typeof input === 'object' && 'order' in input) {
      const o = (input as { order: RedemptionOrder }).order;
      const fresh = (read<RedemptionOrder[]>(k(playerId, 'orders')) ?? []).find((x) => x.id === o.id);
      countRead(1, 'tx:get order');
      if (fresh) finalInput = { ...input, order: fresh };
    }

    const r = action({ player, progress }, makeCtx(player), finalInput);

    if (r.logs.length) {
      const logs = read<ActivityLog[]>(k(playerId, 'logs')) ?? [];
      write(k(playerId, 'logs'), [...[...r.logs].reverse(), ...logs].slice(0, 500));
    }
    if (r.session) {
      const sessions = read<PracticeSession[]>(k(playerId, 'sessions')) ?? [];
      write(k(playerId, 'sessions'), mergeById([r.session], sessions));
    }
    if (r.orders?.length) {
      const orders = read<RedemptionOrder[]>(k(playerId, 'orders')) ?? [];
      write(k(playerId, 'orders'), mergeById(r.orders, orders));
    }
    if (r.progressChanged) write(k(playerId, 'progress'), r.progress);
    if (r.playerChanged) write(k(playerId, 'player'), r.player);
    countWrite(writeCountOf(r), 'tx:commit');

    applyResultToCaches(playerId, r);
    if (r.progressChanged) emit(k(playerId, 'progress'));
    if (r.playerChanged) emit(k(playerId, 'player'));
    return r;
  },

  async saveCount(playerId, nodeId, count) {
    const progress = read<QuestProgressDoc>(k(playerId, 'progress'));
    const prog = progress?.byNodeId[nodeId];
    if (!progress || !prog || prog.currentCount === count) return;
    const next: QuestProgressDoc = {
      byNodeId: { ...progress.byNodeId, [nodeId]: { ...prog, currentCount: count } },
      updatedAt: new Date().toISOString(),
    };
    write(k(playerId, 'progress'), next);
    countWrite(1, 'saveCount');
    emit(k(playerId, 'progress'));
  },

  async fetchLogs(playerId, rev, force) {
    const key = cacheKey(playerId, 'logs');
    const hit = force ? null : readCache<ActivityLog>(key, rev);
    if (hit) return hit;
    const data = (read<ActivityLog[]>(k(playerId, 'logs')) ?? []).slice(0, HISTORY_LIMIT);
    countRead(Math.max(1, data.length), 'getDocs:logs');
    writeCache(key, data, rev);
    return data;
  },

  async fetchSessions(playerId, rev, force) {
    const key = cacheKey(playerId, 'sessions');
    const hit = force ? null : readCache<PracticeSession>(key, rev);
    if (hit) return hit;
    const data = (read<PracticeSession[]>(k(playerId, 'sessions')) ?? [])
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .slice(0, HISTORY_LIMIT);
    countRead(Math.max(1, data.length), 'getDocs:sessions');
    writeCache(key, data, rev);
    return data;
  },

  async fetchAllSessions(playerId) {
    const data = (read<PracticeSession[]>(k(playerId, 'sessions')) ?? [])
      .sort((a, b) => a.createdAt.localeCompare(b.createdAt))
      .slice(0, HISTORY_LIMIT * MAX_SESSION_PAGES);
    countRead(Math.max(1, data.length), 'getDocs:allSessions');
    return data;
  },

  async fetchOrders(playerId, rev, force) {
    const key = cacheKey(playerId, 'orders');
    const hit = force ? null : readCache<RedemptionOrder>(key, rev);
    if (hit) return hit;
    const all = (read<RedemptionOrder[]>(k(playerId, 'orders')) ?? []).sort((a, b) =>
      b.requestedAt.localeCompare(a.requestedAt),
    );
    // 與 Firebase 版一致：最近 20 筆 ＋ 所有 pending
    const data = mergeById(all.slice(0, HISTORY_LIMIT), all.filter((o) => o.status === 'pending'));
    countRead(Math.max(1, data.length), 'getDocs:orders');
    writeCache(key, data, rev);
    return data;
  },
};
