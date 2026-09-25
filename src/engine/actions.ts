/**
 * 所有會改變遊戲狀態的動作，全部是純函式：(目前狀態, 輸入) → 新狀態 ＋ 要追加的紀錄。
 *
 * localAdapter 與 firebaseAdapter 共用這裡的邏輯：
 * firebase 端在 runTransaction 內讀出 player ＋ questProgress，呼叫 action，再一次寫回
 * （spec §6.2：核可的所有寫入必須在同一個 transaction 內完成）。
 */
import type {
  ActivityLog,
  Curriculum,
  LiveEvent,
  PracticeSession,
  Player,
  QuestProgress,
  QuestProgressDoc,
  RedemptionOrder,
  ShopOverrides,
} from '../types';
import { milestoneFor } from './attendance';
import { applyRedeem, applyRefund, effectiveRewards } from './economy';
import {
  addLog,
  addToActiveSession,
  finishLevelUps,
  fmtReward,
  giveEquipment,
  giveExpCoins,
  giveTitle,
  startGrants,
  type Ctx,
  type Grants,
} from './grant';
import { checkGraduation } from './graduation';
import { reconcile } from './reconcile';
import { settleNode } from './settle';
import { emptyProgress, fillMissingProgress, unlockAll } from './unlock';
import { toDateStr } from './util';

export type { Ctx } from './grant';

export interface GameState {
  player: Player;
  progress: QuestProgressDoc;
}

export interface ActionResult {
  player: Player;
  progress: QuestProgressDoc;
  playerChanged: boolean;
  progressChanged: boolean;
  logs: ActivityLog[];
  session?: PracticeSession; // upsert sessions/{id}
  orders?: RedemptionOrder[]; // upsert orders/{id}
}

export const RETRY_DEFAULT_MESSAGE = '再試一次就會更棒！';

// ---------------------------------------------------------------------------
// 初始狀態
// ---------------------------------------------------------------------------

export function createInitialState(
  ctx: Ctx,
  opts: { playerId: string; name?: string; avatar?: string },
): GameState {
  const { curriculum, now } = ctx;
  const byNodeId: Record<string, QuestProgress> = {};
  for (const n of curriculum.quests) byNodeId[n.id] = emptyProgress(n.id);
  const active = curriculum.quests.filter((n) => !n.isRetired);
  const unlocked = unlockAll(active, byNodeId).byNodeId; // parentIds 為空的起點
  const iso = now.toISOString();
  return {
    player: {
      id: opts.playerId,
      name: opts.name ?? '小勇者',
      avatar: opts.avatar ?? '🧒',
      level: 1,
      currentExp: 0,
      totalExp: 0,
      coins: 0,
      totalCoinsEarned: 0,
      currentTitleId: curriculum.initialTitleId,
      unlockedEquipmentIds: [],
      unlockedTitleIds: [curriculum.initialTitleId],
      sessionCount: 0,
      courseStartDate: toDateStr(now),
      curriculumId: curriculum.id,
      curriculumVersion: curriculum.version,
      logsRev: 0,
      ordersRev: 0,
      sessionsRev: 0,
      updatedAt: iso,
    },
    progress: { byNodeId: unlocked, updatedAt: iso },
  };
}

// ---------------------------------------------------------------------------
// 內部工具
// ---------------------------------------------------------------------------

function nodeOf(curriculum: Curriculum, nodeId: string) {
  const node = curriculum.quests.find((n) => n.id === nodeId);
  if (!node) throw new Error(`找不到關卡 ${nodeId}`);
  if (node.isRetired) throw new Error(`關卡 ${nodeId} 已退役`);
  return node;
}

/** 讀出並補齊進度（新節點 → locked 紀錄） */
function prepared(state: GameState, ctx: Ctx): Record<string, QuestProgress> {
  return fillMissingProgress(ctx.curriculum.quests, state.progress.byNodeId) ?? state.progress.byNodeId;
}

function assertNotGraduated(player: Player) {
  if (player.graduatedAt) throw new Error('已經畢業囉，地圖是回顧模式');
}

function sessionFromActive(player: Player, curriculum: Curriculum): PracticeSession | undefined {
  const s = player.activeSession;
  if (!s) return undefined;
  return {
    id: s.id,
    date: s.date,
    durationMin: s.durationMin,
    attendanceExp: curriculum.attendanceExp,
    attendanceCoins: curriculum.attendanceCoins,
    bonusExp: s.bonusExp,
    bonusCoins: s.bonusCoins,
    coachNote: s.coachNote,
    createdAt: s.createdAt,
  };
}

/** 收尾：寫入 lastEvent、各種 rev 戳、推導 session 文件 */
function finish(
  state: GameState,
  ctx: Ctx,
  g: Grants,
  byNodeId: Record<string, QuestProgress>,
  extra: { orders?: RedemptionOrder[]; emitEvent?: boolean } = {},
): ActionResult {
  const iso = ctx.now.toISOString();
  let player = g.player;
  const progressChanged = byNodeId !== state.progress.byNodeId;
  const sessionChanged = player.activeSession !== state.player.activeSession;

  if ((extra.emitEvent ?? true) && g.items.length > 0) {
    const ev: LiveEvent = { id: ctx.newId(), items: g.items, createdAt: iso };
    player = { ...player, lastEvent: ev };
  }
  if (g.logs.length > 0) player = { ...player, logsRev: (player.logsRev ?? 0) + 1 };
  if (extra.orders?.length) player = { ...player, ordersRev: (player.ordersRev ?? 0) + 1 };
  if (sessionChanged) player = { ...player, sessionsRev: (player.sessionsRev ?? 0) + 1 };

  const playerChanged = player !== state.player;
  if (playerChanged) player = { ...player, updatedAt: iso };

  return {
    player,
    progress: progressChanged ? { byNodeId, updatedAt: iso } : state.progress,
    playerChanged,
    progressChanged,
    logs: g.logs,
    session: sessionChanged ? sessionFromActive(player, ctx.curriculum) : undefined,
    orders: extra.orders,
  };
}

// ---------------------------------------------------------------------------
// 6.1 練習簽到
// ---------------------------------------------------------------------------

export function checkIn(state: GameState, ctx: Ctx, input: { durationMin?: number } = {}): ActionResult {
  const { curriculum, now } = ctx;
  const today = toDateStr(now);
  if (state.player.activeSession?.date === today) throw new Error('今天已經簽到過了');

  const g = startGrants(state.player);
  const sessionCount = state.player.sessionCount + 1;
  g.player = {
    ...g.player,
    sessionCount,
    activeSession: {
      id: ctx.newId(),
      date: today,
      expGiven: 0,
      coinsGiven: 0,
      bonusExp: 0,
      bonusCoins: 0,
      durationMin: input.durationMin,
      createdAt: now.toISOString(),
    },
  };

  const exp = curriculum.attendanceExp;
  const coins = curriculum.attendanceCoins;
  giveExpCoins(g, exp, coins);
  addToActiveSession(g, ctx, exp, coins, 'other');
  g.items.push({ kind: 'attendance', sessionCount, exp, coins });
  addLog(g, ctx, {
    type: 'session_checked_in',
    message: `第 ${sessionCount} 次練習開始！${fmtReward(exp, coins)}`,
    expDelta: exp,
    coinDelta: coins,
  });

  const m = milestoneFor(sessionCount, curriculum.milestones);
  if (m) {
    giveExpCoins(g, m.bonusExp, m.bonusCoins);
    addToActiveSession(g, ctx, m.bonusExp, m.bonusCoins, 'other');
    g.items.push({ kind: 'milestone', label: m.label, exp: m.bonusExp, coins: m.bonusCoins });
    addLog(g, ctx, {
      type: 'attendance_milestone',
      message: `🏅 ${m.label} ${fmtReward(m.bonusExp, m.bonusCoins)}`,
      expDelta: m.bonusExp,
      coinDelta: m.bonusCoins,
    });
  }

  finishLevelUps(g, ctx);
  return finish(state, ctx, g, prepared(state, ctx));
}

// ---------------------------------------------------------------------------
// 6.2 任務流程
// ---------------------------------------------------------------------------

/** 小孩端 ＋1 的計數（debounce 後才寫一次），只動進度文件 */
export function saveCount(state: GameState, ctx: Ctx, input: { nodeId: string; count: number }): ActionResult {
  assertNotGraduated(state.player);
  nodeOf(ctx.curriculum, input.nodeId);
  const byNodeId = prepared(state, ctx);
  const prog = byNodeId[input.nodeId];
  if (prog.status === 'locked') throw new Error('這一關還沒解鎖');
  const count = Math.max(0, Math.floor(input.count));
  if (prog.currentCount === count) return finish(state, ctx, startGrants(state.player), byNodeId);
  return finish(state, ctx, startGrants(state.player), { ...byNodeId, [input.nodeId]: { ...prog, currentCount: count } });
}

/** 小孩按【我做到了！】 */
export function submitQuest(state: GameState, ctx: Ctx, input: { nodeId: string; count: number }): ActionResult {
  assertNotGraduated(state.player);
  const node = nodeOf(ctx.curriculum, input.nodeId);
  const byNodeId = prepared(state, ctx);
  const prog = byNodeId[input.nodeId];
  if (prog.status === 'locked') throw new Error('這一關還沒解鎖');

  const count = Math.max(0, Math.floor(input.count));
  const g = startGrants(state.player);
  const next: QuestProgress = {
    ...prog,
    currentCount: count,
    attempts: prog.attempts + 1,
    submittedAt: ctx.now.toISOString(),
    // 已完成節點回頭挑戰銀／金時，status 不回退（不變式 3）
    status: prog.status === 'completed' ? 'completed' : 'submitted',
  };
  addLog(g, ctx, { type: 'quest_submitted', message: `【${node.title}】回報完成 ${count} ${node.unit}，等教練確認中` });
  return finish(state, ctx, g, { ...byNodeId, [input.nodeId]: next });
}

/**
 * 家長【核可通過】。也可在小孩沒回報時直接核可（unlocked → completed 是合法單步轉移）。
 * count 省略時採用小孩回報／目前的 currentCount。
 */
export function approveQuest(
  state: GameState,
  ctx: Ctx,
  input: { nodeId: string; count?: number; feedback?: string },
): ActionResult {
  assertNotGraduated(state.player);
  const node = nodeOf(ctx.curriculum, input.nodeId);
  let byNodeId = prepared(state, ctx);
  const prog = byNodeId[input.nodeId];
  if (prog.status === 'locked') throw new Error('這一關還沒解鎖');

  const count = Math.max(0, Math.floor(input.count ?? prog.currentCount));
  const feedback = input.feedback?.trim() || undefined;
  const g = startGrants(state.player);

  let next: QuestProgress = {
    ...prog,
    bestCount: Math.max(prog.bestCount, count), // 只增不減
    currentCount: 0,
    attempts: prog.submittedAt ? prog.attempts : prog.attempts + 1, // 直接核可也算一次嘗試
    submittedAt: undefined,
    coachFeedback: feedback ?? prog.coachFeedback,
  };
  const settled = settleNode(g, ctx, node, next, { emitTierItems: true });
  next = settled.prog;
  // 審核過但還沒到銅牌：回到可挑戰（bestCount 已保留）
  if (next.status === 'submitted') next = { ...next, status: 'unlocked' };

  // 把階級相關的 EXP 計入今天的練習
  addToActiveSession(g, ctx, g.expTotal, g.coinsTotal, 'other');

  addLog(g, ctx, {
    type: 'quest_approved',
    message:
      settled.newTiers.length > 0
        ? `教練確認【${node.title}】${count} ${node.unit}`
        : `教練確認【${node.title}】${count} ${node.unit}，繼續加油！`,
    coachFeedback: feedback,
  });

  finishLevelUps(g, ctx);

  byNodeId = { ...byNodeId, [input.nodeId]: next };
  const active = ctx.curriculum.quests.filter((n) => !n.isRetired);
  const unlocked = unlockAll(active, byNodeId);
  byNodeId = unlocked.byNodeId;
  if (unlocked.unlockedIds.length > 0) g.items.push({ kind: 'node_unlocked', nodeIds: unlocked.unlockedIds });
  if (feedback) g.items.push({ kind: 'coach_note', text: feedback });

  return finish(state, ctx, g, byNodeId);
}

/** 家長【再練習一次】：零懲罰 —— bestCount 保留、沒有任何扣分 */
export function retryQuest(
  state: GameState,
  ctx: Ctx,
  input: { nodeId: string; feedback?: string },
): ActionResult {
  const node = nodeOf(ctx.curriculum, input.nodeId);
  const byNodeId = prepared(state, ctx);
  const prog = byNodeId[input.nodeId];
  const text = input.feedback?.trim() || RETRY_DEFAULT_MESSAGE;
  const g = startGrants(state.player);
  const next: QuestProgress = {
    ...prog,
    status: prog.status === 'submitted' ? 'unlocked' : prog.status,
    currentCount: 0,
    submittedAt: undefined,
    coachFeedback: text,
  };
  g.items.push({ kind: 'coach_note', text });
  addLog(g, ctx, { type: 'quest_retry', message: `【${node.title}】再練習一次`, coachFeedback: text });
  return finish(state, ctx, g, { ...byNodeId, [input.nodeId]: next });
}

// ---------------------------------------------------------------------------
// 教練即時獎勵 / 一句話
// ---------------------------------------------------------------------------

export function grantBonus(
  state: GameState,
  ctx: Ctx,
  input: { exp: number; coins: number; message?: string },
): ActionResult {
  const exp = Math.max(0, Math.floor(input.exp || 0));
  const coins = Math.max(0, Math.floor(input.coins || 0));
  if (exp === 0 && coins === 0) throw new Error('請輸入 EXP 或金幣');
  const message = input.message?.trim() || undefined;
  const g = startGrants(state.player);
  giveExpCoins(g, exp, coins);
  addToActiveSession(g, ctx, exp, coins, 'bonus');
  g.items.push({ kind: 'bonus', exp, coins, message });
  addLog(g, ctx, {
    type: 'bonus_granted',
    message: `教練獎勵 ${fmtReward(exp, coins)}${message ? `：${message}` : ''}`,
    expDelta: exp,
    coinDelta: coins,
  });
  finishLevelUps(g, ctx);
  return finish(state, ctx, g, prepared(state, ctx));
}

export function sendCoachNote(state: GameState, ctx: Ctx, input: { text: string }): ActionResult {
  const text = input.text.trim();
  if (!text) throw new Error('請輸入一句話');
  const g = startGrants(state.player);
  const s = g.player.activeSession;
  if (s && s.date === toDateStr(ctx.now)) {
    g.player = { ...g.player, activeSession: { ...s, coachNote: text } };
  }
  g.items.push({ kind: 'coach_note', text });
  addLog(g, ctx, { type: 'coach_note', message: '教練的一句話', coachFeedback: text });
  return finish(state, ctx, g, prepared(state, ctx));
}

// ---------------------------------------------------------------------------
// 6.6 兌換
// ---------------------------------------------------------------------------

export function redeemReward(state: GameState, ctx: Ctx, input: { itemId: string }): ActionResult {
  const item = effectiveRewards(ctx.curriculum.rewards, state.player).find((r) => r.id === input.itemId);
  if (!item) throw new Error('找不到這個獎品');
  const g = startGrants(applyRedeem(state.player, item, ctx.now)); // 金幣不足會 throw，不會扣成負數
  const order: RedemptionOrder = {
    id: ctx.newId(),
    rewardItemId: item.id,
    rewardTitleSnapshot: item.title,
    costSnapshot: item.cost,
    status: 'pending',
    requestedAt: ctx.now.toISOString(),
  };
  addLog(g, ctx, {
    type: 'reward_requested',
    message: `兌換 ${item.icon}【${item.title}】-${item.cost} 金幣`,
    coinDelta: -item.cost,
  });
  // 兌換是小孩自己按的，動畫在本機播；不發 lastEvent
  return finish(state, ctx, g, prepared(state, ctx), { orders: [order], emitEvent: false });
}

export function fulfillOrder(
  state: GameState,
  ctx: Ctx,
  input: { order: RedemptionOrder; note?: string },
): ActionResult {
  if (input.order.status !== 'pending') throw new Error('這筆訂單已處理過');
  const order: RedemptionOrder = {
    ...input.order,
    status: 'fulfilled',
    fulfilledAt: ctx.now.toISOString(),
    note: input.note?.trim() || input.order.note,
  };
  const g = startGrants(state.player);
  g.items.push({ kind: 'order_fulfilled', rewardTitle: order.rewardTitleSnapshot });
  addLog(g, ctx, { type: 'reward_fulfilled', message: `🎁 你的【${order.rewardTitleSnapshot}】送到囉！` });
  return finish(state, ctx, g, prepared(state, ctx), { orders: [order] });
}

export function cancelOrder(
  state: GameState,
  ctx: Ctx,
  input: { order: RedemptionOrder; note?: string },
): ActionResult {
  if (input.order.status !== 'pending') throw new Error('這筆訂單已處理過');
  const o = input.order;
  const order: RedemptionOrder = { ...o, status: 'cancelled', note: input.note?.trim() || o.note };
  const g = startGrants(applyRefund(state.player, o.rewardItemId, o.costSnapshot, o.requestedAt, ctx.now));
  addLog(g, ctx, {
    type: 'reward_cancelled',
    message: `【${o.rewardTitleSnapshot}】取消，退回 ${o.costSnapshot} 金幣`,
    coinDelta: o.costSnapshot,
  });
  return finish(state, ctx, g, prepared(state, ctx), { orders: [order], emitEvent: false });
}

// ---------------------------------------------------------------------------
// 6.7 畢業
// ---------------------------------------------------------------------------

export function graduate(state: GameState, ctx: Ctx, input: { finalWords?: string } = {}): ActionResult {
  const check = checkGraduation(state.player, state.progress, ctx.curriculum, ctx.now);
  if (!check.eligible) throw new Error(check.alreadyGraduated ? '已經畢業了' : '還沒達到畢業條件');
  const g = startGrants(state.player);
  g.player = {
    ...g.player,
    graduatedAt: ctx.now.toISOString(),
    finalCoachWords: input.finalWords?.trim() || g.player.finalCoachWords,
  };
  g.items.push({ kind: 'graduation' });
  giveTitle(g, ctx, ctx.curriculum.graduationTitleId);
  giveEquipment(g, ctx, ctx.curriculum.graduationEquipmentIds);
  if (g.player.currentTitleId !== ctx.curriculum.graduationTitleId) {
    g.player = { ...g.player, currentTitleId: ctx.curriculum.graduationTitleId };
  }
  addLog(g, ctx, {
    type: 'graduated',
    message: '🎓 畢業了！成為真正的羽球勇者！',
    coachFeedback: input.finalWords?.trim() || undefined,
  });
  return finish(state, ctx, g, prepared(state, ctx));
}

// ---------------------------------------------------------------------------
// 12.5 重新結算
// ---------------------------------------------------------------------------

export function reconcileAction(state: GameState, ctx: Ctx): ActionResult {
  const r = reconcile(ctx, state.progress, state.player);
  return {
    player: r.player,
    progress: r.doc,
    playerChanged: r.player !== state.player,
    progressChanged: r.doc !== state.progress,
    logs: r.logs,
  };
}

// ---------------------------------------------------------------------------
// Admin：商店覆寫 / 手動調整 / 重置
// ---------------------------------------------------------------------------

export function setShopOverride(
  state: GameState,
  ctx: Ctx,
  input: { itemId: string; override: { isActive?: boolean; cost?: number } | null },
): ActionResult {
  const cur: ShopOverrides = { ...(state.player.shopOverrides ?? {}) };
  if (input.override === null) delete cur[input.itemId];
  else {
    const ov = { ...cur[input.itemId], ...input.override };
    if (ov.cost !== undefined) ov.cost = Math.max(1, Math.floor(ov.cost));
    cur[input.itemId] = ov;
  }
  const g = startGrants({ ...state.player, shopOverrides: cur });
  return finish(state, ctx, g, prepared(state, ctx));
}

export function adminAdjust(
  state: GameState,
  ctx: Ctx,
  input: {
    coinsDelta?: number;
    expDelta?: number;
    setLevel?: number;
    name?: string;
    avatar?: string;
    courseStartDate?: string;
  },
): ActionResult {
  const g = startGrants(state.player);
  const notes: string[] = [];
  if (input.name !== undefined && input.name.trim()) g.player = { ...g.player, name: input.name.trim() };
  if (input.avatar !== undefined && input.avatar.trim()) g.player = { ...g.player, avatar: input.avatar.trim() };
  if (input.courseStartDate && /^\d{4}-\d{2}-\d{2}$/.test(input.courseStartDate)) {
    g.player = { ...g.player, courseStartDate: input.courseStartDate };
    notes.push(`課程開始日 → ${input.courseStartDate}`);
  }
  if (input.expDelta && input.expDelta > 0) {
    giveExpCoins(g, Math.floor(input.expDelta), 0);
    notes.push(`+${Math.floor(input.expDelta)} EXP`);
  }
  if (input.coinsDelta) {
    const d = Math.floor(input.coinsDelta);
    const coins = Math.max(0, g.player.coins + d);
    g.player = {
      ...g.player,
      coins,
      totalCoinsEarned: g.player.totalCoinsEarned + Math.max(0, d),
    };
    notes.push(`金幣 ${d > 0 ? '+' : ''}${d}`);
  }
  if (input.setLevel !== undefined) {
    const level = Math.min(ctx.curriculum.maxLevel, Math.max(1, Math.floor(input.setLevel)));
    g.player = { ...g.player, level, currentExp: 0 };
    notes.push(`等級設為 Lv.${level}`);
  }
  finishLevelUps(g, ctx);
  if (notes.length) addLog(g, ctx, { type: 'admin_adjust', message: `家長調整：${notes.join('、')}` });
  return finish(state, ctx, g, prepared(state, ctx), { emitEvent: input.expDelta !== undefined && input.expDelta > 0 });
}

/** 重置進度：保留孩子的名字、頭像、課程包；歷史日誌不刪 */
export function resetProgress(state: GameState, ctx: Ctx): ActionResult {
  const fresh = createInitialState(ctx, {
    playerId: state.player.id,
    name: state.player.name,
    avatar: state.player.avatar,
  });
  const g = startGrants({
    ...fresh.player,
    logsRev: state.player.logsRev ?? 0,
    ordersRev: state.player.ordersRev ?? 0,
    sessionsRev: state.player.sessionsRev ?? 0,
  });
  addLog(g, ctx, { type: 'admin_adjust', message: '家長重置了全部進度' });
  const res = finish({ player: state.player, progress: state.progress }, ctx, g, fresh.progress.byNodeId, {
    emitEvent: false,
  });
  return { ...res, player: { ...res.player, lastEvent: undefined }, playerChanged: true, progressChanged: true };
}
