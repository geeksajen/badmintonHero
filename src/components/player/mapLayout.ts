import type { Chapter, ChapterId, QuestNode } from '../../types';
import { visibleNodes } from '../../engine/unlock';

export interface NodePos {
  node: QuestNode;
  x: number; // 0–100（%）
  y: number; // px，自地圖頂端起算
}

export interface ChapterBand {
  chapter: Chapter;
  top: number;
  height: number;
}

export interface MapLayout {
  height: number;
  nodes: NodePos[];
  bands: ChapterBand[];
  edges: { from: NodePos; to: NodePos }[];
}

const ROW_H = 150;
const BAND_PAD_BOTTOM = 70;
const BAND_HEADER = 160; // 章節標題區；需容得下魔王節點（1.5 倍）＋皇冠

/**
 * 由下往上的地圖版面（第 1 章在最下、王者之巔在頂端，「登頂」隱喻）。
 * 每章內依 DAG 深度分列：同一深度的節點並排（分岔），深度 +1 往上一列（匯流）。
 * 同一列內以 order 排序 —— id 不參與排序（spec §12.3）。
 */
export function computeMapLayout(chapters: Chapter[], quests: QuestNode[]): MapLayout {
  const nodes = visibleNodes(quests);
  const byId = new Map(nodes.map((n) => [n.id, n]));

  // 每章內的深度（只看同章的父節點）
  const depth = new Map<string, number>();
  const depthOf = (n: QuestNode): number => {
    const cached = depth.get(n.id);
    if (cached !== undefined) return cached;
    const parents = n.parentIds.map((p) => byId.get(p)).filter((p): p is QuestNode => !!p && p.chapterId === n.chapterId);
    const d = parents.length ? Math.max(...parents.map(depthOf)) + 1 : 0;
    depth.set(n.id, d);
    return d;
  };

  const sortedChapters = [...chapters].sort((a, b) => a.id - b.id);
  const rowsByChapter = new Map<ChapterId, QuestNode[][]>();
  for (const ch of sortedChapters) {
    const rows: QuestNode[][] = [];
    for (const n of nodes.filter((q) => q.chapterId === ch.id)) {
      const d = depthOf(n);
      (rows[d] ??= []).push(n);
    }
    rowsByChapter.set(ch.id, rows.filter(Boolean).map((r) => r.sort((a, b) => a.order - b.order)));
  }

  const bandHeights = sortedChapters.map(
    (ch) => BAND_PAD_BOTTOM + (rowsByChapter.get(ch.id)?.length ?? 0) * ROW_H + BAND_HEADER,
  );
  const height = bandHeights.reduce((s, h) => s + h, 0);

  const pos: NodePos[] = [];
  const bands: ChapterBand[] = [];
  let bottom = height; // 由下往上堆疊
  let globalRow = 0;
  sortedChapters.forEach((ch, i) => {
    const h = bandHeights[i];
    const top = bottom - h;
    bands.push({ chapter: ch, top, height: h });
    const rows = rowsByChapter.get(ch.id) ?? [];
    rows.forEach((row, r) => {
      const y = bottom - BAND_PAD_BOTTOM - r * ROW_H - ROW_H / 2;
      if (row.length === 1) {
        // 單一節點的列做 S 形擺動，讓路徑像一條蜿蜒的山路
        pos.push({ node: row[0], x: 50 + Math.sin(globalRow * 1.1) * 24, y });
      } else {
        row.forEach((n, k) => pos.push({ node: n, x: ((k + 1) / (row.length + 1)) * 100, y }));
      }
      globalRow += 1;
    });
    bottom = top;
  });

  const posById = new Map(pos.map((p) => [p.node.id, p]));
  const edges = pos.flatMap((p) =>
    p.node.parentIds.map((pid) => posById.get(pid)).filter((f): f is NodePos => !!f).map((from) => ({ from, to: p })),
  );

  return { height, nodes: pos, bands, edges };
}
