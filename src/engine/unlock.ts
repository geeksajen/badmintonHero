import type { QuestNode, QuestProgress } from '../types';

/**
 * 節點可解鎖 ⟺ 所有 parentIds 皆已達成銅牌（status === 'completed'）（spec §6.3）
 * 退役節點不參與解鎖計算（spec §12.5）。只回傳「由 locked 升為 unlocked」的節點 —— 只升不降。
 */
export function computeUnlocked(
  nodes: QuestNode[],
  progress: Record<string, QuestProgress>,
): string[] {
  return nodes
    .filter((n) => !n.isRetired)
    .filter((n) => progress[n.id]?.status === 'locked')
    .filter((n) => n.parentIds.every((p) => progress[p]?.status === 'completed'))
    .map((n) => n.id);
}

/** 地圖排序：先章節，再 order；id 永遠不參與排序（spec §12.3） */
export function visibleNodes(nodes: QuestNode[]): QuestNode[] {
  return nodes
    .filter((n) => !n.isRetired)
    .sort((a, b) => a.chapterId - b.chapterId || a.order - b.order);
}

export function emptyProgress(nodeId: string): QuestProgress {
  return { nodeId, status: 'locked', currentCount: 0, bestCount: 0, tiersAwarded: [], attempts: 0 };
}

/**
 * 補齊缺少的進度紀錄（新節點 → locked），絕不覆寫已存在的紀錄；
 * 孤兒紀錄（已無定義的 nodeId）原樣保留。回傳 null 表示不需要變更。
 */
export function fillMissingProgress(
  nodes: QuestNode[],
  byNodeId: Record<string, QuestProgress>,
): Record<string, QuestProgress> | null {
  const missing = nodes.filter((n) => !byNodeId[n.id]);
  if (missing.length === 0) return null;
  const next = { ...byNodeId };
  for (const n of missing) next[n.id] = emptyProgress(n.id);
  return next;
}

/** 反覆解鎖直到穩定（單次核可只會多一層，但保險起見跑到不動為止） */
export function unlockAll(
  nodes: QuestNode[],
  byNodeId: Record<string, QuestProgress>,
): { byNodeId: Record<string, QuestProgress>; unlockedIds: string[] } {
  let current = byNodeId;
  const all: string[] = [];
  for (;;) {
    const ids = computeUnlocked(nodes, current);
    if (ids.length === 0) break;
    current = { ...current };
    for (const id of ids) current[id] = { ...current[id], status: 'unlocked' };
    all.push(...ids);
  }
  return { byNodeId: current, unlockedIds: all };
}
