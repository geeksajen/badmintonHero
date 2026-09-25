import { Minus, Plus } from 'lucide-react';
import { useState } from 'react';
import { settleTiers, TIER_EMOJI, TIER_LABEL } from '../../engine/tiers';
import { useGameActions } from '../../hooks/useGameActions';
import { useReadyGame } from '../../hooks/useGameState';
import type { QuestNode, QuestProgress } from '../../types';
import { Button } from '../ui/Button';
import { useRun } from './useRun';

/** 待審／可挑戰清單共用的一列：可調整次數、寫一句話評語、核可或再練一次 */
export function QuestReviewRow({ node, prog, mode }: { node: QuestNode; prog: QuestProgress; mode: 'pending' | 'active' }) {
  const { curriculum } = useReadyGame();
  const actions = useGameActions();
  const { busy, run } = useRun();
  const [count, setCount] = useState(mode === 'pending' ? prog.currentCount : Math.max(prog.currentCount, 0));
  const [feedback, setFeedback] = useState('');
  const chapter = curriculum.chapters.find((c) => c.id === node.chapterId);

  const preview = settleTiers(node, { ...prog, bestCount: Math.max(prog.bestCount, count) }, curriculum.tierRatio);

  return (
    <div className="rounded-2xl border-2 border-slate-200 p-3">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <div className="text-sm font-bold text-slate-400">
            {chapter?.icon} {chapter?.name}・{node.id}
          </div>
          <div className="text-xl font-black leading-tight">{node.title}</div>
          <div className="text-sm text-slate-500">
            🥉{node.tiers.bronze} 🥈{node.tiers.silver} 🥇{node.tiers.gold} {node.unit}・最佳 {prog.bestCount}・嘗試 {prog.attempts} 次
            {prog.tiersAwarded.length > 0 && `・已得 ${prog.tiersAwarded.map((t) => TIER_EMOJI[t]).join('')}`}
          </div>
        </div>
      </div>
      <details className="mt-1 text-sm text-slate-500">
        <summary className="cursor-pointer font-bold">教學重點</summary>
        <p className="mt-1">{node.coachNote}</p>
      </details>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <button
          type="button"
          aria-label="減一"
          onClick={() => setCount((c) => Math.max(0, c - 1))}
          className="flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-100"
        >
          <Minus />
        </button>
        <input
          type="number"
          inputMode="numeric"
          min={0}
          value={count}
          onChange={(e) => setCount(Math.max(0, Number(e.target.value) || 0))}
          className="min-h-[64px] w-24 rounded-2xl border-2 border-slate-200 text-center text-3xl font-black"
          aria-label="次數"
        />
        <button
          type="button"
          aria-label="加一"
          onClick={() => setCount((c) => c + 1)}
          className="flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-100"
        >
          <Plus />
        </button>
        <span className="text-lg font-bold">{node.unit}</span>
        <span className="w-full text-sm font-bold text-emerald-700 sm:ml-auto sm:w-auto sm:text-right">
          {preview.pending.length > 0
            ? `將達成 ${preview.pending.map((t) => TIER_EMOJI[t] + TIER_LABEL[t]).join(' ')}（+${preview.exp} EXP）`
            : '不會新增獎牌'}
        </span>
      </div>

      <input
        value={feedback}
        onChange={(e) => setFeedback(e.target.value)}
        placeholder="一句話評語（選填，會出現在小孩畫面）"
        className="mt-2 min-h-[56px] w-full rounded-2xl border-2 border-slate-200 px-4 text-lg"
      />

      <div className="mt-2 grid grid-cols-2 gap-2">
        {mode === 'pending' ? (
          <Button
            variant="secondary"
            disabled={busy}
            onClick={() => run(() => actions.retryQuest({ nodeId: node.id, feedback }), '已請小孩再練一次')}
          >
            💪 再練習一次
          </Button>
        ) : (
          <span />
        )}
        <Button
          variant="success"
          disabled={busy}
          onClick={() => run(() => actions.approveQuest({ nodeId: node.id, count, feedback }), '已核可 🎉')}
        >
          ✅ {mode === 'pending' ? '核可通過' : '直接核可'}
        </Button>
      </div>
    </div>
  );
}
