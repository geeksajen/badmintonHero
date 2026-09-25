import { LogOut } from 'lucide-react';
import { Link } from 'react-router-dom';
import { ActiveQuestList } from '../components/admin/ActiveQuestList';
import { BonusDispatcher } from '../components/admin/BonusDispatcher';
import { CourseProgress } from '../components/admin/CourseProgress';
import { DangerZone } from '../components/admin/DangerZone';
import { OrderList } from '../components/admin/OrderList';
import { PendingList } from '../components/admin/PendingList';
import { usePendingNodes } from '../components/admin/usePendingNodes';
import { SessionCheckIn } from '../components/admin/SessionCheckIn';
import { ShopManager } from '../components/admin/ShopManager';
import { ToastProvider } from '../components/ui/Toast';
import { useGameActions } from '../hooks/useGameActions';
import { useReadyGame } from '../hooks/useGameState';

const SECTIONS: [string, string][] = [
  ['today', '今日'],
  ['pending', '待審'],
  ['active', '挑戰'],
  ['bonus', '獎勵'],
  ['orders', '訂單'],
  ['course', '進度'],
  ['shop', '商店'],
  ['danger', '危險'],
];

/** 家長視角（手機優先） */
export function AdminPage() {
  const { player, store } = useReadyGame();
  const actions = useGameActions();
  const pendingCount = usePendingNodes().length;

  return (
    <ToastProvider>
      <div className="min-h-dvh bg-slate-100 pb-24">
        <header className="sticky top-0 z-30 bg-slate-900 px-4 pb-2 pt-[max(0.75rem,env(safe-area-inset-top))] text-white shadow">
          <div className="mx-auto flex max-w-2xl items-center justify-between gap-2">
            <div className="min-w-0">
              <div className="text-sm font-bold text-white/60">家長控制台</div>
              <div className="truncate text-lg font-black">
                {player.avatar} {player.name}・Lv.{player.level}・🪙{player.coins}
              </div>
            </div>
            <div className="flex shrink-0 items-center gap-1">
              <Link to="/" className="flex min-h-[48px] items-center whitespace-nowrap rounded-xl px-3 font-bold text-white/80 hover:bg-white/10">
                小孩畫面
              </Link>
              {store?.mode === 'firebase' && (
                <button
                  type="button"
                  aria-label="登出"
                  onClick={() => void actions.signOut()}
                  className="flex h-12 w-12 items-center justify-center rounded-xl hover:bg-white/10"
                >
                  <LogOut size={22} />
                </button>
              )}
            </div>
          </div>
          <nav className="mx-auto mt-2 flex max-w-2xl gap-1 overflow-x-auto pb-1">
            {SECTIONS.map(([id, label]) => (
              <a
                key={id}
                href={`#${id}`}
                onClick={(e) => {
                  // HashRouter 佔用了 #，改用程式捲動
                  e.preventDefault();
                  document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
                }}
                className="relative shrink-0 rounded-full bg-white/10 px-4 py-2 text-base font-bold"
              >
                {label}
                {id === 'pending' && pendingCount > 0 && (
                  <span className="absolute -right-1 -top-1 flex h-6 min-w-6 items-center justify-center rounded-full bg-rose-500 px-1 text-xs font-black">
                    {pendingCount}
                  </span>
                )}
              </a>
            ))}
          </nav>
        </header>

        <main className="mx-auto max-w-2xl space-y-4 px-3 pt-4">
          <SessionCheckIn />
          <PendingList />
          <ActiveQuestList />
          <BonusDispatcher />
          <OrderList />
          <CourseProgress />
          <ShopManager />
          <DangerZone />
        </main>
      </div>
    </ToastProvider>
  );
}
