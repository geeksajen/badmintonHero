import { Check } from 'lucide-react';
import { TIER_EMOJI } from '../../engine/tiers';
import { TIER_ORDER, type QuestNode, type QuestProgress } from '../../types';

/** 三階門檻條：🥉5 🥈10 🥇15，已頒發的打勾（以 tiersAwarded 為準），本次次數越過門檻時亮起 */
export function TierBar({ node, prog, count }: { node: QuestNode; prog: QuestProgress; count: number }) {
  return (
    <div className="grid grid-cols-3 gap-2">
      {TIER_ORDER.map((t) => {
        const awarded = prog.tiersAwarded.includes(t);
        const reachedNow = count >= node.tiers[t];
        return (
          <div
            key={t}
            className={`relative flex flex-col items-center rounded-2xl px-2 py-2 transition ${
              awarded
                ? 'toon-sm bg-emerald-100'
                : reachedNow
                  ? 'toon-sm scale-105 bg-yellow-100'
                  : 'border-[2.5px] border-dashed border-slate-300 bg-slate-50'
            }`}
          >
            <span className={`text-4xl ${awarded || reachedNow ? 'animate-float' : 'opacity-50 grayscale'}`}>{TIER_EMOJI[t]}</span>
            <span className="font-game text-2xl font-extrabold tabular-nums">
              {node.tiers[t]}
              <span className="ml-0.5 text-base">{node.unit}</span>
            </span>
            {awarded && (
              <span className="toon-sm absolute -right-2 -top-2 flex h-8 w-8 items-center justify-center rounded-full bg-emerald-400 text-white">
                <Check size={20} strokeWidth={4} />
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
}
