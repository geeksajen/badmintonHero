import type { Player } from '../types';
import { LEVEL_CURVE, MAX_LEVEL } from '../data/curricula/badminton-7yo-v1/levelCurve';

/** 支援單次獎勵跨多級（spec §6.5） */
export function applyExp(
  player: Player,
  delta: number,
  curve: number[] = LEVEL_CURVE,
  maxLevel: number = MAX_LEVEL,
): { player: Player; levelsGained: number } {
  let { level, currentExp } = player;
  let gained = 0;
  currentExp += delta;
  while (level < maxLevel && currentExp >= curve[level - 1]) {
    currentExp -= curve[level - 1];
    level += 1;
    gained += 1;
  }
  if (level >= maxLevel) currentExp = 0; // 滿等後 EXP 條顯示為 MAX
  return {
    player: { ...player, level, currentExp, totalExp: player.totalExp + delta },
    levelsGained: gained,
  };
}

/** 由累計 EXP 反推等級（驗證與模擬用） */
export function levelForTotalExp(
  totalExp: number,
  curve: number[] = LEVEL_CURVE,
  maxLevel: number = MAX_LEVEL,
): { level: number; currentExp: number } {
  let level = 1;
  let rest = totalExp;
  while (level < maxLevel && rest >= curve[level - 1]) {
    rest -= curve[level - 1];
    level += 1;
  }
  return { level, currentExp: level >= maxLevel ? 0 : rest };
}

/** 當前等級升級所需 EXP；滿等回傳 0 */
export function expToNext(level: number, curve: number[] = LEVEL_CURVE, maxLevel: number = MAX_LEVEL): number {
  return level >= maxLevel ? 0 : curve[level - 1];
}
