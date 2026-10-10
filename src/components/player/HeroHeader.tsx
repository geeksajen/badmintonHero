import { motion } from 'framer-motion';
import { Lock, Volume2, VolumeX } from 'lucide-react';
import { Link } from 'react-router-dom';
import { effectiveRewards } from '../../engine/economy';
import { expToNext } from '../../engine/exp';
import { useReadyGame } from '../../hooks/useGameState';
import { useSound } from '../../hooks/useSound';
import { CoinCounter } from '../ui/CoinCounter';

/**
 * 小孩畫面頂端：精簡成兩列（手機為主，讓地圖看得到更多）。
 * 第一列：頭像（點一下改名字／頭像）、名字＋稱號、金幣、靜音、家長入口
 * 第二列：EXP 條＋存錢目標
 * 練習次數／畢業倒數在日誌分頁，寶物箱在夥伴分頁。
 */
export function HeroHeader({ onOpenProfile }: { onOpenProfile: () => void }) {
  const { player, curriculum } = useReadyGame();
  const { muted, toggleMute } = useSound();
  const need = expToNext(player.level, curriculum.levelCurve, curriculum.maxLevel);
  const pct = need === 0 ? 100 : Math.min(100, (player.currentExp / need) * 100);
  const title = curriculum.titles.find((t) => t.id === player.currentTitleId);
  // 存錢目標（在商店釘選）：只顯示「還差多少」，數字只會變小
  const goal = player.savingsGoalId
    ? effectiveRewards(curriculum.rewards, player).find((r) => r.id === player.savingsGoalId)
    : undefined;

  return (
    <header className="sticky top-0 z-30 px-2 pb-1.5 pt-[max(0.375rem,env(safe-area-inset-top))] sm:px-4">
      <div className="toon mx-auto max-w-3xl rounded-[1.5rem] bg-white/95 px-2.5 pb-2 pt-2 text-ink backdrop-blur-md sm:px-4">
        <div className="flex items-center gap-2">
          {/* 頭像 ＋ 等級：點一下可以改名字／換頭像 */}
          <button type="button" onClick={onOpenProfile} aria-label="修改名字和頭像" className="relative shrink-0">
            <span className="toon-sm flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-amber-200 via-pink-300 to-violet-300 text-3xl">
              {player.avatar}
            </span>
            <span className="toon-sm absolute -bottom-1.5 -right-2 rounded-full bg-violet-500 px-1.5 font-game text-xs font-extrabold leading-5 text-white">
              Lv.{player.level}
            </span>
          </button>

          <button type="button" onClick={onOpenProfile} className="min-w-0 flex-1 text-left">
            <span className="block truncate text-xl leading-tight">{player.name}</span>
            {title && (
              <span className={`mt-0.5 inline-block max-w-full truncate rounded-full px-2 text-xs leading-5 text-white ${title.color}`}>
                🏷️ {title.name}
              </span>
            )}
          </button>

          <div className="toon-sm relative shrink-0 overflow-hidden rounded-full bg-gradient-to-b from-yellow-300 to-amber-400 px-2.5 py-0.5">
            <CoinCounter value={player.coins} className="font-game text-xl font-extrabold text-amber-950" />
            <span className="pointer-events-none absolute inset-y-0 left-0 w-1/3 animate-shine bg-white/50" />
          </div>
          <button
            type="button"
            onClick={toggleMute}
            aria-label={muted ? '開啟聲音' : '靜音'}
            className="toon-sm toon-press flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-sky-300 text-ink"
          >
            {muted ? <VolumeX size={24} strokeWidth={2.5} /> : <Volume2 size={24} strokeWidth={2.5} />}
          </button>
          {/* 家長入口：刻意低調；進去後仍需 PIN（spec §8.2：PWA 全螢幕模式無法手動輸入網址） */}
          <Link
            to="/admin"
            aria-label="家長專區"
            className="-mr-1 flex h-12 w-7 shrink-0 items-center justify-center text-slate-300 hover:text-slate-500"
          >
            <Lock size={15} />
          </Link>
        </div>

        <div className="mt-2 flex items-center gap-2">
          <div className="toon-sm relative h-6 min-w-0 flex-1 overflow-hidden rounded-full bg-indigo-100">
            <motion.div
              className="stripe-fill h-full animate-stripes rounded-full bg-gradient-to-r from-lime-400 via-emerald-400 to-cyan-400"
              initial={false}
              animate={{ width: `${Math.max(pct, 6)}%` }}
              transition={{ type: 'spring', stiffness: 60, damping: 16 }}
            />
            <span className="absolute inset-0 flex items-center justify-center gap-1 font-game text-sm font-extrabold text-ink">
              ⭐ {need === 0 ? 'MAX' : `${player.currentExp} / ${need} EXP`}
            </span>
          </div>
          {goal && (
            <span className="shrink-0 whitespace-nowrap rounded-full bg-rose-100 px-2 text-sm leading-6 text-rose-800">
              📌 {goal.icon} {player.coins >= goal.cost ? '可以換了！🎉' : `差 ${goal.cost - player.coins} 🪙`}
            </span>
          )}
        </div>
      </div>
    </header>
  );
}
