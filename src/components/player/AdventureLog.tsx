import { RefreshCw } from 'lucide-react';
import { useReadyGame } from '../../hooks/useGameState';
import { useHistory } from '../../hooks/useHistory';
import { formatTime, LOG_ICON } from '../../lib/format';
import type { ActivityType } from '../../types';

/** 依事件類型給日誌泡泡不同的糖果色（純外觀） */
function bubbleColor(type: ActivityType): string {
  switch (type) {
    case 'level_up':
    case 'graduated':
      return 'bg-lime-200';
    case 'tier_reached':
    case 'attendance_milestone':
      return 'bg-yellow-200';
    case 'equipment_unlocked':
    case 'title_unlocked':
      return 'bg-sky-200';
    case 'reward_requested':
    case 'reward_fulfilled':
    case 'reward_cancelled':
      return 'bg-orange-200';
    case 'coach_note':
    case 'quest_retry':
      return 'bg-violet-200';
    case 'curriculum_updated':
      return 'bg-teal-200';
    default:
      return 'bg-pink-200';
  }
}

/** 冒險日誌：getDocs limit(20) ＋ 1 小時快取，不監聽（spec §2.2 ③-4） */
export function AdventureLog() {
  const { player } = useReadyGame();
  const { data, loading, error, refresh } = useHistory('logs', player.logsRev ?? 0);
  const visible = data.filter((l) => l.type !== 'admin_adjust');

  return (
    <div className="mx-auto max-w-3xl px-4 py-6">
      <div className="toon mb-5 flex items-center justify-between rounded-3xl bg-gradient-to-r from-pink-300 via-rose-300 to-orange-200 py-2 pl-5 pr-2 text-ink">
        <h2 className="flex items-center gap-2 text-3xl">
          <span className="animate-wiggle">📜</span> 冒險日誌
        </h2>
        <button
          type="button"
          onClick={refresh}
          aria-label="重新整理"
          className="toon-sm toon-press flex h-16 w-16 items-center justify-center rounded-2xl bg-white text-ink"
        >
          <RefreshCw size={28} strokeWidth={2.5} className={loading ? 'animate-spin' : ''} />
        </button>
      </div>
      {error && <p className="mb-3 rounded-2xl bg-rose-100 px-4 py-3 text-lg text-rose-700">{error}</p>}
      {!loading && visible.length === 0 && (
        <div className="toon rounded-3xl bg-white px-4 py-10 text-center text-xl text-slate-600">
          <div className="mb-2 animate-float text-6xl">🗺️</div>
          冒險還沒開始，第一次練習就會出現在這裡喔！
        </div>
      )}
      <ol className="relative space-y-4 pl-8">
        {/* 虛線小路 */}
        <span aria-hidden className="absolute bottom-2 left-[1.05rem] top-2 border-l-4 border-dashed border-white/80" />
        {visible.map((l) => (
          <li key={l.id} className={`toon relative rounded-3xl p-4 text-ink ${bubbleColor(l.type)}`}>
            <span className="toon-sm absolute -left-[3.1rem] top-3 flex h-12 w-12 items-center justify-center rounded-full bg-white text-2xl">
              {LOG_ICON[l.type]}
            </span>
            <div className="text-sm text-slate-600">{formatTime(l.createdAt)}</div>
            <div className="text-lg leading-snug">{l.message}</div>
            {l.coachFeedback && (
              <div className="mt-2 rounded-2xl bg-white/80 px-3 py-2 text-lg text-violet-900">🗣️ {l.coachFeedback}</div>
            )}
          </li>
        ))}
      </ol>
      {visible.length > 0 && <p className="mt-4 text-center text-sm text-slate-600">顯示最近 20 筆</p>}
    </div>
  );
}
