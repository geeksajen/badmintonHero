import { AnimatePresence, motion } from 'framer-motion';
import { useMemo } from 'react';
import { nextGoal } from '../../engine/stats';
import { TIER_EMOJI, TIER_LABEL } from '../../engine/tiers';
import { useReadyGame } from '../../hooks/useGameState';
import { TIER_ORDER, type QuestNode } from '../../types';

/**
 * 地圖上的「下一個目標」：固定在底部分頁列上方，點一下直接打開那一關。
 * 地圖由下往上、關卡一多就要捲動找，這張卡讓小孩永遠知道「現在要做什麼」。
 */
export function NextGoalCard({ onOpenNode }: { onOpenNode: (node: QuestNode) => void }) {
  const { curriculum, progress, player } = useReadyGame();
  const goal = useMemo(() => nextGoal(curriculum, progress, player), [curriculum, progress, player]);

  let label = '';
  let chip = '';
  let tone = 'bg-lime-200';
  if (goal?.kind === 'play') {
    const awarded = progress.byNodeId[goal.node.id]?.tiersAwarded ?? [];
    const tier = TIER_ORDER.find((t) => !awarded.includes(t)) ?? 'bronze';
    label = goal.others > 0 ? `下一關（還有 ${goal.others} 關也可以挑戰）` : '下一關';
    chip = `${TIER_EMOJI[tier]} ${goal.node.tiers[tier]} ${goal.node.unit}`;
  } else if (goal?.kind === 'waiting') {
    label = '等教練確認中';
    chip = '⏳';
    tone = 'bg-amber-100';
  } else if (goal?.kind === 'polish') {
    label = `回頭挑戰${TIER_LABEL[goal.tier]}`;
    chip = `${TIER_EMOJI[goal.tier]} ${goal.node.tiers[goal.tier]} ${goal.node.unit}`;
    tone = 'bg-sky-100';
  }

  return (
    <AnimatePresence>
      {goal && (
        <motion.div
          key={goal.kind + goal.node.id}
          initial={{ y: 40, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 40, opacity: 0 }}
          className="pointer-events-none fixed inset-x-0 bottom-[calc(6.75rem+env(safe-area-inset-bottom))] z-20 px-3 sm:px-5"
        >
          <motion.button
            type="button"
            whileTap={{ scale: 0.96 }}
            onClick={() => onOpenNode(goal.node)}
            className={`toon toon-press pointer-events-auto mx-auto flex w-full max-w-3xl items-center gap-3 rounded-3xl ${tone} px-4 py-2 text-left text-ink`}
          >
            <span aria-hidden className={`text-4xl ${goal.kind === 'play' ? 'animate-bounce' : ''}`}>
              {goal.kind === 'play' ? '👉' : goal.kind === 'waiting' ? '⏳' : '⭐'}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-base text-slate-600">{label}</span>
              <span className="block truncate text-2xl leading-tight">{goal.node.title.replace('【魔王】', '👑 ')}</span>
            </span>
            {chip && goal.kind !== 'waiting' && (
              <span className="toon-sm shrink-0 rounded-full bg-white px-3 py-1 text-lg">{chip}</span>
            )}
          </motion.button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
