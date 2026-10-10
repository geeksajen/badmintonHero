import { AnimatePresence, motion } from 'framer-motion';
import { useEffect, useMemo, useState } from 'react';
import { petColorOf, petGrowth, petNameOf, petStageIndex, petWearOf } from '../../engine/pet';
import { nextGoal } from '../../engine/stats';
import { TIER_EMOJI, TIER_LABEL } from '../../engine/tiers';
import { useReadyGame } from '../../hooks/useGameState';
import { TIER_ORDER, type QuestNode } from '../../types';
import { PuppyArt } from './PuppyArt';

/** 地圖上「你在這裡！」標記的 DOM id（QuestNodeItem） */
const HERE_ID = 'here-marker';

/**
 * 地圖底部的「下一個目標」：固定在分頁列上方，點一下直接打開那一關。
 * 「你在這裡！」捲出畫面時，左邊多一顆狗狗頭按鈕，點了捲回去（原本的「回到我這裡」併進來，少佔一列）。
 */
export function NextGoalCard({ onOpenNode }: { onOpenNode: (node: QuestNode) => void }) {
  const { curriculum, progress, player } = useReadyGame();
  const goal = useMemo(() => nextGoal(curriculum, progress, player), [curriculum, progress, player]);

  // 「你在這裡！」是否在畫面上
  const [hereVisible, setHereVisible] = useState(true);
  useEffect(() => {
    if (typeof IntersectionObserver === 'undefined') return;
    const el = document.getElementById(HERE_ID);
    if (!el) {
      setHereVisible(true);
      return;
    }
    const io = new IntersectionObserver(([entry]) => setHereVisible(entry.isIntersecting), { threshold: 0.1 });
    io.observe(el);
    return () => io.disconnect();
  }, [progress, player.level]);
  const backToHere = () =>
    document.getElementById(HERE_ID)?.parentElement?.scrollIntoView({ block: 'center', behavior: 'smooth' });

  let label = '';
  let chip = '';
  let tone = 'bg-lime-200';
  if (goal?.kind === 'play') {
    const awarded = progress.byNodeId[goal.node.id]?.tiersAwarded ?? [];
    const tier = TIER_ORDER.find((t) => !awarded.includes(t)) ?? 'bronze';
    label = goal.others > 0 ? `下一關・還有 ${goal.others} 關也可以挑戰` : '下一關';
    chip = `${TIER_EMOJI[tier]} ${goal.node.tiers[tier]} ${goal.node.unit}`;
  } else if (goal?.kind === 'waiting') {
    label = '等教練確認中';
    tone = 'bg-amber-100';
  } else if (goal?.kind === 'polish') {
    label = `回頭挑戰${TIER_LABEL[goal.tier]}`;
    chip = `${TIER_EMOJI[goal.tier]} ${goal.node.tiers[goal.tier]} ${goal.node.unit}`;
    tone = 'bg-sky-100';
  }
  const graduated = !!player.graduatedAt;

  return (
    <AnimatePresence>
      {goal && (
        <motion.div
          key={goal.kind + goal.node.id}
          initial={{ y: 40, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 40, opacity: 0 }}
          className="pointer-events-none fixed inset-x-0 bottom-[calc(5.5rem+env(safe-area-inset-bottom))] z-20 px-2 sm:px-4"
        >
          <div className="mx-auto flex w-full max-w-3xl items-stretch gap-1.5">
            {!hereVisible && (
              <motion.button
                type="button"
                aria-label="回到我這裡"
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                whileTap={{ scale: 0.9 }}
                onClick={backToHere}
                className="toon pointer-events-auto flex w-16 shrink-0 flex-col items-center justify-center rounded-3xl bg-yellow-300 py-1 text-[11px] leading-tight text-ink"
              >
                <span className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-full border-2 border-ink bg-sky-100">
                  <PuppyArt
                    crop="head"
                    stage={petStageIndex(player.level, graduated)}
                    growth={petGrowth(player.level, graduated)}
                    color={petColorOf(player)}
                    wear={petWearOf(player)}
                    still
                    className="h-full w-full"
                    title={petNameOf(player)}
                  />
                </span>
                回到我這裡
              </motion.button>
            )}
            <motion.button
              type="button"
              whileTap={{ scale: 0.97 }}
              onClick={() => onOpenNode(goal.node)}
              className={`toon toon-press pointer-events-auto flex min-h-[64px] min-w-0 flex-1 items-center gap-2 rounded-3xl ${tone} px-3 py-1 text-left text-ink`}
            >
              <span aria-hidden className={`text-3xl ${goal.kind === 'play' ? 'animate-bounce' : ''}`}>
                {goal.kind === 'play' ? '👉' : goal.kind === 'waiting' ? '⏳' : '⭐'}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm text-slate-600">{label}</span>
                <span className="block truncate text-xl leading-tight">{goal.node.title.replace('【魔王】', '👑 ')}</span>
              </span>
              {chip && <span className="toon-sm shrink-0 rounded-full bg-white px-2.5 py-0.5 text-base">{chip}</span>}
            </motion.button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
