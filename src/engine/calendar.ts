/**
 * 蓋章月曆：練習那天蓋一個章，章的樣式看當天拿到的最好獎牌。
 * 只標「有練習的日子」，沒練習的日子不做任何標記（spec §8.1 零懲罰：不顯示缺席）。
 */
import type { Curriculum, Player, PracticeSession, QuestProgressDoc, TierLevel } from '../types';
import { TIER_ORDER } from '../types';
import { parseDateStr, toDateStr } from './util';

export type StampKind = TierLevel | 'practice';

export interface StampDay {
  date: string; // YYYY-MM-DD
  number: number; // 第幾次練習
  stamp: StampKind;
  medals: { nodeId: string; title: string; tier: TierLevel }[];
  exp?: number;
  coins?: number;
  coachNote?: string;
}

/**
 * sessions 可以是最近幾筆（由新到舊連續），也可以是全部。
 * 舊資料沒有 sessionNumber：以 player.sessionCount 往回推。
 * 獎牌依 tierSessions 對到第幾次練習；舊資料只有 completedAt，用日期對到銅牌。
 */
export function stampDays(
  c: Curriculum,
  progress: QuestProgressDoc,
  player: Player,
  sessions: PracticeSession[],
): Map<string, StampDay> {
  const newestFirst = [...sessions].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const out = new Map<string, StampDay>();
  newestFirst.forEach((s, i) => {
    const number = s.sessionNumber ?? player.sessionCount - i;
    const medals: StampDay['medals'] = [];
    for (const node of c.quests) {
      const p = progress.byNodeId[node.id];
      if (!p) continue;
      for (const tier of TIER_ORDER) {
        const at = p.tierSessions?.[tier];
        const legacyBronze = at === undefined && tier === 'bronze' && p.completedAt && toDateStr(new Date(p.completedAt)) === s.date;
        if (at === number || legacyBronze) {
          medals.push({ nodeId: node.id, title: node.title.replace('【魔王】', ''), tier });
        }
      }
    }
    const best = [...TIER_ORDER].reverse().find((t) => medals.some((m) => m.tier === t));
    if (!out.has(s.date)) {
      out.set(s.date, {
        date: s.date,
        number,
        stamp: best ?? 'practice',
        medals,
        exp: s.expGiven,
        coins: s.coinsGiven,
        coachNote: s.coachNote,
      });
    }
  });
  return out;
}

/** 月曆格子：以星期日開頭，每格是 YYYY-MM-DD 或 null（月初前的空格） */
export function monthCells(year: number, month0: number): (string | null)[] {
  const first = new Date(year, month0, 1);
  const days = new Date(year, month0 + 1, 0).getDate();
  const cells: (string | null)[] = Array.from({ length: first.getDay() }, () => null);
  for (let d = 1; d <= days; d++) cells.push(toDateStr(new Date(year, month0, d)));
  return cells;
}

/** 'YYYY-MM' 的加減月份 */
export function addMonths(ym: string, delta: number): string {
  const [y, m] = ym.split('-').map(Number);
  const d = new Date(y, m - 1 + delta, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

export function monthOf(dateStr: string): string {
  const d = parseDateStr(dateStr);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}
