/**
 * §12 reconcile 回歸測試：餵入「舊進度 ＋ 新關卡表」，
 * 斷言 bestCount／tiersAwarded／status／totalExp／coins 無任何一項下降，且冪等。
 */
import { describe, expect, it } from 'vitest';
import { approveQuest, type GameState } from '../src/engine/actions';
import { reconcile } from '../src/engine/reconcile';
import { validateCurriculum } from '../src/engine/validate';
import { badminton7yoV1 as C } from '../src/data/curricula/badminton-7yo-v1';
import type { Curriculum, QuestNode, QuestStatus } from '../src/types';
import { apply, clone, fresh, makeCtx } from './helpers';

const STATUS_RANK: Record<QuestStatus, number> = { locked: 0, unlocked: 1, submitted: 1, completed: 2 };

function assertMonotonic(before: GameState, after: GameState) {
  expect(after.player.totalExp).toBeGreaterThanOrEqual(before.player.totalExp);
  expect(after.player.coins).toBeGreaterThanOrEqual(before.player.coins);
  for (const e of before.player.unlockedEquipmentIds) expect(after.player.unlockedEquipmentIds).toContain(e);
  for (const t of before.player.unlockedTitleIds) expect(after.player.unlockedTitleIds).toContain(t);
  for (const [id, p] of Object.entries(before.progress.byNodeId)) {
    const q = after.progress.byNodeId[id];
    expect(q, `進度紀錄 ${id} 不得消失`).toBeTruthy();
    expect(q.bestCount).toBeGreaterThanOrEqual(p.bestCount);
    for (const t of p.tiersAwarded) expect(q.tiersAwarded).toContain(t);
    expect(STATUS_RANK[q.status]).toBeGreaterThanOrEqual(STATUS_RANK[p.status]);
  }
}

/** 模擬：女兒打到第 2 章 q2_7 進行中 */
function midCourse(): GameState {
  let s = fresh();
  const steps: [string, number][] = [
    ['q1_1', 15], ['q1_2', 6], ['q1_3', 10], ['q1_4', 3], ['q1_5', 3], ['q1_6', 10],
    ['q2_1', 8], ['q2_2', 20], ['q2_3', 5], ['q2_4', 4], ['q2_5', 5], ['q2_6', 2],
  ];
  for (const [nodeId, count] of steps) s = apply(s, approveQuest(s, makeCtx(), { nodeId, count }));
  expect(s.progress.byNodeId.q2_7.status).toBe('unlocked');
  return s;
}

function withQuests(quests: QuestNode[], version = 2): Curriculum {
  return { ...C, quests, version };
}

function run(state: GameState, curriculum: Curriculum) {
  const r = reconcile(makeCtx({ curriculum }), state.progress, state.player);
  return { r, next: { player: r.player, progress: r.doc } as GameState };
}

describe('reconcile', () => {
  it('同一版本、無變化時冪等：changed=false、原物件原樣回傳', () => {
    const s = midCourse();
    const r = reconcile(makeCtx(), s.progress, s.player);
    expect(r.changed).toBe(false);
    expect(r.doc).toBe(s.progress);
    expect(r.player).toBe(s.player);
  });

  it('① 追加支線：新節點立刻可挑戰，q2_7 不受影響，零回退', () => {
    const s = midCourse();
    const quests = clone(C.quests);
    quests.push(
      { ...clone(quests.find((q) => q.id === 'q2_3')!), id: 'q2_3b', order: 35, title: '揮拍不碰地', parentIds: ['q2_2'], addedInVersion: 2, rewardEquipmentIds: undefined },
      { ...clone(quests.find((q) => q.id === 'q2_5')!), id: 'q2_5b', order: 55, title: '支線 5b', parentIds: ['q2_5'], addedInVersion: 2, rewardEquipmentIds: undefined },
      { ...clone(quests.find((q) => q.id === 'q2_6')!), id: 'q2_6b', order: 65, title: '支線 6b', parentIds: ['q2_6'], addedInVersion: 2, rewardEquipmentIds: undefined },
    );
    const cur = withQuests(quests);
    expect(validateCurriculum(cur).errors).toEqual([]);

    const { r, next } = run(s, cur);
    assertMonotonic(s, next);
    expect(next.progress.byNodeId.q2_3b.status).toBe('unlocked');
    expect(next.progress.byNodeId.q2_5b.status).toBe('unlocked');
    expect(next.progress.byNodeId.q2_6b.status).toBe('unlocked');
    expect(next.progress.byNodeId.q2_7.status).toBe('unlocked');
    expect(next.player.curriculumVersion).toBe(2);
    // 用「發現」語氣包裝
    expect(r.event!.items[0]).toEqual({ kind: 'discovery', chapterId: 2, count: 3 });

    // 冪等：第二次不產生任何變化
    const again = reconcile(makeCtx({ curriculum: cur }), next.progress, next.player);
    expect(again.changed).toBe(false);
    expect(again.player).toBe(next.player);
    expect(again.doc).toBe(next.progress);
  });

  it('④ 調低門檻：依歷史 bestCount 補發獎牌，且不重複發放', () => {
    let s = midCourse();
    // q2_7 打了 2 拍（銅 3），尚未完成
    s = apply(s, approveQuest(s, makeCtx(), { nodeId: 'q2_7', count: 2 }));
    expect(s.progress.byNodeId.q2_7.status).toBe('unlocked');
    const quests = clone(C.quests);
    quests.find((q) => q.id === 'q2_7')!.tiers = { bronze: 2, silver: 6, gold: 10 };
    // q1_4 best=3，銀牌 6 → 3
    quests.find((q) => q.id === 'q1_4')!.tiers = { bronze: 2, silver: 3, gold: 10 };
    const cur = withQuests(quests);

    const { r, next } = run(s, cur);
    assertMonotonic(s, next);
    expect(next.progress.byNodeId.q2_7.status).toBe('completed');
    expect(next.progress.byNodeId.q2_7.tiersAwarded).toEqual(['bronze']);
    expect(next.progress.byNodeId.q1_4.tiersAwarded).toEqual(['bronze', 'silver']);
    expect(next.player.unlockedTitleIds).toContain('title_forest_hunter');
    expect(next.progress.byNodeId.q3_1.status).toBe('unlocked');
    expect(r.event!.items.some((i) => i.kind === 'retro_medals' && i.count === 2)).toBe(true);
    expect(next.player.totalExp).toBe(s.player.totalExp + 80 + 18);

    const again = reconcile(makeCtx({ curriculum: cur }), next.progress, next.player);
    expect(again.changed).toBe(false);
  });

  it('④ 調高門檻：已發的獎牌與 EXP 一律不回收', () => {
    const s = midCourse();
    const quests = clone(C.quests);
    quests.find((q) => q.id === 'q1_1')!.tiers = { bronze: 20, silver: 30, gold: 40 };
    const { next } = run(s, withQuests(quests));
    assertMonotonic(s, next);
    expect(next.progress.byNodeId.q1_1.tiersAwarded).toEqual(['bronze', 'silver', 'gold']);
    expect(next.progress.byNodeId.q1_1.status).toBe('completed');
  });

  it('③ 退役節點：進度與獎勵保留，不參與解鎖；子節點 parentIds 併入後照常可解', () => {
    const s = midCourse();
    const quests = clone(C.quests);
    const x = quests.find((q) => q.id === 'q2_6')!;
    x.isRetired = true;
    for (const child of quests) {
      child.parentIds = child.parentIds.flatMap((p) => (p === x.id ? x.parentIds : [p]));
    }
    const cur = withQuests(quests);
    expect(validateCurriculum(cur).errors).toEqual([]);
    const { next } = run(s, cur);
    assertMonotonic(s, next);
    expect(next.progress.byNodeId.q2_6.bestCount).toBe(2);
    expect(next.progress.byNodeId.q2_7.status).toBe('unlocked');
  });

  it('驗證腳本擋下「parentIds 指向退役節點」', () => {
    const quests = clone(C.quests);
    quests.find((q) => q.id === 'q2_6')!.isRetired = true; // 忘了改子節點
    const errs = validateCurriculum(withQuests(quests)).errors;
    expect(errs.some((e) => e.includes('退役'))).toBe(true);
  });

  it('② 孤兒紀錄（定義被刪掉的 nodeId）原樣保留', () => {
    const s = midCourse();
    const quests = clone(C.quests).filter((q) => q.id !== 'q2_6');
    quests.find((q) => q.id === 'q2_7')!.parentIds = ['q2_5'];
    const { next } = run(s, withQuests(quests));
    expect(next.progress.byNodeId.q2_6).toEqual(s.progress.byNodeId.q2_6);
    assertMonotonic(s, next);
  });

  it('⑤ 在已完成節點新增裝備：reconcile 補發', () => {
    const s = midCourse();
    const quests = clone(C.quests);
    quests.find((q) => q.id === 'q1_3')!.rewardEquipmentIds = ['eq_towel'];
    const { r, next } = run(s, withQuests(quests));
    expect(next.player.unlockedEquipmentIds).toContain('eq_towel');
    expect(r.event!.items.some((i) => i.kind === 'equipment' && i.equipmentId === 'eq_towel')).toBe(true);
    assertMonotonic(s, next);
  });

  it('新增節點當作現有已解鎖節點的前置：已解鎖節點不會被鎖回去', () => {
    const s = midCourse();
    const quests = clone(C.quests);
    quests.push({ ...clone(quests.find((q) => q.id === 'q2_6')!), id: 'q2_6c', order: 66, parentIds: ['q2_6'], addedInVersion: 2 });
    quests.find((q) => q.id === 'q2_7')!.parentIds = ['q2_6', 'q2_6c'];
    const { next } = run(s, withQuests(quests));
    expect(next.progress.byNodeId.q2_7.status).toBe('unlocked');
    assertMonotonic(s, next);
  });
});
