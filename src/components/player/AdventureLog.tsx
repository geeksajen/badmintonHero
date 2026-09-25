import { RefreshCw } from 'lucide-react';
import { useReadyGame } from '../../hooks/useGameState';
import { useHistory } from '../../hooks/useHistory';
import { formatTime, LOG_ICON } from '../../lib/format';

/** 冒險日誌：getDocs limit(20) ＋ 1 小時快取，不監聽（spec §2.2 ③-4） */
export function AdventureLog() {
  const { player } = useReadyGame();
  const { data, loading, error, refresh } = useHistory('logs', player.logsRev ?? 0);
  const visible = data.filter((l) => l.type !== 'admin_adjust');

  return (
    <div className="mx-auto max-w-3xl px-4 py-6">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-3xl font-black text-white">📜 冒險日誌</h2>
        <button
          type="button"
          onClick={refresh}
          aria-label="重新整理"
          className="flex h-16 w-16 items-center justify-center rounded-2xl bg-white/10 text-white hover:bg-white/20"
        >
          <RefreshCw size={28} className={loading ? 'animate-spin' : ''} />
        </button>
      </div>
      {error && <p className="mb-3 rounded-2xl bg-rose-100 px-4 py-3 text-lg text-rose-700">{error}</p>}
      {!loading && visible.length === 0 && (
        <p className="rounded-3xl bg-white/10 px-4 py-10 text-center text-xl text-white/80">冒險還沒開始，第一次練習就會出現在這裡喔！</p>
      )}
      <ol className="relative space-y-3 border-l-4 border-white/20 pl-5">
        {visible.map((l) => (
          <li key={l.id} className="relative rounded-2xl bg-white p-4 text-slate-800 shadow">
            <span className="absolute -left-[2.35rem] top-4 flex h-10 w-10 items-center justify-center rounded-full bg-indigo-100 text-xl ring-4 ring-indigo-950">
              {LOG_ICON[l.type]}
            </span>
            <div className="text-sm font-bold text-slate-400">{formatTime(l.createdAt)}</div>
            <div className="text-lg font-bold leading-snug">{l.message}</div>
            {l.coachFeedback && (
              <div className="mt-2 rounded-xl bg-violet-50 px-3 py-2 text-lg text-violet-900">🗣️ {l.coachFeedback}</div>
            )}
          </li>
        ))}
      </ol>
      {visible.length > 0 && <p className="mt-4 text-center text-sm text-white/50">顯示最近 20 筆</p>}
    </div>
  );
}
