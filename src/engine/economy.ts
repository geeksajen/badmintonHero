import type { Player, RewardItem } from '../types';
import { weekKey } from './util';

/** 套用家長的臨時上下架／改價 */
export function effectiveRewards(rewards: RewardItem[], player: Player): RewardItem[] {
  const ov = player.shopOverrides ?? {};
  return rewards.map((r) => ({
    ...r,
    isActive: ov[r.id]?.isActive ?? r.isActive,
    cost: ov[r.id]?.cost ?? r.cost,
  }));
}

/** 本週已兌換次數 */
export function redeemedThisWeek(player: Player, itemId: string, now: Date): number {
  const c = player.redeemCounter;
  if (!c || c.weekKey !== weekKey(now)) return 0;
  return c.byItem[itemId] ?? 0;
}

export type RedeemCheck =
  | { ok: true }
  | { ok: false; reason: 'inactive' | 'coins' | 'stock'; message: string };

export function canRedeem(player: Player, item: RewardItem, now: Date): RedeemCheck {
  if (!item.isActive) return { ok: false, reason: 'inactive', message: '這個獎品暫時休息中' };
  if (player.coins < item.cost) {
    return { ok: false, reason: 'coins', message: `還差 ${item.cost - player.coins} 金幣` };
  }
  if (item.stockPerWeek !== undefined && redeemedThisWeek(player, item.id, now) >= item.stockPerWeek) {
    return { ok: false, reason: 'stock', message: '這週已經換完囉，下週再來！' };
  }
  return { ok: true };
}

/** 兌換：扣款並記入本週次數。呼叫前必須 canRedeem 為 ok；金幣永不為負。 */
export function applyRedeem(player: Player, item: RewardItem, now: Date): Player {
  const check = canRedeem(player, item, now);
  if (!check.ok) throw new Error(check.message);
  const wk = weekKey(now);
  const counter =
    player.redeemCounter && player.redeemCounter.weekKey === wk
      ? player.redeemCounter
      : { weekKey: wk, byItem: {} };
  return {
    ...player,
    coins: player.coins - item.cost,
    redeemCounter: {
      weekKey: wk,
      byItem: { ...counter.byItem, [item.id]: (counter.byItem[item.id] ?? 0) + 1 },
    },
  };
}

/** 取消並退款；若是本週的訂單，一併歸還本週額度 */
export function applyRefund(player: Player, itemId: string, cost: number, requestedAt: string, now: Date): Player {
  const c = player.redeemCounter;
  let redeemCounter = c;
  if (c && c.weekKey === weekKey(now) && weekKey(new Date(requestedAt)) === c.weekKey) {
    redeemCounter = { ...c, byItem: { ...c.byItem, [itemId]: Math.max(0, (c.byItem[itemId] ?? 0) - 1) } };
  }
  return { ...player, coins: player.coins + cost, redeemCounter };
}
