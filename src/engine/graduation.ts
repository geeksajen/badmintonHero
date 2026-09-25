import type { Curriculum, Player, QuestProgressDoc } from '../types';
import { courseWeek, daysBetween } from './util';

export interface GraduationCheck {
  eligible: boolean;
  byFinalQuest: boolean; // 最終魔王銅牌以上
  byWeeks: boolean; // 自 courseStartDate 起滿 26 週
  weeksElapsed: number;
  alreadyGraduated: boolean;
}

/** spec §4.6：任一條件達成即可由家長舉行畢業典禮 */
export function checkGraduation(
  player: Player,
  progress: QuestProgressDoc,
  curriculum: Curriculum,
  now: Date,
): GraduationCheck {
  const final = progress.byNodeId[curriculum.finalQuestId];
  const byFinalQuest = !!final && final.tiersAwarded.includes('bronze');
  const days = daysBetween(player.courseStartDate, now);
  const byWeeks = days >= curriculum.courseWeeks * 7;
  return {
    eligible: !player.graduatedAt && (byFinalQuest || byWeeks),
    byFinalQuest,
    byWeeks,
    weeksElapsed: Math.floor(days / 7),
    alreadyGraduated: !!player.graduatedAt,
  };
}

/** 畢業倒數：還剩幾週（不為負） */
export function weeksLeft(player: Player, curriculum: Curriculum, now: Date): number {
  return Math.max(0, curriculum.courseWeeks - courseWeek(player.courseStartDate, now) + 1);
}
