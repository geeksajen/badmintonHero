/**
 * Firestore 正式實作（spec §10）。
 *
 * 額度硬性規則（spec §2.2 ③ / ④）：
 * - 全 app 只有兩個 onSnapshot，都在這個檔案，而且只由 GameProvider 各呼叫一次：
 *   players/{id} 與 players/{id}/state/questProgress
 * - 歷史型資料一律 getDocs ＋ limit(20) ＋ 1 小時快取，不監聽
 * - 所有會動到 player 的動作都在 runTransaction 內一次寫完
 */
import {
  collection,
  doc,
  getDocs,
  limit,
  onSnapshot,
  orderBy,
  query,
  runTransaction,
  updateDoc,
  where,
  writeBatch,
  type DocumentData,
  type DocumentReference,
  type Firestore,
  type Transaction,
  type WriteBatch,
} from 'firebase/firestore';
import { onAuthStateChanged, signInWithEmailAndPassword, signOut } from 'firebase/auth';
import { createInitialState, type ActionResult } from '../engine/actions';
import { getFirebase } from '../lib/firebase';
import { countRead, countWrite } from '../lib/firestore-counter';
import type { ActivityLog, Player, PracticeSession, QuestProgressDoc, RedemptionOrder } from '../types';
import { cacheKey, readCache, writeCache } from './cache';
import { applyResultToCaches, HISTORY_LIMIT, makeCtx, writeCountOf } from './common';
import type { GameAction, GameStore } from './types';

const refs = (db: Firestore, pid: string) => ({
  player: doc(db, 'players', pid) as DocumentReference<Player>,
  progress: doc(db, 'players', pid, 'state', 'questProgress') as DocumentReference<QuestProgressDoc>,
  logs: collection(db, 'players', pid, 'logs'),
  sessions: collection(db, 'players', pid, 'sessions'),
  orders: collection(db, 'players', pid, 'orders'),
});

/** 監聽收到的最新狀態：離線時 dispatch 以它為基礎改用 batch 寫入 */
const latest: { player: Player | null; progress: QuestProgressDoc | null } = { player: null, progress: null };

function writeResult(w: Transaction | WriteBatch, db: Firestore, pid: string, r: ActionResult) {
  const R = refs(db, pid);
  // Transaction 與 WriteBatch 的 set 多載簽章不相容，統一包成一個函式
  const set = (ref: DocumentReference<DocumentData>, data: object) =>
    (w as { set: (ref: DocumentReference<DocumentData>, data: object) => unknown }).set(ref, data);
  if (r.playerChanged) set(R.player as DocumentReference<DocumentData>, r.player);
  if (r.progressChanged) set(R.progress as DocumentReference<DocumentData>, r.progress);
  for (const log of r.logs) set(doc(R.logs, log.id), log);
  if (r.session) set(doc(R.sessions, r.session.id), r.session);
  for (const o of r.orders ?? []) set(doc(R.orders, o.id), o);
}

function isUnavailable(e: unknown): boolean {
  const code = (e as { code?: string })?.code;
  return code === 'unavailable' || code === 'failed-precondition' || code === 'deadline-exceeded';
}

export const firebaseAdapter: GameStore = {
  mode: 'firebase',

  auth: {
    onChange(cb) {
      const { auth } = getFirebase();
      return onAuthStateChanged(auth, (u) => cb(u ? { uid: u.uid, email: u.email } : null));
    },
    async signIn(email, password) {
      await signInWithEmailAndPassword(getFirebase().auth, email, password);
    },
    async signOut() {
      await signOut(getFirebase().auth);
    },
  },

  // 【監聽 1 / 2】—— 全 app 唯二的 onSnapshot
  subscribePlayer(playerId, cb, onError) {
    const { db } = getFirebase();
    return onSnapshot(
      refs(db, playerId).player,
      (snap) => {
        if (!snap.metadata.fromCache) countRead(1, 'onSnapshot:player');
        latest.player = snap.exists() ? snap.data() : null;
        cb(latest.player);
      },
      (e) => onError(e),
    );
  },

  subscribeProgress(playerId, cb, onError) {
    const { db } = getFirebase();
    return onSnapshot(
      refs(db, playerId).progress,
      (snap) => {
        if (!snap.metadata.fromCache) countRead(1, 'onSnapshot:questProgress');
        latest.progress = snap.exists() ? snap.data() : null;
        cb(latest.progress);
      },
      (e) => onError(e),
    );
  },

  async initPlayer(playerId) {
    const { db } = getFirebase();
    const R = refs(db, playerId);
    await runTransaction(db, async (tx) => {
      const snap = await tx.get(R.player);
      countRead(1, 'initPlayer');
      if (snap.exists()) return;
      const s = createInitialState(makeCtx(null), { playerId });
      tx.set(R.player, s.player);
      tx.set(R.progress, s.progress);
      countWrite(2, 'initPlayer');
    });
  },

  async dispatch<I>(playerId: string, action: GameAction<I>, input: I): Promise<ActionResult> {
    const { db } = getFirebase();
    const R = refs(db, playerId);
    const orderId =
      input && typeof input === 'object' && 'order' in input ? (input as { order: RedemptionOrder }).order.id : null;

    const runOffline = () => {
      // 離線：runTransaction 需要連線，改以監聽到的最新狀態計算，batch 會排隊到恢復連線
      if (!latest.player || !latest.progress) throw new Error('跟教練的連線斷掉了，等一下喔');
      const r = action({ player: latest.player, progress: latest.progress }, makeCtx(latest.player), input);
      const batch = writeBatch(db);
      writeResult(batch, db, playerId, r);
      void batch.commit();
      countWrite(writeCountOf(r), 'batch(offline)');
      return r;
    };

    let r: ActionResult;
    if (typeof navigator !== 'undefined' && navigator.onLine === false) {
      r = runOffline();
    } else {
      try {
        r = await runTransaction(db, async (tx) => {
          const [ps, qs, os] = await Promise.all([
            tx.get(R.player),
            tx.get(R.progress),
            orderId ? tx.get(doc(R.orders, orderId)) : Promise.resolve(null),
          ]);
          countRead(orderId ? 3 : 2, 'tx:get');
          if (!ps.exists() || !qs.exists()) throw new Error('找不到玩家資料');
          let finalInput = input;
          if (orderId && os?.exists()) finalInput = { ...input, order: os.data() as RedemptionOrder };
          const res = action({ player: ps.data(), progress: qs.data() }, makeCtx(ps.data()), finalInput);
          writeResult(tx, db, playerId, res);
          return res;
        });
        countWrite(writeCountOf(r), 'tx:commit');
      } catch (e) {
        if (!isUnavailable(e)) throw e;
        r = runOffline();
      }
    }
    applyResultToCaches(playerId, r);
    return r;
  },

  async saveCount(playerId, nodeId, count) {
    const { db } = getFirebase();
    // 只更新一個欄位；離線時會排隊，不阻塞 UI
    void updateDoc(refs(db, playerId).progress, {
      [`byNodeId.${nodeId}.currentCount`]: count,
      updatedAt: new Date().toISOString(),
    });
    countWrite(1, 'saveCount');
  },

  async fetchLogs(playerId, rev, force) {
    const key = cacheKey(playerId, 'logs');
    const hit = force ? null : readCache<ActivityLog>(key, rev);
    if (hit) return hit;
    const { db } = getFirebase();
    const snap = await getDocs(query(refs(db, playerId).logs, orderBy('createdAt', 'desc'), limit(HISTORY_LIMIT)));
    countRead(Math.max(1, snap.size), 'getDocs:logs');
    const data = snap.docs.map((d) => d.data() as ActivityLog);
    writeCache(key, data, rev);
    return data;
  },

  async fetchSessions(playerId, rev, force) {
    const key = cacheKey(playerId, 'sessions');
    const hit = force ? null : readCache<PracticeSession>(key, rev);
    if (hit) return hit;
    const { db } = getFirebase();
    const snap = await getDocs(
      query(refs(db, playerId).sessions, orderBy('createdAt', 'desc'), limit(HISTORY_LIMIT)),
    );
    countRead(Math.max(1, snap.size), 'getDocs:sessions');
    const data = snap.docs.map((d) => d.data() as PracticeSession);
    writeCache(key, data, rev);
    return data;
  },

  async fetchOrders(playerId, rev, force) {
    const key = cacheKey(playerId, 'orders');
    const hit = force ? null : readCache<RedemptionOrder>(key, rev);
    if (hit) return hit;
    const { db } = getFirebase();
    const col = refs(db, playerId).orders;
    // 最近 20 筆 ＋ 所有 pending（單欄位 where，不需要複合索引，spec §10.4）
    const [recent, pending] = await Promise.all([
      getDocs(query(col, orderBy('requestedAt', 'desc'), limit(HISTORY_LIMIT))),
      getDocs(query(col, where('status', '==', 'pending'), limit(HISTORY_LIMIT))),
    ]);
    countRead(Math.max(1, recent.size) + Math.max(1, pending.size), 'getDocs:orders');
    const map = new Map<string, RedemptionOrder>();
    for (const d of [...recent.docs, ...pending.docs]) map.set(d.id, d.data() as RedemptionOrder);
    const data = [...map.values()].sort((a, b) => b.requestedAt.localeCompare(a.requestedAt));
    writeCache(key, data, rev);
    return data;
  },
};
