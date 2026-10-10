import { LogOut } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ADMIN_SECTION_EVENT, openAdminSection } from '../components/admin/adminNav';
import { toDateStr } from '../engine/util';
import { ActiveQuestList } from '../components/admin/ActiveQuestList';
import { BonusDispatcher } from '../components/admin/BonusDispatcher';
import { CourseProgress } from '../components/admin/CourseProgress';
import { DangerZone } from '../components/admin/DangerZone';
import { FieldNotes } from '../components/admin/FieldNotes';
import { OrderList } from '../components/admin/OrderList';
import { PendingList } from '../components/admin/PendingList';
import { usePendingNodes } from '../components/admin/usePendingNodes';
import { useStuckNodes } from '../components/admin/useStuckNodes';
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
  ['notes', '筆記'],
  ['course', '進度'],
  ['shop', '商店'],
  ['danger', '危險'],
];

/** 練習中模式會收進「其他管理」的區塊 */
const OTHER_SECTIONS = new Set(['orders', 'notes', 'course', 'shop', 'danger']);

/** 家長視角（手機優先） */
export function AdminPage() {
  const { player, store } = useReadyGame();
  const actions = useGameActions();
  const pendingCount = usePendingNodes().length;
  const stuckCount = useStuckNodes().length;

  // 練習中模式：今天已簽到 → 球場上用得到的（今日、待審、挑戰、獎勵）放上面，其他收起來
  const practicing = player.activeSession?.date === toDateStr(new Date());
  const [showOther, setShowOther] = useState(false);
  const otherOpen = !practicing || showOther;

  // 任何地方要求打開某個區塊：先展開（如果被收起來），再捲過去
  useEffect(() => {
    const onOpen = (e: Event) => {
      const id = (e as CustomEvent<string>).detail;
      if (OTHER_SECTIONS.has(id)) setShowOther(true);
      // 等展開後的畫面渲染完再捲動
      setTimeout(() => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' }), 50);
    };
    window.addEventListener(ADMIN_SECTION_EVENT, onOpen);
    return () => window.removeEventListener(ADMIN_SECTION_EVENT, onOpen);
  }, []);

  return (
    <ToastProvider>
      <div className="min-h-dvh bg-slate-100 pb-24">
        <header className="sticky top-0 z-30 bg-slate-900 px-4 pb-2 pt-[max(0.75rem,env(safe-area-inset-top))] text-white shadow">
          <div className="mx-auto flex max-w-2xl items-center justify-between gap-2">
            <div className="min-w-0">
              <div className="text-sm font-bold text-white/60">
                家長控制台
                {practicing && <span className="ml-2 rounded-full bg-emerald-500 px-2 py-0.5 text-xs text-white">🏸 練習中</span>}
              </div>
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
                  openAdminSection(id);
                }}
                className={`relative shrink-0 rounded-full px-4 py-2 text-base font-bold ${
                  practicing && OTHER_SECTIONS.has(id) ? 'bg-white/5 text-white/60' : 'bg-white/10'
                }`}
              >
                {label}
                {id === 'pending' && pendingCount > 0 && (
                  <span className="absolute -right-1 -top-1 flex h-6 min-w-6 items-center justify-center rounded-full bg-rose-500 px-1 text-xs font-black">
                    {pendingCount}
                  </span>
                )}
                {id === 'notes' && stuckCount > 0 && (
                  <span className="absolute -right-1 -top-1 flex h-6 min-w-6 items-center justify-center rounded-full bg-amber-400 px-1 text-xs font-black text-amber-950">
                    {stuckCount}
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
          {practicing && (
            <button
              type="button"
              onClick={() => setShowOther((v) => !v)}
              aria-expanded={showOther}
              className="flex min-h-[64px] w-full items-center justify-between gap-3 rounded-3xl border-2 border-dashed border-slate-300 bg-white/70 px-5 py-2 text-left font-bold text-slate-600"
            >
              <span className="min-w-0">
                <span className="block text-lg">🧰 其他管理</span>
                <span className="block text-sm font-normal text-slate-500">訂單、筆記、進度、商店、危險操作</span>
              </span>
              <span className="shrink-0 whitespace-nowrap text-lg">{showOther ? '收起 ▲' : '展開 ▼'}</span>
            </button>
          )}
          {otherOpen && (
            <>
              <OrderList />
              <FieldNotes />
              <CourseProgress />
              <ShopManager />
              <DangerZone />
            </>
          )}
        </main>
      </div>
    </ToastProvider>
  );
}
