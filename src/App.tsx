import type { ReactNode } from 'react';
import { HashRouter, Navigate, Route, Routes } from 'react-router-dom';
import { PinGate } from './components/admin/PinGate';
import { DevCounter } from './components/DevCounter';
import { LoginGate } from './components/LoginGate';
import { useGameState } from './hooks/useGameState';
import { AdminPage } from './pages/AdminPage';
import { CertificatePage } from './pages/CertificatePage';
import { PlayerPage } from './pages/PlayerPage';
import { GameProvider } from './providers/GameProvider';

function Gate({ children }: { children: ReactNode }) {
  const { status, error, online } = useGameState();
  if (status === 'error') {
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center gap-3 bg-indigo-950 p-6 text-center text-white">
        <div className="text-6xl">😵</div>
        <p className="text-2xl font-black">出了一點問題</p>
        <p className="max-w-md text-base text-white/70">{error}</p>
        <button type="button" onClick={() => location.reload()} className="mt-2 min-h-[64px] rounded-2xl bg-white px-6 text-lg font-black text-indigo-950">
          重新整理
        </button>
      </div>
    );
  }
  if (status === 'needs-login') return <LoginGate />;
  if (status === 'loading') {
    return (
      <div className="kid-theme sky-bg flex min-h-dvh flex-col items-center justify-center gap-4 text-ink">
        <div className="toon flex h-32 w-32 items-center justify-center rounded-full bg-white">
          <div className="animate-bounce text-7xl">🏸</div>
        </div>
        <p className="toon-sm rounded-full bg-white px-5 py-1 text-2xl">冒險準備中…</p>
        {!online && <p className="text-lg text-slate-600">跟教練的連線斷掉了，等一下喔</p>}
      </div>
    );
  }
  return (
    <>
      {!online && (
        <div className="fixed inset-x-0 top-0 z-[70] bg-amber-400 px-4 pb-1 pt-[max(0.25rem,env(safe-area-inset-top))] text-center text-base font-black text-amber-950">
          📡 跟教練的連線斷掉了，等一下喔（還是可以繼續玩）
        </div>
      )}
      {children}
    </>
  );
}

export default function App() {
  return (
    // ★ 必須是 HashRouter：GitHub Pages 重新整理 /admin 才不會 404（spec §2.2 ①）
    <HashRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <GameProvider>
        <Gate>
          <Routes>
            <Route path="/" element={<PlayerPage />} />
            <Route
              path="/admin"
              element={
                <PinGate>
                  <AdminPage />
                </PinGate>
              }
            />
            <Route path="/certificate" element={<CertificatePage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Gate>
        {import.meta.env.DEV && <DevCounter />}
      </GameProvider>
    </HashRouter>
  );
}
