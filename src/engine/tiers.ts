import type { QuestNode, QuestProgress, TierLevel } from '../types';
import { TIER_ORDER, TIER_RATIO } from '../types';

export const TIER_LABEL: Record<TierLevel, string> = { bronze: '銅牌', silver: '銀牌', gold: '金牌' };
export const TIER_EMOJI: Record<TierLevel, string> = { bronze: '🥉', silver: '🥈', gold: '🥇' };

/**
 * 某一階的獎勵數額。
 * 金牌取「總額 − 銅 − 銀」，確保三階加總永遠等於 rewardExp / rewardCoins
 * （例如 75 幣若三階各自 Math.round 會變成 38+23+15=76）。
 */
export function tierAmount(
  total: number,
  tier: TierLevel,
  ratio: Record<TierLevel, number> = TIER_RATIO,
): number {
  const bronze = Math.round(total * ratio.bronze);
  const silver = Math.round(total * ratio.silver);
  if (tier === 'bronze') return bronze;
  if (tier === 'silver') return silver;
  return total - bronze - silver;
}

/** 依歷史最佳成績，算出尚未發獎的階級與應發數值（spec §6.4） */
export function settleTiers(
  node: QuestNode,
  prog: QuestProgress,
  ratio: Record<TierLevel, number> = TIER_RATIO,
) {
  const reached = TIER_ORDER.filter((t) => prog.bestCount >= node.tiers[t]);
  const pending = reached.filter((t) => !prog.tiersAwarded.includes(t));
  const exp = pending.reduce((s, t) => s + tierAmount(node.rewardExp, t, ratio), 0);
  const coins = pending.reduce((s, t) => s + tierAmount(node.rewardCoins, t, ratio), 0);
  return { pending, exp, coins, isFirstBronze: pending.includes('bronze') };
}

/** 已頒發的最高階級（UI 以 tiersAwarded 為準，不拿 bestCount 反推，spec §12.4-④） */
export function highestAwarded(prog?: QuestProgress): TierLevel | undefined {
  if (!prog) return undefined;
  for (let i = TIER_ORDER.length - 1; i >= 0; i--) {
    if (prog.tiersAwarded.includes(TIER_ORDER[i])) return TIER_ORDER[i];
  }
  return undefined;
}

/** 某個次數對應到的最高階級（用於 ＋1 時的外環變色） */
export function tierForCount(node: QuestNode, count: number): TierLevel | undefined {
  for (let i = TIER_ORDER.length - 1; i >= 0; i--) {
    if (count >= node.tiers[TIER_ORDER[i]]) return TIER_ORDER[i];
  }
  return undefined;
}
