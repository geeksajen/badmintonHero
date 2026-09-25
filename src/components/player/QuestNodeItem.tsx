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
  hereAvatar,
  onOpen,
}: {
  node: QuestNode;
  prog: QuestProgress;
  x: number;
  y: number;
  isNew: boolean;
  reviewMode: boolean;
  hereAvatar?: string; // 目前關卡：顯示小朋友頭像的「你在這裡！」
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
    ? 'bg-gradient-to-br from-yellow-200 to-amber-400'
    : status === 'locked'
      ? 'bg-slate-300 text-slate-500'
      : status === 'completed'
        ? 'bg-gradient-to-br from-white to-yellow-100'
        : node.isBoss
          ? 'bg-gradient-to-br from-fuchsia-300 via-pink-400 to-rose-500 text-white'
          : 'bg-gradient-to-br from-cyan-200 via-sky-300 to-indigo-400 text-white';

  return (
    <div
      id={`node-${node.id}`}
      className={`absolute flex -translate-x-1/2 flex-col items-center ${hereAvatar ? 'z-10' : ''}`}
      style={{ left: `${x}%`, top: y - size / 2, width: Math.max(size, 100) }}
    >
      {/* 「你在這裡！」：用小朋友自己的頭像標示目前的關卡 */}
      {hereAvatar && (
        <div
          aria-hidden
          className="pointer-events-none absolute left-1/2 flex animate-bob flex-col items-center"
          style={{ top: node.isBoss ? -104 : -86 }}
        >
          <span className="toon-sm flex items-center gap-1 whitespace-nowrap rounded-full bg-yellow-300 py-0.5 pl-1 pr-3 text-base text-ink">
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-white text-2xl">{hereAvatar}</span>
            你在這裡！
          </span>
          <span className="-mt-[3px] h-0 w-0 border-x-[9px] border-t-[12px] border-x-transparent border-t-ink" />
        </div>
      )}
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
          className={`absolute inset-[12%] flex items-center justify-center overflow-hidden rounded-full border-[3px] border-ink ${faceBg}`}
          style={{ fontSize: size * 0.4 }}
        >
          {/* 左上角的亮光，讓按鈕像一顆糖果 */}
          <span className="pointer-events-none absolute left-[18%] top-[12%] h-[22%] w-[32%] -rotate-12 rounded-full bg-white/60" />
          <span className="relative drop-shadow-[0_2px_0_rgba(43,35,80,0.35)]">{face}</span>
        </span>
        {node.isBoss && (
          <span className="absolute -top-6 left-1/2 -translate-x-1/2">
            <Crown className="animate-wiggle fill-yellow-300 text-ink" size={38} strokeWidth={2.5} />
          </span>
        )}
        {isNew && (
          <span className="toon-sm absolute -right-3 -top-2 animate-wiggle rounded-full bg-rose-500 px-2 py-0.5 font-game text-xs font-extrabold text-white">
            NEW
          </span>
        )}
      </motion.button>
      <span
        className={`mt-1.5 line-clamp-2 rounded-xl px-2 py-0.5 text-center text-sm leading-tight ${
          locked ? 'bg-white/50 text-slate-500' : 'toon-sm bg-white text-ink'
        }`}
      >
        {node.title.replace('【魔王】', '')}
      </span>
    </div>
  );
}
