import type { ChapterId, Curriculum, QuestProgressDoc } from '../types';
import { highestAwarded } from './tiers';
import { courseWeek } from './util';

export interface Tally {
  completed: number;
  gold: number;
  silver: number;
  bronze: number;
}

/** 以最高已頒發階級計數（一個節點只算一面最高的獎牌）。只增不減，不用分數或百分比（spec §12.6） */
export function tallyNodes(nodeIds: string[], progress: QuestProgressDoc): Tally {
  const t: Tally = { completed: 0, gold: 0, silver: 0, bronze: 0 };
  for (const id of nodeIds) {
    const p = progress.byNodeId[id];
    if (!p) continue;
    if (p.status === 'completed') t.completed += 1;
    const h = highestAwarded(p);
    if (h) t[h] += 1;
  }
  return t;
}

/** 包含退役節點：已得的獎牌永遠是她的 */
export function tallyChapter(c: Curriculum, chapterId: ChapterId, progress: QuestProgressDoc): Tally {
  return tallyNodes(c.quests.filter((q) => q.chapterId === chapterId).map((q) => q.id), progress);
}

export function tallyAll(c: Curriculum, progress: QuestProgressDoc): Tally {
  return tallyNodes(c.quests.map((q) => q.id), progress);
}

/** 依 §5 節奏表，這一週「應該」在第幾章 */
export function expectedChapter(c: Curriculum, courseStartDate: string, now: Date): ChapterId {
  const w = courseWeek(courseStartDate, now);
  const ch = c.chapters.find((x) => w >= x.planWeeks[0] && w <= x.planWeeks[1]);
  return ch?.id ?? c.chapters[c.chapters.length - 1].id;
}

/** 目前實際進行到的章節：有未完成（可挑戰）現役節點的最早章節 */
export function currentChapter(c: Curriculum, progress: QuestProgressDoc): ChapterId {
  for (const ch of c.chapters) {
    const open = c.quests.some(
      (q) => q.chapterId === ch.id && !q.isRetired && progress.byNodeId[q.id]?.status !== 'completed',
    );
    if (open) return ch.id;
  }
  return c.chapters[c.chapters.length - 1].id;
}
