import { describe, expect, it } from 'vitest';
import { CURRICULA } from '../src/data';
import { computeTotals, simulate52, validateCurriculum } from '../src/engine/validate';
import { visibleNodes } from '../src/engine/unlock';

describe('課程包靜態資料（Step 0 驗收）', () => {
  for (const c of Object.values(CURRICULA)) {
    it(`${c.id}: 結構檢查無錯誤`, () => {
      expect(validateCurriculum(c).errors).toEqual([]);
    });
  }

  const c = CURRICULA['badminton-7yo-v1'];

  it('數值總和與 spec §4.4 一致', () => {
    const t = computeTotals(c);
    expect(t.nodes).toBe(34);
    expect(t.exp).toBe(3970);
    expect(t.coins).toBe(1985);
    expect(t.milestoneExp).toBe(800);
    expect(t.curveTotal).toBe(6720);
  });

  it('每個節點 bronze < silver < gold', () => {
    for (const q of c.quests) {
      expect(q.tiers.bronze).toBeLessThan(q.tiers.silver);
      expect(q.tiers.silver).toBeLessThan(q.tiers.gold);
    }
  });

  it('order 在同一章內唯一且以 10 為間隔', () => {
    for (const ch of c.chapters) {
      const orders = c.quests.filter((q) => q.chapterId === ch.id).map((q) => q.order);
      expect(new Set(orders).size).toBe(orders.length);
      expect(orders.every((o) => o % 10 === 0)).toBe(true);
    }
  });

  it('地圖排序只看 chapterId ＋ order，不看 id', () => {
    const shuffled = [...c.quests].reverse().map((q) => (q.id === 'q2_3' ? { ...q, id: 'zzz' } : q));
    const ids = visibleNodes(shuffled).map((q) => q.id);
    expect(ids.indexOf('zzz')).toBe(ids.indexOf('q2_2') + 1);
  });

  it('52 次練習模擬：全金牌滿等落在第 5 章', () => {
    const rows = simulate52(c, { sessionsPerChapter: [6, 12, 14, 10, 10], coachExp: 25, coachCoins: 12, tierRate: 1 });
    const max = rows.find((r) => r.level >= c.maxLevel)!;
    expect(max.chapterId).toBe(5);
  });
});
