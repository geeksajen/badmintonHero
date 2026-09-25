import { motion } from 'framer-motion';
import { Crown, Lock } from 'lucide-react';
import { TIER_EMOJI, highestAwarded } from '../../engine/tiers';
import type { QuestNode, QuestProgress } from '../../types';
import { ProgressRing } from '../ui/ProgressRing';

const BASE = 80;

export function QuestNodeItem({
  node,
  prog,
  x,
  y,
  isNew,
  reviewMode,
  onOpen,
}: {
  node: QuestNode;
  prog: QuestProgress;
  x: number;
  y: number;
  isNew: boolean;
  reviewMode: boolean;
  onOpen: (node: QuestNode) => void;
}) {
  const size = node.isBoss ? BASE * 1.5 : BASE; // 魔王放大 1.5 倍
  const highest = highestAwarded(prog);
  const status = prog.status;
  const locked = status === 'locked' && !reviewMode;

  const face = (() => {
    if (reviewMode) return highest ? TIER_EMOJI[highest] : '⭐';
    if (status === 'locked') return <Lock size={size * 0.36} strokeWidth={3} />;
    if (status === 'submitted') return '⏳';
    if (status === 'completed' && highest) return TIER_EMOJI[highest];
    if (prog.submittedAt) return '⏳';
    return prog.currentCount > 0 ? (
      <span className="font-game font-extrabold">{prog.currentCount}</span>
    ) : node.isBoss ? (
      '👾'
    ) : (
      '🏸'
    );
  })();

  const faceBg = reviewMode
    ? 'bg-gradient-to-br from-amber-200 to-amber-500'
    : status === 'locked'
      ? 'bg-slate-500 text-slate-300'
      : status === 'completed'
        ? 'bg-gradient-to-br from-white to-amber-100'
        : node.isBoss
          ? 'bg-gradient-to-br from-fuchsia-400 to-rose-500 text-white'
          : 'bg-gradient-to-br from-sky-300 to-violet-500 text-white';

  return (
    <div
      id={`node-${node.id}`}
      className="absolute flex -translate-x-1/2 flex-col items-center"
      style={{ left: `${x}%`, top: y - size / 2, width: Math.max(size, 100) }}
    >
      <motion.button
        type="button"
        disabled={locked}
        onClick={() => onOpen(node)}
        whileTap={locked ? undefined : { scale: 0.9 }}
        whileHover={locked ? undefined : { scale: 1.06 }}
        aria-label={`${node.title}${locked ? '（未解鎖）' : ''}`}
        className={`relative rounded-full ${locked ? 'cursor-not-allowed grayscale' : ''} ${
          status === 'unlocked' && !prog.submittedAt && !reviewMode ? 'animate-glow' : ''
        } ${status === 'submitted' && !reviewMode ? 'animate-breathe' : ''}`}
        style={{ width: size, height: size }}
      >
        <ProgressRing
          size={size}
          stroke={node.isBoss ? 11 : 8}
          count={prog.currentCount}
          tiers={node.tiers}
          highest={highest}
          mode={reviewMode ? 'gold' : status === 'locked' ? 'locked' : status === 'completed' ? 'completed' : 'progress'}
        />
        <span
          className={`absolute inset-[12%] flex items-center justify-center rounded-full shadow-inner ${faceBg}`}
          style={{ fontSize: size * 0.4 }}
        >
          {face}
        </span>
        {node.isBoss && (
          <Crown
            className="absolute -top-5 left-1/2 -translate-x-1/2 fill-amber-300 text-amber-500 drop-shadow"
            size={34}
          />
        )}
        {isNew && (
          <span className="absolute -right-3 -top-2 rounded-full bg-rose-500 px-2 py-0.5 font-game text-xs font-extrabold text-white shadow ring-2 ring-white">
            NEW
          </span>
        )}
      </motion.button>
      <span
        className={`mt-1.5 line-clamp-2 rounded-xl px-2 py-0.5 text-center text-sm font-bold leading-tight shadow ${
          locked ? 'bg-black/30 text-white/60' : 'bg-white/90 text-slate-800'
        }`}
      >
        {node.title.replace('【魔王】', '')}
      </span>
    </div>
  );
}
