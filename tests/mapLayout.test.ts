import { describe, expect, it } from 'vitest';
import { computeMapLayout, trailSpots } from '../src/components/player/mapLayout';
import { badminton7yoV1 as C } from '../src/data/curricula/badminton-7yo-v1';

describe('章節背景不擋小路（每一章）', () => {
  const layout = computeMapLayout(C.chapters, C.quests);

  for (const band of layout.bands) {
    describe(`第 ${band.chapter.id} 章 ${band.chapter.name}`, () => {
      const spots = trailSpots(band, layout.nodes);

      it('只有單一關卡的列才放小路旁的動物', () => {
        const rows = new Map<number, number>();
        for (const n of layout.nodes.filter((p) => p.node.chapterId === band.chapter.id)) {
          rows.set(n.y, (rows.get(n.y) ?? 0) + 1);
        }
        expect(spots).toHaveLength([...rows.values()].filter((c) => c === 1).length);
      });

      it('與同一高度附近的關卡至少相隔 28% 寬度，且在 20～80% 之間（不進入兩側邊帶）', () => {
        for (const s of spots) {
          expect(s.x).toBeGreaterThanOrEqual(20);
          expect(s.x).toBeLessThanOrEqual(80);
          const absY = s.y + band.top;
          for (const n of layout.nodes) {
            if (Math.abs(n.y - absY) < 100) expect(Math.abs(n.x - s.x)).toBeGreaterThanOrEqual(28);
          }
        }
      });
    });
  }

  it('所有關卡都離左右邊緣至少 20%（兩側景物的邊帶）', () => {
    for (const n of layout.nodes) {
      expect(n.x).toBeGreaterThanOrEqual(20);
      expect(n.x).toBeLessThanOrEqual(80);
    }
  });
});
