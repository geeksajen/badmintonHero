import { describe, expect, it } from 'vitest';
import { computeMapLayout, trailSpots } from '../src/components/player/mapLayout';
import { badminton7yoV1 as C } from '../src/data/curricula/badminton-7yo-v1';

describe('森林背景不擋小路', () => {
  const layout = computeMapLayout(C.chapters, C.quests);
  const band = layout.bands.find((b) => b.chapter.id === 2)!;
  const spots = trailSpots(band, layout.nodes);

  it('只有單一關卡的列才放小路旁的動物', () => {
    const ch2 = layout.nodes.filter((n) => n.node.chapterId === 2);
    const rows = new Map<number, number>();
    for (const n of ch2) rows.set(n.y, (rows.get(n.y) ?? 0) + 1);
    const singleRows = [...rows.values()].filter((c) => c === 1).length;
    expect(spots).toHaveLength(singleRows);
    expect(spots.length).toBeGreaterThan(0);
  });

  it('與同一高度附近的關卡至少相隔 28% 寬度，且在 20～80% 之間（不進入兩側樹林）', () => {
    for (const s of spots) {
      expect(s.x).toBeGreaterThanOrEqual(20);
      expect(s.x).toBeLessThanOrEqual(80);
      const absY = s.y + band.top;
      for (const n of layout.nodes) {
        if (Math.abs(n.y - absY) < 100) expect(Math.abs(n.x - s.x)).toBeGreaterThanOrEqual(28);
      }
    }
  });

  it('所有關卡都離左右邊緣至少 20%（兩側樹林的邊帶是 0～10%）', () => {
    for (const n of layout.nodes) {
      expect(n.x).toBeGreaterThanOrEqual(20);
      expect(n.x).toBeLessThanOrEqual(80);
    }
  });
});
