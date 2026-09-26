import type { QuestNode, QuestProgress, TierLevel } from '../types';
import { addLog, fmtReward, giveEquipment, giveExpCoins, giveTitle, type Ctx, type Grants } from './grant';
import { settleTiers, TIER_EMOJI, TIER_LABEL, tierAmount } from './tiers';

/**
 * 對單一節點結算：發放尚未發過的階級獎勵、首次達銅 → completed ＋ 裝備／稱號。
 * 核可（approve）與 reconcile 共用這一段，確保兩條路徑的去重規則完全一致。
 *
 * ★ 只升不降：tiersAwarded 只 append、status 只會往 completed 走、bestCount 不在這裡變動。
 */
export function settleNode(
  g: Grants,
  ctx: Ctx,
  node: QuestNode,
  prog: QuestProgress,
  opts: { emitTierItems: boolean },
): { prog: QuestProgress; newTiers: TierLevel[]; becameCompleted: boolean } {
  const ratio = ctx.curriculum.tierRatio;
  const s = settleTiers(node, prog, ratio);
  let next = prog;

  for (const tier of s.pending) {
    const exp = tierAmount(node.rewardExp, tier, ratio);
    const coins = tierAmount(node.rewardCoins, tier, ratio);
    giveExpCoins(g, exp, coins);
    if (opts.emitTierItems) g.items.push({ kind: 'tier', nodeId: node.id, tier, exp, coins });
    addLog(g, ctx, {
      type: 'tier_reached',
      message: `【${node.title}】達成 ${TIER_EMOJI[tier]} ${TIER_LABEL[tier]}！${fmtReward(exp, coins)}`,
      expDelta: exp,
      coinDelta: coins,
    });
  }
  if (s.pending.length > 0) {
    const tierSessions = { ...next.tierSessions };
    for (const tier of s.pending) tierSessions[tier] = g.player.sessionCount;
    next = { ...next, tiersAwarded: [...next.tiersAwarded, ...s.pending], tierSessions };
  }

  let becameCompleted = false;
  if (next.tiersAwarded.includes('bronze') && next.status !== 'completed') {
    next = { ...next, status: 'completed', completedAt: next.completedAt ?? ctx.now.toISOString() };
    becameCompleted = true;
    g.items.push({ kind: 'quest_completed', nodeId: node.id });
  }

  // 已完成節點的裝備／稱號：首次達銅時發放；事後在已完成節點「新增」的也會在這裡補發（spec §12.4-⑤）
  if (next.status === 'completed') {
    giveEquipment(g, ctx, node.rewardEquipmentIds);
    giveTitle(g, ctx, node.rewardTitleId);
  }

  return { prog: next, newTiers: s.pending, becameCompleted };
}
