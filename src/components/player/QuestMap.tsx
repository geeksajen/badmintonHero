import { useEffect, useMemo, useRef, useState } from 'react';
import { reachedChapter, tallyChapter } from '../../engine/stats';
import { progOf, useReadyGame } from '../../hooks/useGameState';
import { markSeenNew, readSeenNew } from '../../lib/seenNew';
import type { QuestNode } from '../../types';
import { MedalTally } from '../ui/MedalBadge';
import { computeMapLayout } from './mapLayout';
import { QuestNodeItem } from './QuestNodeItem';

export function QuestMap({ onOpenNode }: { onOpenNode: (node: QuestNode) => void }) {
  const { curriculum, progress, player } = useReadyGame();
  const [seenNew, setSeenNew] = useState(readSeenNew);
  const reviewMode = !!player.graduatedAt;

  // 只顯示已到達的章節：還沒走到的章節對小孩完全隱藏（畢業後全部顯示）
  const lastChapter = curriculum.chapters[curriculum.chapters.length - 1].id;
  const maxChapter = reviewMode ? lastChapter : reachedChapter(curriculum, progress);
  const layout = useMemo(
    () =>
      computeMapLayout(
        curriculum.chapters.filter((c) => c.id <= maxChapter),
        curriculum.quests.filter((q) => q.chapterId <= maxChapter),
      ),
    [curriculum, maxChapter],
  );
  const hasMore = !reviewMode && maxChapter < lastChapter;

  // 開啟時捲到「目前的冒險前線」：最新章節裡可挑戰的節點（沒有的話就是該章起點）。只捲一次。
  const focusId = useMemo(() => {
    const byFrontier = (a: { node: QuestNode; y: number }, b: { node: QuestNode; y: number }) =>
      b.node.chapterId - a.node.chapterId || b.y - a.y;
    if (reviewMode) return [...layout.nodes].sort((a, b) => a.y - b.y)[0]?.node.id; // 回顧模式：山頂
    const open = layout.nodes.filter((p) => {
      const s = progress.byNodeId[p.node.id]?.status;
      return s === 'unlocked' || s === 'submitted';
    });
    const pool = open.length > 0 ? open : layout.nodes.filter((p) => p.node.chapterId === maxChapter);
    return [...pool].sort(byFrontier)[0]?.node.id;
  }, [layout, progress, reviewMode, maxChapter]);
  const scrolled = useRef(false);
  useEffect(() => {
    if (scrolled.current || !focusId) return;
    scrolled.current = true;
    document.getElementById(`node-${focusId}`)?.scrollIntoView({ block: 'center' });
  }, [focusId]);

  const open = (node: QuestNode) => {
    if (!seenNew.has(node.id) && node.addedInVersion) {
      markSeenNew(node.id);
      setSeenNew(readSeenNew());
    }
    onOpenNode(node);
  };

  const lit = (fromId: string) => reviewMode || progress.byNodeId[fromId]?.status === 'completed';

  return (
    <>
      {/* 地圖頂端的迷霧：只暗示「前面還有路」，不透露有幾章、叫什麼 */}
      {hasMore && (
        <div className="relative mx-auto flex h-40 w-full max-w-3xl flex-col items-center justify-center overflow-hidden bg-gradient-to-b from-slate-600 to-slate-400 text-white">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_60%,rgba(255,255,255,0.35),transparent_35%),radial-gradient(circle_at_75%_40%,rgba(255,255,255,0.3),transparent_30%),radial-gradient(circle_at_50%_90%,rgba(255,255,255,0.4),transparent_40%)]" />
          <div className="relative text-5xl">☁️ ❓ ☁️</div>
          <div className="relative mt-1 text-lg font-black drop-shadow">前方的路被雲遮住了…</div>
          <div className="relative text-base font-bold opacity-90">打倒這一區的魔王就能看見！</div>
        </div>
      )}
    <div className="relative mx-auto w-full max-w-3xl overflow-hidden" style={{ height: layout.height }}>
      {/* 章節區域背景 */}
      {layout.bands.map(({ chapter, top, height }) => {
        const t = tallyChapter(curriculum, chapter.id, progress);
        return (
          <div
            key={chapter.id}
            className={`absolute inset-x-0 bg-gradient-to-t ${chapter.theme}`}
            style={{ top, height }}
          >
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_30%,rgba(255,255,255,0.25),transparent_40%),radial-gradient(circle_at_80%_70%,rgba(255,255,255,0.18),transparent_35%)]" />
            <div className="relative flex flex-col items-center px-4 pt-5 text-center text-white drop-shadow">
              <div className="text-4xl">{chapter.icon}</div>
              <div className="text-2xl font-black">
                第 {chapter.id} 章・{chapter.name}
              </div>
              <div className="font-game text-sm font-bold opacity-90">{chapter.nameEn}</div>
              {/* 只增不減的呈現：已完成 N 個 ⭐ ＋ 獎牌數，不顯示百分比或分數 */}
              <div className="mt-1 flex flex-wrap items-center justify-center gap-x-3 rounded-full bg-black/20 px-3 py-0.5 text-sm font-bold">
                <span>已完成 {t.completed} 個 ⭐</span>
                <MedalTally gold={t.gold} silver={t.silver} bronze={t.bronze} />
              </div>
            </div>
          </div>
        );
      })}

      {/* DAG 路徑 */}
      <svg
        className="pointer-events-none absolute inset-0 h-full w-full"
        viewBox={`0 0 100 ${layout.height}`}
        preserveAspectRatio="none"
        aria-hidden
      >
        {layout.edges.map(({ from, to }) => {
          const midY = (from.y + to.y) / 2;
          const d = `M ${from.x} ${from.y} C ${from.x} ${midY}, ${to.x} ${midY}, ${to.x} ${to.y}`;
          const on = lit(from.node.id);
          return (
            <g key={`${from.node.id}-${to.node.id}`}>
              <path d={d} fill="none" stroke="rgba(30,27,75,0.35)" strokeWidth={14} vectorEffect="non-scaling-stroke" strokeLinecap="round" />
              <path
                d={d}
                fill="none"
                stroke={on ? '#fde047' : 'rgba(255,255,255,0.7)'}
                strokeWidth={on ? 8 : 5}
                strokeDasharray={on ? undefined : '2 12'}
                vectorEffect="non-scaling-stroke"
                strokeLinecap="round"
              />
            </g>
          );
        })}
      </svg>

      {/* 節點 */}
      {layout.nodes.map(({ node, x, y }) => (
        <QuestNodeItem
          key={node.id}
          node={node}
          prog={progOf(progress, node.id)}
          x={x}
          y={y}
          isNew={!!node.addedInVersion && node.addedInVersion > 1 && !seenNew.has(node.id)}
          reviewMode={reviewMode}
          onOpen={open}
        />
      ))}
    </div>
    </>
  );
}
