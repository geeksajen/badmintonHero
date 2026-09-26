import { describe, expect, it } from 'vitest';
import { approveQuest, checkIn, saveTeachNote, type GameState } from '../src/engine/actions';
import { chapterPace, fieldNotesMarkdown, findStuck, nodeRecords, numberSessions } from '../src/engine/fieldNotes';
import { reconcile } from '../src/engine/reconcile';
import { badminton7yoV1 as C } from '../src/data/curricula/badminton-7yo-v1';
import type { PracticeSession } from '../src/types';
import { apply, clone, fresh, makeCtx } from './helpers';

const day = (n: number) => new Date(2026, 2, 2 + n * 3, 10, 0, 0); // 每 3 天一次練習

function session(s: GameState, n: number) {
  const r = checkIn(s, makeCtx({ now: day(n) }), {});
  return { state: apply(s, r), session: r.session! };
}
function approve(s: GameState, nodeId: string, count: number, n: number) {
  return apply(s, approveQuest(s, makeCtx({ now: day(n) }), { nodeId, count }));
}

describe('實戰筆記：記錄第幾次練習', () => {
  it('解鎖與各階級頒發時記下 sessionCount', () => {
    let s = fresh();
    expect(s.progress.byNodeId.q1_1.unlockedAtSession).toBe(0);
    s = session(s, 0).state; // 第 1 次
    s = approve(s, 'q1_1', 5, 0); // 銅
    s = session(s, 1).state; // 第 2 次
    s = approve(s, 'q1_1', 15, 1); // 銀＋金
    const p = s.progress.byNodeId.q1_1;
    expect(p.tierSessions).toEqual({ bronze: 1, silver: 2, gold: 2 });
    expect(s.progress.byNodeId.q1_2.unlockedAtSession).toBe(1);
  });

  it('nodeRecords：花了幾次練習拿銅牌、起點視為第 1 次', () => {
    let s = fresh();
    s = session(s, 0).state;
    s = approve(s, 'q1_1', 5, 0);
    s = session(s, 1).state;
    s = session(s, 2).state;
    s = approve(s, 'q1_2', 3, 2);
    const recs = nodeRecords(C, s.progress, s.player);
    const q11 = recs.find((r) => r.node.id === 'q1_1')!;
    const q12 = recs.find((r) => r.node.id === 'q1_2')!;
    expect(q11.unlockedAt).toBe(1);
    expect(q11.sessionsToBronze).toBe(1);
    expect(q12.unlockedAt).toBe(1);
    expect(q12.sessionsToBronze).toBe(3);
    // locked 節點不列出
    expect(recs.some((r) => r.node.id === 'q2_1')).toBe(false);
  });

  it('舊資料（沒有 tierSessions / unlockedAtSession）依日期與前置節點推算', () => {
    let s = fresh();
    const sessions: PracticeSession[] = [];
    for (let n = 0; n < 3; n++) {
      const x = session(s, n);
      s = x.state;
      sessions.push({ ...x.session, sessionNumber: undefined });
    }
    s = approve(s, 'q1_1', 5, 1); // 第 2 次練習拿銅
    const legacy = clone(s.progress);
    for (const p of Object.values(legacy.byNodeId)) {
      delete p.tierSessions;
      delete p.unlockedAtSession;
    }
    const recs = nodeRecords(C, legacy, s.player, numberSessions(sessions));
    const q11 = recs.find((r) => r.node.id === 'q1_1')!;
    expect(q11.tierAt.bronze).toBe(2);
    expect(q11.sessionsToBronze).toBe(2);
    const q12 = recs.find((r) => r.node.id === 'q1_2')!;
    expect(q12.unlockedAt).toBe(2); // 由前置 q1_1 的銅牌推算
    expect(q12.sessionsSoFar).toBe(2); // 第 2、3 次
  });
});

describe('卡關提醒', () => {
  it('練了預估次數兩倍（至少 3 次）還沒拿銅才提醒，並建議用最佳紀錄當門檻', () => {
    let s = fresh();
    s = session(s, 0).state;
    s = approve(s, 'q1_1', 5, 0);
    s = approve(s, 'q1_2', 2, 0); // 銅牌要 3，最佳 2
    s = session(s, 1).state;
    expect(findStuck(nodeRecords(C, s.progress, s.player))).toEqual([]);
    s = session(s, 2).state;
    s = session(s, 3).state;
    const stuck = findStuck(nodeRecords(C, s.progress, s.player));
    expect(stuck.map((x) => x.record.node.id)).toContain('q1_2');
    const q12 = stuck.find((x) => x.record.node.id === 'q1_2')!;
    expect(q12.sessions).toBe(4);
    expect(q12.suggestion).toContain('調成 2');
  });
});

describe('章節節奏', () => {
  it('規劃次數依 planWeeks 換算（第 1 章 3 週 = 6 次）；進行中顯示到目前為止', () => {
    let s = fresh();
    s = session(s, 0).state;
    s = session(s, 1).state;
    const pace = chapterPace(C, nodeRecords(C, s.progress, s.player), s.player);
    expect(pace.map((p) => p.planned)).toEqual([6, 12, 14, 10, 10]);
    expect(pace[0]).toMatchObject({ actual: 2, done: false });
    expect(pace[1].actual).toBeUndefined();
  });
});

describe('教學筆記與匯出', () => {
  it('saveTeachNote 寫在最近一次練習、進 session 文件、不發 lastEvent', () => {
    let s = fresh();
    s = session(s, 0).state;
    const before = s.player.lastEvent;
    const r = saveTeachNote(s, makeCtx({ now: day(1) }), { text: ' 反手握拍會滑 ' });
    expect(r.player.activeSession?.teachNote).toBe('反手握拍會滑');
    expect(r.session?.teachNote).toBe('反手握拍會滑');
    expect(r.session?.sessionNumber).toBe(1);
    expect(r.player.lastEvent).toBe(before);
    expect(r.logs).toEqual([]);
  });

  it('沒有練習紀錄時不能寫', () => {
    expect(() => saveTeachNote(fresh(), makeCtx(), { text: 'x' })).toThrow();
  });

  it('Markdown 含每次練習、各章、各關與卡關區塊，表格內的 | 會被跳脫', () => {
    let s = fresh();
    const x = session(s, 0);
    s = x.state;
    s = approve(s, 'q1_1', 15, 0);
    const note = apply(s, saveTeachNote(s, makeCtx({ now: day(0) }), { text: 'a|b' }));
    const md = fieldNotesMarkdown(C, note.progress, note.player, [{ ...x.session, teachNote: 'a|b' }], day(0));
    expect(md).toContain('## 每次練習紀錄');
    expect(md).toContain('氣球不落地 🥉🥈🥇');
    expect(md).toContain('a／b');
    expect(md).toContain('## 各章實際耗時 vs 規劃');
    expect(md).toContain('`q1_1`');
    expect(md).toContain('一次就到金牌');
  });

  it('reconcile 補發的獎牌也記下 sessionCount，且保持冪等', () => {
    let s = fresh();
    s = session(s, 0).state;
    s = approve(s, 'q1_1', 5, 0);
    const ctx = makeCtx({ now: day(0) });
    const r1 = reconcile(ctx, s.progress, s.player);
    const r2 = reconcile(ctx, r1.doc, r1.player);
    expect(r2.changed).toBe(false);
  });
});
