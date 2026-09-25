import { motion } from 'framer-motion';
import { Backpack, Lock, Pencil, Volume2, VolumeX } from 'lucide-react';
import { Link } from 'react-router-dom';
import { expToNext } from '../../engine/exp';
import { weeksLeft } from '../../engine/graduation';
import { useReadyGame } from '../../hooks/useGameState';
import { useSound } from '../../hooks/useSound';
import { CoinCounter } from '../ui/CoinCounter';

export function HeroHeader({ onOpenBag, onOpenProfile }: { onOpenBag: () => void; onOpenProfile: () => void }) {
  const { player, curriculum } = useReadyGame();
  const { muted, toggleMute } = useSound();
  const need = expToNext(player.level, curriculum.levelCurve, curriculum.maxLevel);
  const pct = need === 0 ? 100 : Math.min(100, (player.currentExp / need) * 100);
  const title = curriculum.titles.find((t) => t.id === player.currentTitleId);
  const left = weeksLeft(player, curriculum, new Date());

  return (
    <header className="sticky top-0 z-30 border-b border-white/10 bg-indigo-950/85 px-3 pb-3 pt-[max(0.75rem,env(safe-area-inset-top))] text-white backdrop-blur-md sm:px-5">
      <div className="mx-auto flex max-w-3xl items-center gap-3">
        {/* 頭像 ＋ 等級徽章：點一下可以改名字／換頭像 */}
        <button type="button" onClick={onOpenProfile} aria-label="修改名字和頭像" className="relative shrink-0">
          <span className="flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-amber-300 to-pink-400 text-4xl shadow-lg ring-4 ring-white/30">
            {player.avatar}
          </span>
          <span className="absolute -left-1 -top-1 flex h-7 w-7 items-center justify-center rounded-full bg-white text-violet-700 shadow ring-2 ring-violet-300">
            <Pencil size={14} strokeWidth={3} />
          </span>
          <span className="absolute -bottom-1 -right-2 rounded-full bg-violet-600 px-2 py-0.5 font-game text-sm font-extrabold shadow ring-2 ring-white">
            Lv.{player.level}
          </span>
        </button>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <button type="button" onClick={onOpenProfile} className="min-w-0 truncate text-left text-xl font-black">
              {player.name}
            </button>
            {title && (
              <span className={`rounded-full px-2.5 py-0.5 text-sm font-bold text-white ${title.color}`}>{title.name}</span>
            )}
          </div>
          <div className="mt-1 flex flex-wrap items-center gap-x-3 text-sm font-bold text-white/80">
            <span className="whitespace-nowrap">🏸 練習 {player.sessionCount} / {curriculum.plannedSessions}</span>
            <span className="whitespace-nowrap">{player.graduatedAt ? '🎓 已畢業' : `⏳ 畢業倒數 ${left} 週`}</span>
          </div>
        </div>

        <CoinCounter
          value={player.coins}
          className="shrink-0 rounded-full bg-amber-400 px-3 py-1 text-xl font-black text-amber-950 shadow"
        />
      </div>

      {/* 第二列：EXP 條（全寬）＋ 背包 ＋ 靜音 */}
      <div className="mx-auto mt-2 flex max-w-3xl items-center gap-2">
        <div className="relative h-7 flex-1 overflow-hidden rounded-full bg-white/15">
          <motion.div
            className="h-full rounded-full bg-gradient-to-r from-lime-300 via-emerald-400 to-cyan-400"
            initial={false}
            animate={{ width: `${pct}%` }}
            transition={{ type: 'spring', stiffness: 60, damping: 16 }}
          />
          <span className="absolute inset-0 flex items-center justify-center font-game text-sm font-extrabold text-white drop-shadow-[0_1px_1px_rgba(0,0,0,0.6)]">
            {need === 0 ? 'MAX' : `${player.currentExp} / ${need} EXP`}
          </span>
        </div>
        <button
          type="button"
          onClick={onOpenBag}
          aria-label="裝備"
          className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-white/10 hover:bg-white/20"
        >
          <Backpack size={30} />
        </button>
        <button
          type="button"
          onClick={toggleMute}
          aria-label={muted ? '開啟聲音' : '靜音'}
          className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-white/10 hover:bg-white/20"
        >
          {muted ? <VolumeX size={28} /> : <Volume2 size={28} />}
        </button>
        {/* 家長入口：刻意低調；進去後仍需 PIN（spec §8.2 原本不放入口，但 PWA 全螢幕模式無法手動輸入網址） */}
        <Link
          to="/admin"
          aria-label="家長專區"
          className="flex h-16 w-12 shrink-0 items-center justify-center rounded-2xl text-white/25 hover:bg-white/10 hover:text-white/60"
        >
          <Lock size={20} />
        </Link>
      </div>
    </header>
  );
}
