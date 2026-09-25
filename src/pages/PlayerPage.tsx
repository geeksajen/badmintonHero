import { motion } from 'framer-motion';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { AdventureLog } from '../components/player/AdventureLog';
import { CelebrationModal } from '../components/player/CelebrationModal';
import { TreasureChest } from '../components/player/TreasureChest';
import { HeroHeader } from '../components/player/HeroHeader';
import { ProfileEditor } from '../components/player/ProfileEditor';
import { QuestDetailSheet } from '../components/player/QuestDetailSheet';
import { QuestMap } from '../components/player/QuestMap';
import { RewardShop } from '../components/player/RewardShop';
import { useCelebrationQueue } from '../hooks/useCelebrationQueue';
import { useReadyGame } from '../hooks/useGameState';
import type { QuestNode } from '../types';

type Tab = 'map' | 'shop' | 'log';

const TABS: { id: Tab; label: string; emoji: string; color: string }[] = [
  { id: 'map', label: '冒險地圖', emoji: '🗺️', color: 'bg-lime-300' },
  { id: 'shop', label: '商店', emoji: '🏪', color: 'bg-amber-300' },
  { id: 'log', label: '日誌', emoji: '📜', color: 'bg-pink-300' },
];

/** 小孩視角（iPad 優先）。注意：這個畫面不得有任何指向 Admin 的連結（spec §8.2）。 */
export function PlayerPage() {
  const { player, playerId } = useReadyGame();
  const [tab, setTab] = useState<Tab>('map');
  const [node, setNode] = useState<QuestNode | null>(null);
  const [bag, setBag] = useState(false);
  const [profile, setProfile] = useState(false);
  const queue = useCelebrationQueue(playerId, player.lastEvent);

  return (
    <div className="kid-theme sky-bg min-h-dvh pb-32 text-ink">
      <HeroHeader onOpenBag={() => setBag(true)} onOpenProfile={() => setProfile(true)} />

      {player.graduatedAt && (
        <div className="px-3">
          <Link
            to="/certificate"
            className="toon toon-press mx-auto mt-2 flex max-w-3xl items-center justify-center gap-2 rounded-3xl bg-gradient-to-r from-amber-300 via-pink-300 to-violet-300 px-4 py-4 text-2xl text-ink"
          >
            <span className="animate-wiggle">🎓</span> 看我的畢業證書
          </Link>
        </div>
      )}

      <main>
        {tab === 'map' && <QuestMap onOpenNode={setNode} />}
        {tab === 'shop' && <RewardShop />}
        {tab === 'log' && <AdventureLog />}
      </main>

      <nav className="fixed inset-x-0 bottom-0 z-30 px-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] sm:px-4">
        <div className="toon mx-auto grid max-w-3xl grid-cols-3 gap-2 rounded-[1.75rem] bg-white/95 p-2 backdrop-blur-md">
          {TABS.map(({ id, label, emoji, color }) => {
            const active = tab === id;
            return (
              <motion.button
                key={id}
                type="button"
                whileTap={{ scale: 0.92 }}
                onClick={() => {
                  setTab(id);
                  window.scrollTo({ top: 0 });
                }}
                className={`flex min-h-[72px] flex-col items-center justify-center rounded-2xl text-lg transition ${
                  active ? `toon-sm ${color} text-ink` : 'text-slate-500'
                }`}
              >
                <motion.span
                  aria-hidden
                  className="text-3xl leading-none"
                  animate={active ? { y: [0, -6, 0], rotate: [0, -8, 8, 0] } : { y: 0, rotate: 0 }}
                  transition={{ duration: 0.5 }}
                >
                  {emoji}
                </motion.span>
                {label}
              </motion.button>
            );
          })}
        </div>
      </nav>

      <QuestDetailSheet node={node} onClose={() => setNode(null)} />
      <TreasureChest open={bag} onClose={() => setBag(false)} />
      <ProfileEditor open={profile} onClose={() => setProfile(false)} />
      <CelebrationModal item={queue.current} remaining={queue.remaining} onNext={queue.next} />
    </div>
  );
}
