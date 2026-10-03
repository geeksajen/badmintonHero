import { useEffect, useMemo, useRef, useState } from 'react';
import { reachedChapter, tallyChapter } from '../../engine/stats';
import { progOf, useReadyGame } from '../../hooks/useGameState';
import { markSeenNew, readSeenNew } from '../../lib/seenNew';
import type { QuestNode } from '../../types';
import { MedalTally } from '../ui/MedalBadge';
import { DEV_PREVIEW_AVAILABLE, setShowAllChapters, useShowAllChapters } from '../../lib/devPreview';
import { ChapterScenery } from './ChapterScenery';
import { computeMapLayout, trailSpots } from './mapLayout';
import { QuestNodeItem } from './QuestNodeItem';

export function QuestMap({ onOpenNode }: { onOpenNode: (node: QuestNode) => void }) {
  const { curriculum, progress, player } = useReadyGame();
  const [seenNew, setSeenNew] = useState(readSeenNew);
  const reviewMode = !!player.graduatedAt;
  const devShowAll = useShowAllChapters(); // 只有 npm run dev 時可能為 true

  // 只顯示已到達的章節：還沒走到的章節對小孩完全隱藏（畢業後、或開發預覽時全部顯示）
  const lastChapter = curriculum.chapters[curriculum.chapters.length - 1].id;
  const maxChapter = reviewMode || devShowAll ? lastChapter : reachedChapter(curriculum, progress);
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
      {DEV_PREVIEW_AVAILABLE && (
        <div className="mx-auto mt-2 flex max-w-3xl justify-center px-3">
          <button
            type="button"
            onClick={() => setShowAllChapters(!devShowAll)}
            className="rounded-full border-2 border-dashed border-ink/50 bg-white/80 px-4 py-2 font-mono text-sm text-ink"
          >
            🛠 DEV：{devShowAll ? '顯示全部章節（點一下改回只顯示已到達的章節）' : '只顯示已到達的章節（點一下顯示全部）'}
          </button>
        </div>
      )}
      {/* 地圖頂端的迷霧：只暗示「前面還有路」，不透露有幾章、叫什麼 */}
      {hasMore && (
        <div className="relative mx-auto mt-2 flex h-44 w-full max-w-3xl flex-col items-center justify-center overflow-hidden bg-gradient-to-b from-slate-400 via-slate-300 to-transparent text-ink">
          <span aria-hidden className="absolute left-[6%] top-6 animate-drift text-6xl opacity-90">☁️</span>
          <span aria-hidden className="absolute right-[8%] top-10 animate-drift text-7xl opacity-90 [animation-delay:-3s]">☁️</span>
          <span aria-hidden className="absolute bottom-2 left-[30%] animate-drift text-5xl opacity-80 [animation-delay:-1.5s]">☁️</span>
          <div className="toon-sm relative flex flex-col items-center rounded-3xl bg-white/90 px-5 py-2">
            <div className="animate-wiggle text-4xl">❓</div>
            <div className="text-xl">前方的路被雲遮住了…</div>
            <div className="text-base text-slate-500">打倒這一區的魔王就能看見！</div>
          </div>
        </div>
      )}
    <div className="relative mx-auto w-full max-w-3xl overflow-hidden" style={{ height: layout.height }}>
      {/* 章節區域背景 */}
      {layout.bands.map(({ chapter, top, height }) => {
        const t = tallyChapter(curriculum, chapter.id, progress);
        return (
          <div
            key={chapter.id}
            className={`dots absolute inset-x-0 bg-gradient-to-t ${chapter.theme}`}
            style={{ top, height }}
          >
            {/* 每一章的專屬場景（只在兩側邊帶與小路旁的空位，不擋到關卡） */}
            <ChapterScenery
              chapterId={chapter.id}
              height={height}
              trailSpots={trailSpots({ chapter, top, height }, layout.nodes)}
            />

            {/* 章節招牌 */}
            <div className="relative flex justify-center px-4 pt-4">
              <div className="toon relative flex flex-col items-center rounded-3xl bg-white/95 px-5 pb-2 pt-1 text-center">
                <span className="toon-sm absolute -top-3 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-yellow-300 px-3 text-sm">
                  第 {chapter.id} 章
                </span>
                <div className="mt-2 flex items-center gap-2">
                  <span className="animate-wiggle text-4xl">{chapter.icon}</span>
                  <span className="text-2xl">{chapter.name}</span>
                </div>
                <div className="font-game text-xs font-bold text-slate-400">{chapter.nameEn}</div>
                {/* 只增不減的呈現：已完成 N 個 ⭐ ＋ 獎牌數，不顯示百分比或分數 */}
                <div className="mt-1 flex flex-wrap items-center justify-center gap-x-3 text-sm">
                  <span>已完成 {t.completed} 個 ⭐</span>
                  <MedalTally gold={t.gold} silver={t.silver} bronze={t.bronze} />
                </div>
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
              {/* 卡通小路：深色描邊 ＋ 奶油色路面；走過的路變成金色 */}
              <path d={d} fill="none" stroke="rgba(43,35,80,0.55)" strokeWidth={20} vectorEffect="non-scaling-stroke" strokeLinecap="round" />
              <path
                d={d}
                fill="none"
                stroke={on ? '#facc15' : '#fff7ed'}
                strokeWidth={14}
                vectorEffect="non-scaling-stroke"
                strokeLinecap="round"
              />
              <path
                d={d}
                fill="none"
                stroke={on ? '#fef08a' : 'rgba(43,35,80,0.25)'}
                strokeWidth={4}
                strokeDasharray="2 14"
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
          hereAvatar={!reviewMode && node.id === focusId ? player.avatar : undefined}
          onOpen={open}
        />
      ))}
    </div>
    </>
  );
}
