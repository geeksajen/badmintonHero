import { describe, expect, it } from 'vitest';
import {
  approveQuest,
  checkIn,
  grantBonus,
  graduate,
  redeemReward,
  cancelOrder,
  retryQuest,
  submitQuest,
  updateProfile,
  type GameState,
} from '../src/engine/actions';
import { applyExp } from '../src/engine/exp';
import { computeUnlocked } from '../src/engine/unlock';
import { settleTiers, tierAmount } from '../src/engine/tiers';
import { canRedeem, applyRedeem } from '../src/engine/economy';
import { checkGraduation } from '../src/engine/graduation';
import { reachedChapter } from '../src/engine/stats';
import { badminton7yoV1 as C } from '../src/data/curricula/badminton-7yo-v1';
import type { QuestProgress } from '../src/types';
import { apply, fresh, makeCtx } from './helpers';

function approve(s: GameState, nodeId: string, count: number, ctx = makeCtx()) {
  return apply(s, approveQuest(s, ctx, { nodeId, count }));
}

describe('tiers', () => {
  it('三階切分加總等於總額（75 幣不會變 76）', () => {
    expect(tierAmount(75, 'bronze') + tierAmount(75, 'silver') + tierAmount(75, 'gold')).toBe(75);
    expect(tierAmount(60, 'bronze')).toBe(30);
    expect(tierAmount(60, 'silver')).toBe(18);
    expect(tierAmount(60, 'gold')).toBe(12);
  });

  it('同一階級的獎勵不會重複發放（tiersAwarded 去重）', () => {
    let s = fresh();
    s = approve(s, 'q1_1', 5); // 銅
    const exp1 = s.player.totalExp;
    expect(s.progress.byNodeId.q1_1.tiersAwarded).toEqual(['bronze']);
    // 再次以同樣次數核可 → 不再發銅
    s = approve(s, 'q1_1', 5);
    expect(s.player.totalExp).toBe(exp1);
    expect(s.progress.byNodeId.q1_1.tiersAwarded).toEqual(['bronze']);
    // 直接達金 → 只補發銀＋金
    s = approve(s, 'q1_1', 15);
    expect(s.progress.byNodeId.q1_1.tiersAwarded).toEqual(['bronze', 'silver', 'gold']);
    expect(s.player.totalExp).toBe(60);
    expect(s.player.coins).toBe(30);
  });

  it('settleTiers 只回傳尚未發放的階級', () => {
    const node = C.quests.find((q) => q.id === 'q1_1')!;
    const prog: QuestProgress = {
      nodeId: 'q1_1', status: 'completed', currentCount: 0, bestCount: 12, tiersAwarded: ['bronze'], attempts: 1,
    };
    const r = settleTiers(node, prog);
    expect(r.pending).toEqual(['silver']);
    expect(r.exp).toBe(18);
    expect(r.isFirstBronze).toBe(false);
  });
});

describe('bestCount 只增不減', () => {
  it('較低的次數核可不會讓 bestCount 退步', () => {
    let s = fresh();
    s = approve(s, 'q1_1', 12);
    s = approve(s, 'q1_1', 3);
    expect(s.progress.byNodeId.q1_1.bestCount).toBe(12);
  });

  it('再練習一次：bestCount 保留、沒有扣分', () => {
    let s = fresh();
    s = approve(s, 'q1_1', 8);
    s = apply(s, submitQuest(s, makeCtx(), { nodeId: 'q1_1', count: 9 }));
    const before = s.player;
    s = apply(s, retryQuest(s, makeCtx(), { nodeId: 'q1_1' }));
    expect(s.progress.byNodeId.q1_1.bestCount).toBe(8);
    expect(s.progress.byNodeId.q1_1.status).toBe('completed'); // 不回退
    expect(s.player.totalExp).toBe(before.totalExp);
    expect(s.player.coins).toBe(before.coins);
    expect(s.player.lastEvent?.items[0]).toEqual({ kind: 'coach_note', text: '再試一次就會更棒！' });
  });

  it('未完成節點送審後被要求再練：submitted → unlocked', () => {
    let s = fresh();
    s = apply(s, submitQuest(s, makeCtx(), { nodeId: 'q1_1', count: 3 }));
    expect(s.progress.byNodeId.q1_1.status).toBe('submitted');
    s = apply(s, retryQuest(s, makeCtx(), { nodeId: 'q1_1', feedback: '好棒，差一點點！' }));
    expect(s.progress.byNodeId.q1_1.status).toBe('unlocked');
    expect(s.progress.byNodeId.q1_1.currentCount).toBe(0);
    expect(s.progress.byNodeId.q1_1.submittedAt).toBeUndefined();
  });
});

describe('applyExp', () => {
  it('單次獎勵可跨多級升級', () => {
    const s = fresh();
    const { player, levelsGained } = applyExp(s.player, 50 + 70 + 10);
    expect(levelsGained).toBe(2);
    expect(player.level).toBe(3);
    expect(player.currentExp).toBe(10);
    expect(player.totalExp).toBe(130);
  });

  it('滿等後 currentExp 歸零、不超過 Lv.25', () => {
    const s = fresh();
    const { player } = applyExp(s.player, 100_000);
    expect(player.level).toBe(25);
    expect(player.currentExp).toBe(0);
  });

  it('第一次練習必升級（出席 ＋ q1_1 銅 ＋ 教練獎勵 25）', () => {
    let s = fresh();
    s = apply(s, checkIn(s, makeCtx()));
    s = approve(s, 'q1_1', 5);
    s = apply(s, grantBonus(s, makeCtx(), { exp: 25, coins: 12 }));
    expect(s.player.totalExp).toBe(80);
    expect(s.player.level).toBe(2);
  });
});

describe('DAG 解鎖', () => {
  it('初始只有起點節點解鎖', () => {
    const s = fresh();
    const unlocked = Object.values(s.progress.byNodeId).filter((p) => p.status === 'unlocked');
    expect(unlocked.map((p) => p.nodeId)).toEqual(['q1_1']);
  });

  it('第 3 章三向分支：q3_7 需 q3_2/q3_3/q3_4 皆完成；q3_8 需 q3_6 與 q3_7', () => {
    const byNodeId: Record<string, QuestProgress> = {};
    for (const q of C.quests) {
      byNodeId[q.id] = {
        nodeId: q.id, status: q.chapterId < 3 ? 'completed' : 'locked',
        currentCount: 0, bestCount: 0, tiersAwarded: [], attempts: 0,
      };
    }
    const set = (id: string, status: QuestProgress['status']) => (byNodeId[id] = { ...byNodeId[id], status });

    expect(computeUnlocked(C.quests, byNodeId)).toEqual(['q3_1']);
    set('q3_1', 'completed');
    expect(computeUnlocked(C.quests, byNodeId).sort()).toEqual(['q3_2', 'q3_3', 'q3_4']);
    set('q3_2', 'completed');
    set('q3_3', 'completed');
    set('q3_4', 'unlocked');
    expect(computeUnlocked(C.quests, byNodeId)).not.toContain('q3_7');
    set('q3_4', 'completed');
    expect(computeUnlocked(C.quests, byNodeId).sort()).toEqual(['q3_5', 'q3_7']);
    set('q3_5', 'completed');
    set('q3_7', 'completed');
    expect(computeUnlocked(C.quests, byNodeId)).toContain('q3_6');
    expect(computeUnlocked(C.quests, byNodeId)).not.toContain('q3_8');
    set('q3_6', 'completed');
    expect(computeUnlocked(C.quests, byNodeId)).toContain('q3_8');
  });

  it('第 1 章分支→匯流：q1_3、q1_4 兩者皆達銅才開 q1_5', () => {
    let s = fresh();
    s = approve(s, 'q1_1', 5);
    s = approve(s, 'q1_2', 3);
    expect(s.progress.byNodeId.q1_3.status).toBe('unlocked');
    expect(s.progress.byNodeId.q1_4.status).toBe('unlocked');
    s = approve(s, 'q1_3', 5);
    expect(s.progress.byNodeId.q1_5.status).toBe('locked');
    s = approve(s, 'q1_4', 2); // 未達銅
    expect(s.progress.byNodeId.q1_5.status).toBe('locked');
    s = approve(s, 'q1_4', 3);
    expect(s.progress.byNodeId.q1_5.status).toBe('unlocked');
  });
});

describe('核可的慶祝佇列（Step 6 驗收：五段依序）', () => {
  it('銀牌＋首次完成＋裝備＋連升兩級＋解鎖新節點，依 spec 順序排列', () => {
    let s = fresh();
    s = { ...s, player: { ...s.player, currentExp: 75 } }; // 75 + 銅30 + 銀18 = 123 ≥ 50+70 → 連升兩級
    const r = approveQuest(s, makeCtx(), { nodeId: 'q1_1', count: 10, feedback: '太厲害了' });
    const kinds = r.player.lastEvent!.items.map((i) => i.kind);
    expect(kinds).toEqual(['tier', 'tier', 'quest_completed', 'equipment', 'level_up', 'node_unlocked', 'coach_note']);
    const lv = r.player.lastEvent!.items.find((i) => i.kind === 'level_up');
    expect(lv).toEqual({ kind: 'level_up', from: 1, to: 3 });
  });
});

describe('兌換', () => {
  it('金幣不足時不能兌換，金幣不會被扣成負數', () => {
    const s = fresh();
    const item = C.rewards[0];
    expect(canRedeem(s.player, item, new Date()).ok).toBe(false);
    expect(() => applyRedeem(s.player, item, new Date())).toThrow();
    expect(() => redeemReward(s, makeCtx(), { itemId: item.id })).toThrow();
  });

  it('stockPerWeek：本週換完就不能再換；取消會退款並歸還額度', () => {
    let s = fresh();
    s = { ...s, player: { ...s.player, coins: 1000 } };
    const ctx = makeCtx();
    const r1 = redeemReward(s, ctx, { itemId: 'rw_bubble_tea' });
    s = apply(s, r1);
    expect(s.player.coins).toBe(900);
    expect(() => redeemReward(s, makeCtx(), { itemId: 'rw_bubble_tea' })).toThrow('這週已經換完');
    s = apply(s, cancelOrder(s, makeCtx(), { order: r1.orders![0] }));
    expect(s.player.coins).toBe(1000);
    expect(() => redeemReward(s, makeCtx(), { itemId: 'rw_bubble_tea' })).not.toThrow();
    // 下週額度重置
    const nextWeek = makeCtx({ now: new Date(2026, 2, 9, 10) });
    s = apply(s, redeemReward(s, makeCtx(), { itemId: 'rw_bubble_tea' }));
    expect(() => redeemReward(s, nextWeek, { itemId: 'rw_bubble_tea' })).not.toThrow();
  });
});

describe('簽到與里程碑', () => {
  it('每次簽到 +25 EXP +10 幣；第 5 次追加里程碑；同一天不能重複簽到', () => {
    let s = fresh();
    for (let i = 0; i < 5; i++) {
      s = apply(s, checkIn(s, makeCtx({ now: new Date(2026, 2, 2 + i * 3, 10) })));
    }
    expect(s.player.sessionCount).toBe(5);
    expect(s.player.totalExp).toBe(5 * 25 + 50);
    expect(s.player.coins).toBe(5 * 10 + 25);
    expect(s.player.lastEvent!.items.map((i) => i.kind)).toContain('milestone');
    expect(() => checkIn(s, makeCtx({ now: new Date(2026, 2, 14, 18) }))).toThrow('今天已經簽到過了');
  });

  it('簽到後的教練獎勵計入今日小計', () => {
    let s = fresh();
    s = apply(s, checkIn(s, makeCtx()));
    const r = grantBonus(s, makeCtx(), { exp: 30, coins: 20 });
    expect(r.player.activeSession!.expGiven).toBe(55);
    expect(r.player.activeSession!.bonusCoins).toBe(20);
    expect(r.session!.bonusExp).toBe(30);
  });
});

describe('章節揭露', () => {
  it('一開始只到第 1 章；打倒第 1 章魔王才揭露第 2 章並播「新的區域」', () => {
    let s = fresh();
    expect(reachedChapter(C, s.progress)).toBe(1);
    for (const [id, n] of [['q1_1', 5], ['q1_2', 3], ['q1_3', 5], ['q1_4', 3], ['q1_5', 3]] as [string, number][]) {
      s = approve(s, id, n);
    }
    expect(reachedChapter(C, s.progress)).toBe(1);
    const r = approveQuest(s, makeCtx(), { nodeId: 'q1_6', count: 5 });
    expect(reachedChapter(C, r.progress)).toBe(2);
    const kinds = r.player.lastEvent!.items.map((i) => i.kind);
    expect(kinds).toContain('chapter_unlocked');
    expect(kinds.indexOf('chapter_unlocked')).toBeLessThan(kinds.indexOf('node_unlocked'));
    expect(r.player.lastEvent!.items.find((i) => i.kind === 'chapter_unlocked')).toEqual({ kind: 'chapter_unlocked', chapterId: 2 });
  });

  it('同一章內解鎖新節點不會重複播「新的區域」', () => {
    const s = fresh();
    const r = approveQuest(s, makeCtx(), { nodeId: 'q1_1', count: 5 });
    expect(r.player.lastEvent!.items.some((i) => i.kind === 'chapter_unlocked')).toBe(false);
  });
});

describe('updateProfile', () => {
  it('可改名字與頭像；空白、過長會被擋；不寫日誌、不影響數值', () => {
    const s = fresh();
    const r = updateProfile(s, makeCtx(), { name: '  小羽  ', avatar: '👧' });
    expect(r.player.name).toBe('小羽');
    expect(r.player.avatar).toBe('👧');
    expect(r.logs).toEqual([]);
    expect(r.player.lastEvent).toBeUndefined();
    expect(r.player.totalExp).toBe(s.player.totalExp);
    expect(() => updateProfile(s, makeCtx(), { name: '   ' })).toThrow();
    expect(() => updateProfile(s, makeCtx(), { name: '一二三四五六七八九十十一' })).toThrow();
    // 沒有變化 → 不寫入
    expect(updateProfile(s, makeCtx(), { name: s.player.name }).playerChanged).toBe(false);
  });
});

describe('畢業', () => {
  it('q5_6 銅牌或滿 26 週才能畢業；畢業授予羽球勇者與勇者之拍', () => {
    const s = fresh();
    expect(checkGraduation(s.player, s.progress, C, new Date(2026, 2, 3)).eligible).toBe(false);
    expect(() => graduate(s, makeCtx())).toThrow();
    const later = makeCtx({ now: new Date(2026, 8, 1) }); // 26 週後
    expect(checkGraduation(s.player, s.progress, C, later.now).byWeeks).toBe(true);
    const r = graduate(s, later, { finalWords: '妳是最棒的勇者' });
    expect(r.player.graduatedAt).toBeTruthy();
    expect(r.player.unlockedTitleIds).toContain('title_hero');
    expect(r.player.currentTitleId).toBe('title_hero');
    expect(r.player.unlockedEquipmentIds).toContain('eq_champion_racket');
    expect(r.player.lastEvent!.items[0].kind).toBe('graduation');
    // 畢業後不能再挑戰
    expect(() => approveQuest({ player: r.player, progress: r.progress }, later, { nodeId: 'q1_1', count: 5 })).toThrow();
  });
});
