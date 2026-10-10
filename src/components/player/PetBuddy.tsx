import { motion, useReducedMotion } from 'framer-motion';
import { petColorOf, petGrowth, petNameOf, petStageIndex, petWearOf } from '../../engine/pet';
import { useReadyGame } from '../../hooks/useGameState';
import { PuppyArt } from './PuppyArt';
import { SpeakButton } from './SpeakButton';

/**
 * 狗狗夥伴在其他畫面「陪著」小孩：一顆狗狗臉＋一句話。
 * bump 每次改變，狗狗就跳一下（例如按 ＋1 時）。
 */
export function PetBuddy({ line, bump = 0, speak = true }: { line: string; bump?: number; speak?: boolean }) {
  const { player } = useReadyGame();
  const reduce = !!useReducedMotion();
  const graduated = !!player.graduatedAt;
  const stage = petStageIndex(player.level, graduated);

  return (
    <div className="flex items-center gap-2">
      <motion.div
        key={bump}
        animate={reduce || bump === 0 ? undefined : { y: [0, -14, 0], rotate: [0, -8, 8, 0] }}
        transition={{ duration: 0.45 }}
        className="h-16 w-16 shrink-0 overflow-hidden rounded-full border-[3px] border-ink bg-sky-100"
      >
        <PuppyArt
          crop="head"
          stage={stage}
          growth={petGrowth(player.level, graduated)}
          color={petColorOf(player)}
          wear={petWearOf(player)}
          happy={bump > 0 && stage > 0}
          still={reduce}
          className="h-full w-full"
          title={petNameOf(player)}
        />
      </motion.div>
      <div className="relative flex min-h-[64px] flex-1 items-center gap-2 rounded-2xl border-[3px] border-ink bg-white py-1 pl-3 pr-1 text-lg text-ink">
        <span aria-hidden className="absolute -left-[11px] top-1/2 h-0 w-0 -translate-y-1/2 border-y-[8px] border-r-[10px] border-y-transparent border-r-ink" />
        <p className="flex-1 leading-snug">{line}</p>
        {speak && <SpeakButton text={line} label="念給我聽" />}
      </div>
    </div>
  );
}
