import type { ActivityLog, CelebrationItem, ChapterId, LiveEvent, Player, QuestProgressDoc } from '../types';
import { addLog, finishLevelUps, startGrants, type Ctx } from './grant';
import { settleNode } from './settle';
import { newlyRevealedChapters, reachedChapter } from './stats';
import { fillMissingProgress, unlockAll } from './unlock';

export interface ReconcileResult {
  doc: QuestProgressDoc;
  player: Player;
  event?: LiveEvent;
  logs: ActivityLog[];
  changed: boolean;
}

/**
 * 關卡表改版後的進度校正（spec §12.5）。
 *
 * 性質（見 tests/reconcile.test.ts）：
 * - 冪等：連續跑兩次，第二次 changed === false 且輸出與輸入相同
 * - 單調：bestCount / tiersAwarded / status / totalExp / coins 每一項都 ≥ 輸入
 * - 無重複發放：沿用 settleNode 的 tiersAwarded 去重
 * - 退役安全：isRetired 節點不參與結算與解鎖，但其進度紀錄原樣保留
 */
export function reconcile(ctx: Ctx, doc: QuestProgressDoc, player: Player): ReconcileResult {
  const { curriculum } = ctx;
  const active = curriculum.quests.filter((n) => !n.isRetired);

  // 1. 補齊新節點（絕不覆寫既有紀錄）；2. 孤兒紀錄原樣保留（直接沿用 byNodeId）
  const filled = fillMissingProgress(curriculum.quests, doc.byNodeId);
  let byNodeId = filled ?? doc.byNodeId;
  let changed = filled !== null;

  const g = startGrants(player);
  let retroMedals = 0;

  // 3 + 4. 依現行門檻重跑結算；首次達銅者升為 completed（只升不降）
  for (const node of active) {
    const prog = byNodeId[node.id];
    const { prog: next, newTiers, becameCompleted } = settleNode(g, ctx, node, prog, { emitTierItems: false });
    if (next !== prog) {
      byNodeId = { ...byNodeId, [node.id]: next };
      changed = true;
    }
    retroMedals += newTiers.length;
    if (becameCompleted) changed = true;
  }
  if (g.player !== player) changed = true;

  // 5. 重算 DAG（只把 locked 升為 unlocked）
  const beforeUnlock = byNodeId;
  const unlocked = unlockAll(active, byNodeId, g.player.sessionCount);
  if (unlocked.unlockedIds.length > 0) {
    byNodeId = unlocked.byNodeId;
    changed = true;
  }
  const revealed = newlyRevealedChapters(curriculum, beforeUnlock, unlocked.unlockedIds);

  // 新節點：用「發現」的語氣包裝（spec §12.6）。
  // 只提已到達的章節 —— 還沒到的章節對小孩是隱藏的，不能因為改版而曝光。
  const reached = reachedChapter(curriculum, { byNodeId, updatedAt: '' });
  const newNodes = active.filter(
    (n) =>
      (n.addedInVersion ?? 1) > player.curriculumVersion &&
      (n.addedInVersion ?? 1) <= curriculum.version &&
      n.chapterId <= reached &&
      !revealed.includes(n.chapterId),
  );
  const versionChanged = player.curriculumVersion !== curriculum.version;
  if (!changed && !versionChanged) {
    return { doc, player, logs: [], changed: false };
  }

  // 6. 發放補償（升級）
  finishLevelUps(g, ctx);

  const discovery: CelebrationItem[] = [];
  const byChapter = new Map<ChapterId, number>();
  for (const n of newNodes) byChapter.set(n.chapterId, (byChapter.get(n.chapterId) ?? 0) + 1);
  for (const [chapterId, count] of byChapter) {
    discovery.push({ kind: 'discovery', chapterId, count });
    const ch = curriculum.chapters.find((c) => c.id === chapterId);
    addLog(g, ctx, {
      type: 'curriculum_updated',
      message: `🗺️ 教練在${ch?.name ?? '地圖'}裡發現了 ${count} 條新的小路！`,
    });
  }

  // 7. 有補發或新節點就產生 LiveEvent
  const items: CelebrationItem[] = [...discovery];
  if (retroMedals > 0) items.push({ kind: 'retro_medals', count: retroMedals });
  items.push(...g.items);
  for (const chapterId of revealed) items.push({ kind: 'chapter_unlocked', chapterId });
  if (unlocked.unlockedIds.length > 0) items.push({ kind: 'node_unlocked', nodeIds: unlocked.unlockedIds });

  const nowIso = ctx.now.toISOString();
  const event: LiveEvent | undefined = items.length > 0 ? { id: ctx.newId(), items, createdAt: nowIso } : undefined;

  // 8. 記錄已套用的版本
  const nextPlayer: Player = {
    ...g.player,
    curriculumVersion: curriculum.version,
    ...(event ? { lastEvent: event } : {}),
    ...(g.logs.length ? { logsRev: (g.player.logsRev ?? 0) + 1 } : {}),
    updatedAt: nowIso,
  };
  const nextDoc: QuestProgressDoc = byNodeId === doc.byNodeId ? doc : { byNodeId, updatedAt: nowIso };

  return { doc: nextDoc, player: nextPlayer, event, logs: g.logs, changed: true };
}
