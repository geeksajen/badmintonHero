import { Map as MapIcon, ScrollText, Store } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { AdventureLog } from '../components/player/AdventureLog';
import { CelebrationModal } from '../components/player/CelebrationModal';
import { EquipmentDrawer } from '../components/player/EquipmentDrawer';
import { HeroHeader } from '../components/player/HeroHeader';
import { QuestDetailSheet } from '../components/player/QuestDetailSheet';
import { QuestMap } from '../components/player/QuestMap';
import { RewardShop } from '../components/player/RewardShop';
import { useCelebrationQueue } from '../hooks/useCelebrationQueue';
import { useReadyGame } from '../hooks/useGameState';
import type { QuestNode } from '../types';

type Tab = 'map' | 'shop' | 'log';

const TABS: { id: Tab; label: string; icon: typeof MapIcon }[] = [
  { id: 'map', label: '冒險地圖', icon: MapIcon },
  { id: 'shop', label: '商店', icon: Store },
  { id: 'log', label: '日誌', icon: ScrollText },
];

/** 小孩視角（iPad 優先）。注意：這個畫面不得有任何指向 Admin 的連結（spec §8.2）。 */
export function PlayerPage() {
  const { player, playerId } = useReadyGame();
  const [tab, setTab] = useState<Tab>('map');
  const [node, setNode] = useState<QuestNode | null>(null);
  const [bag, setBag] = useState(false);
  const queue = useCelebrationQueue(playerId, player.lastEvent);

  return (
    <div className="min-h-dvh bg-indigo-950 pb-28">
      <HeroHeader onOpenBag={() => setBag(true)} />

      {player.graduatedAt && (
        <Link
          to="/certificate"
          className="mx-auto mt-3 flex max-w-3xl items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-amber-300 to-fuchsia-400 px-4 py-4 text-xl font-black text-indigo-950 shadow-lg sm:mx-auto"
        >
          🎓 看我的畢業證書
        </Link>
      )}

      <main>
        {tab === 'map' && <QuestMap onOpenNode={setNode} />}
        {tab === 'shop' && <RewardShop />}
        {tab === 'log' && <AdventureLog />}
      </main>

      <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-white/10 bg-indigo-950/90 pb-[env(safe-area-inset-bottom)] backdrop-blur-md">
        <div className="mx-auto grid max-w-3xl grid-cols-3">
          {TABS.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              type="button"
              onClick={() => {
                setTab(id);
                window.scrollTo({ top: 0 });
              }}
              className={`flex min-h-[76px] flex-col items-center justify-center gap-1 text-lg font-black transition ${
                tab === id ? 'text-amber-300' : 'text-white/60'
              }`}
            >
              <Icon size={30} strokeWidth={tab === id ? 3 : 2} />
              {label}
            </button>
          ))}
        </div>
      </nav>

      <QuestDetailSheet node={node} onClose={() => setNode(null)} />
      <EquipmentDrawer open={bag} onClose={() => setBag(false)} />
      <CelebrationModal item={queue.current} remaining={queue.remaining} onNext={queue.next} />
    </div>
  );
}
