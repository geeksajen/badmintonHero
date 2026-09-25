import type { ActivityLog, CelebrationItem, Curriculum, Player } from '../types';
import { applyExp } from './exp';
import { toDateStr } from './util';

/**
 * 一次動作（核可、簽到、reconcile…）累積出的所有變化。
 * 各 action 依序往裡面加獎勵，最後一次寫回 player 與 lastEvent。
 */
export interface Grants {
  player: Player;
  items: CelebrationItem[];
  logs: ActivityLog[];
  expTotal: number;
  coinsTotal: number;
}

export interface Ctx {
  now: Date;
  newId: () => string;
  curriculum: Curriculum;
}

export function startGrants(player: Player): Grants {
  return { player, items: [], logs: [], expTotal: 0, coinsTotal: 0 };
}

export function addLog(g: Grants, ctx: Ctx, log: Omit<ActivityLog, 'id' | 'createdAt'>): void {
  // 同一動作內多筆 log 以毫秒遞增，確保 orderBy(createdAt) 的順序穩定
  const t = new Date(ctx.now.getTime() + g.logs.length);
  g.logs.push({ id: ctx.newId(), createdAt: t.toISOString(), ...log });
}

/** 發 EXP／金幣（金幣累計 totalCoinsEarned）。升級項目延後到 finishLevelUps 一次產生。 */
export function giveExpCoins(g: Grants, exp: number, coins: number): void {
  if (exp === 0 && coins === 0) return;
  g.player = {
    ...g.player,
    totalExp: g.player.totalExp + exp,
    currentExp: g.player.currentExp + exp,
    coins: g.player.coins + coins,
    totalCoinsEarned: g.player.totalCoinsEarned + Math.max(0, coins),
  };
  g.expTotal += exp;
  g.coinsTotal += coins;
}

/**
 * 把累積的 currentExp 結算成升級。只呼叫一次，
 * 讓「連升兩級」變成一個 level_up 項目（from → to），不會洗版。
 */
export function finishLevelUps(g: Grants, ctx: Ctx): void {
  const { levelCurve, maxLevel } = ctx.curriculum;
  const before = g.player.level;
  // applyExp 以 delta=0 重新結算已加進 currentExp 的 EXP（totalExp 不重複加）
  const { player, levelsGained } = applyExp(g.player, 0, levelCurve, maxLevel);
  g.player = player;
  if (levelsGained > 0) {
    g.items.push({ kind: 'level_up', from: before, to: player.level });
    addLog(g, ctx, { type: 'level_up', message: `升級了！Lv.${before} → Lv.${player.level}` });
  }
}

export function giveEquipment(g: Grants, ctx: Ctx, ids: string[] | undefined): void {
  for (const id of ids ?? []) {
    if (g.player.unlockedEquipmentIds.includes(id)) continue;
    const eq = ctx.curriculum.equipments.find((e) => e.id === id);
    g.player = { ...g.player, unlockedEquipmentIds: [...g.player.unlockedEquipmentIds, id] };
    g.items.push({ kind: 'equipment', equipmentId: id });
    addLog(g, ctx, { type: 'equipment_unlocked', message: `獲得裝備 ${eq?.icon ?? '🎁'} ${eq?.name ?? id}` });
  }
}

export function giveTitle(g: Grants, ctx: Ctx, id: string | undefined): void {
  if (!id || g.player.unlockedTitleIds.includes(id)) return;
  const t = ctx.curriculum.titles.find((x) => x.id === id);
  g.player = {
    ...g.player,
    unlockedTitleIds: [...g.player.unlockedTitleIds, id],
    currentTitleId: id, // 新稱號自動戴上
  };
  g.items.push({ kind: 'title', titleId: id });
  addLog(g, ctx, { type: 'title_unlocked', message: `獲得稱號「${t?.name ?? id}」` });
}

/** 若今天有簽到中的練習，把本次發放計入小計 */
export function addToActiveSession(
  g: Grants,
  ctx: Ctx,
  exp: number,
  coins: number,
  kind: 'bonus' | 'other',
): void {
  const s = g.player.activeSession;
  const today = toDateStr(ctx.now);
  if (!s || s.date !== today) return;
  g.player = {
    ...g.player,
    activeSession: {
      ...s,
      expGiven: s.expGiven + exp,
      coinsGiven: s.coinsGiven + coins,
      bonusExp: s.bonusExp + (kind === 'bonus' ? exp : 0),
      bonusCoins: s.bonusCoins + (kind === 'bonus' ? coins : 0),
    },
  };
}


export function fmtReward(exp: number, coins: number): string {
  const parts: string[] = [];
  if (exp) parts.push(`${exp > 0 ? '+' : ''}${exp} EXP`);
  if (coins) parts.push(`${coins > 0 ? '+' : ''}${coins} 金幣`);
  return parts.join(' ');
}
