import { describe, expect, it } from 'vitest';
import { approveQuest, checkIn, type GameState } from '../src/engine/actions';
import { addMonths, monthCells, monthOf, stampDays } from '../src/engine/calendar';
import { badminton7yoV1 as C } from '../src/data/curricula/badminton-7yo-v1';
import type { PracticeSession } from '../src/types';
import { apply, clone, fresh, makeCtx } from './helpers';

const day = (n: number) => new Date(2026, 2, 2 + n * 3, 10, 0, 0); // 3/2, 3/5, 3/8…

function practice(s: GameState, n: number, sessions: PracticeSession[]) {
  const r = checkIn(s, makeCtx({ now: day(n) }), {});
  sessions.push(r.session!);
  return apply(s, r);
}
function approve(s: GameState, nodeId: string, count: number, n: number, sessions: PracticeSession[]) {
  const r = approveQuest(s, makeCtx({ now: day(n) }), { nodeId, count });
  if (r.session) sessions[sessions.length - 1] = r.session; // 當天小計更新
  return apply(s, r);
}

describe('蓋章月曆', () => {
  it('章的樣式看當天最好的獎牌；沒拿獎牌是練習章；記下 EXP 小計', () => {
    const sessions: PracticeSession[] = [];
    let s = practice(fresh(), 0, sessions);
    s = approve(s, 'q1_1', 15, 0, sessions); // 銅銀金一次
    s = practice(s, 1, sessions);
    s = practice(s, 2, sessions);
    s = approve(s, 'q1_2', 3, 2, sessions); // 銅

    const days = stampDays(C, s.progress, s.player, sessions);
    expect(days.get('2026-03-02')).toMatchObject({ number: 1, stamp: 'gold' });
    expect(days.get('2026-03-02')!.medals.map((m) => m.tier)).toEqual(['bronze', 'silver', 'gold']);
    expect(days.get('2026-03-02')!.exp).toBeGreaterThan(C.attendanceExp);
    expect(days.get('2026-03-05')).toMatchObject({ number: 2, stamp: 'practice', medals: [] });
    expect(days.get('2026-03-08')).toMatchObject({ number: 3, stamp: 'bronze' });
    expect(days.has('2026-03-03')).toBe(false);
  });

  it('舊資料：沒有 sessionNumber 由 sessionCount 往回推，沒有 tierSessions 用 completedAt 日期對銅牌', () => {
    const sessions: PracticeSession[] = [];
    let s = practice(fresh(), 0, sessions);
    s = practice(s, 1, sessions);
    s = approve(s, 'q1_1', 5, 1, sessions);
    const legacy = clone(s.progress);
    for (const p of Object.values(legacy.byNodeId)) delete p.tierSessions;
    const legacySessions = sessions.map((x) => ({ ...x, sessionNumber: undefined }));
    // 只給最近 1 筆（模擬 limit 截斷）也能正確編號
    const days = stampDays(C, legacy, s.player, legacySessions.slice(-1));
    expect(days.get('2026-03-05')).toMatchObject({ number: 2, stamp: 'bronze' });
  });

  it('月曆格子以星期日開頭；月份加減跨年', () => {
    const cells = monthCells(2026, 2); // 2026 年 3 月 1 日是星期日
    expect(cells[0]).toBe('2026-03-01');
    expect(cells.filter(Boolean)).toHaveLength(31);
    expect(monthCells(2026, 8).indexOf('2026-09-01')).toBe(2); // 星期二
    expect(addMonths('2026-01', -1)).toBe('2025-12');
    expect(addMonths('2026-12', 1)).toBe('2027-01');
    expect(monthOf('2026-09-26')).toBe('2026-09');
  });
});
