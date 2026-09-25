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

  // 出席次數 ＋ 畢業倒數（spec §7.1）；iPad 放名字下方，手機放按鈕左邊
  const stats = (compact: boolean) => (
    <>
      <span className="whitespace-nowrap rounded-full bg-emerald-100 px-2 py-0.5 text-emerald-800">
        🏸 {compact ? '' : '練習 '}
        {player.sessionCount}/{curriculum.plannedSessions}
      </span>
      <span className="whitespace-nowrap rounded-full bg-sky-100 px-2 py-0.5 text-sky-800">
        {player.graduatedAt ? '🎓 已畢業' : `⏳ ${compact ? '' : '畢業倒數 '}${left} 週`}
      </span>
    </>
  );

  return (
    <header className="sticky top-0 z-30 px-2 pb-2 pt-[max(0.5rem,env(safe-area-inset-top))] sm:px-4">
      <div className="toon mx-auto max-w-3xl rounded-[1.75rem] bg-white/95 px-3 pb-3 pt-3 text-ink backdrop-blur-md sm:px-4">
        <div className="flex items-center gap-3">
          {/* 頭像 ＋ 等級徽章：點一下可以改名字／換頭像 */}
          <button type="button" onClick={onOpenProfile} aria-label="修改名字和頭像" className="relative shrink-0">
            <span className="toon-sm flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-amber-200 via-pink-300 to-violet-300 text-4xl">
              {player.avatar}
            </span>
            <span className="toon-sm absolute -left-1.5 -top-1.5 flex h-7 w-7 items-center justify-center rounded-full bg-yellow-300 text-ink">
              <Pencil size={13} strokeWidth={3} />
            </span>
            <span className="toon-sm absolute -bottom-2 -right-3 rounded-full bg-violet-500 px-2 py-0.5 font-game text-sm font-extrabold text-white">
              Lv.{player.level}
            </span>
          </button>

          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
              <button type="button" onClick={onOpenProfile} className="-my-3 min-w-0 truncate py-3 text-left text-2xl leading-tight">
                {player.name}
              </button>
              {title && (
                <span className={`rounded-full px-2.5 py-0.5 text-sm text-white shadow-sm ${title.color}`}>🏷️ {title.name}</span>
              )}
            </div>
            {/* iPad：狀態標籤在名字下方 */}
            <div className="mt-1 hidden flex-wrap items-center gap-x-2 gap-y-1 text-sm sm:flex">{stats(false)}</div>
          </div>

          <div className="toon-sm relative shrink-0 overflow-hidden rounded-full bg-gradient-to-b from-yellow-300 to-amber-400 px-2.5 py-0.5 sm:px-3 sm:py-1">
            <CoinCounter value={player.coins} className="font-game text-xl font-extrabold text-amber-950 sm:text-2xl" />
            <span className="pointer-events-none absolute inset-y-0 left-0 w-1/3 animate-shine bg-white/50" />
          </div>
        </div>

        {/* 第二列：EXP 條 ＋ 背包 ＋ 靜音 ＋ 家長入口。手機上 EXP 條獨佔一行，狀態標籤移到按鈕左邊 */}
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <div className="toon-sm relative h-9 min-w-0 basis-full overflow-hidden rounded-full bg-indigo-100 sm:basis-0 sm:flex-1">
            <motion.div
              className="stripe-fill h-full animate-stripes rounded-full bg-gradient-to-r from-lime-400 via-emerald-400 to-cyan-400"
              initial={false}
              animate={{ width: `${Math.max(pct, 6)}%` }}
              transition={{ type: 'spring', stiffness: 60, damping: 16 }}
            />
            <span className="absolute inset-0 flex items-center justify-center gap-1 font-game text-base font-extrabold text-ink">
              ⭐ {need === 0 ? 'MAX' : `${player.currentExp} / ${need} EXP`}
            </span>
          </div>
          {/* 手機：狀態標籤 */}
          <div className="flex min-w-0 flex-1 flex-wrap items-center gap-1.5 text-sm sm:hidden">{stats(true)}</div>
          <button
            type="button"
            onClick={onOpenBag}
            aria-label="裝備"
            className="toon-sm toon-press flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-orange-300 text-ink"
          >
            <Backpack size={30} strokeWidth={2.5} />
          </button>
          <button
            type="button"
            onClick={toggleMute}
            aria-label={muted ? '開啟聲音' : '靜音'}
            className="toon-sm toon-press flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-sky-300 text-ink"
          >
            {muted ? <VolumeX size={28} strokeWidth={2.5} /> : <Volume2 size={28} strokeWidth={2.5} />}
          </button>
          {/* 家長入口：刻意低調；進去後仍需 PIN（spec §8.2 原本不放入口，但 PWA 全螢幕模式無法手動輸入網址） */}
          <Link
            to="/admin"
            aria-label="家長專區"
            className="flex h-16 w-10 shrink-0 items-center justify-center rounded-2xl text-slate-300 hover:text-slate-500"
          >
            <Lock size={18} />
          </Link>
        </div>
      </div>
    </header>
  );
}
