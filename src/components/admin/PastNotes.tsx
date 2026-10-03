import { useMemo, useState } from 'react';
import { stampDays } from '../../engine/calendar';
import { TIER_EMOJI } from '../../engine/tiers';
import { useGameActions } from '../../hooks/useGameActions';
import { useReadyGame } from '../../hooks/useGameState';
import { useHistory } from '../../hooks/useHistory';
import type { PracticeSession } from '../../types';
import { Button } from '../ui/Button';
import { useToast } from '../ui/toastContext';

/**
 * 過去的教學筆記（唯讀）：由新到舊列出每次練習的筆記、今日一句話與當天拿到的獎牌。
 * 預設用最近 20 筆（與日誌相同的 getDocs ＋ 1 小時快取）；按「載入更早的紀錄」才讀全部一次。
 */
export function PastNotes() {
  const { curriculum, progress, player } = useReadyGame();
  const actions = useGameActions();
  const toast = useToast();
  const recent = useHistory('sessions', player.sessionsRev ?? 0);
  const [all, setAll] = useState<PracticeSession[] | null>(null);
  const [loadingAll, setLoadingAll] = useState(false);
  const [onlyWithNotes, setOnlyWithNotes] = useState(false);

  const sessions = all ?? recent.data;
  const days = useMemo(() => stampDays(curriculum, progress, player, sessions), [curriculum, progress, player, sessions]);
  const rows = [...days.values()]
    .sort((a, b) => b.date.localeCompare(a.date))
    .map((d) => ({ day: d, session: sessions.find((s) => s.date === d.date) }))
    .filter((r) => !onlyWithNotes || r.session?.teachNote);
  const hasOlder = !all && recent.data.length < player.sessionCount;

  const loadAll = async () => {
    setLoadingAll(true);
    try {
      setAll(await actions.fetchAllSessions());
    } catch (e) {
      toast((e as Error).message || '讀取失敗', 'error');
    } finally {
      setLoadingAll(false);
    }
  };

  return (
    <div className="mt-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-lg font-black">📚 過去的筆記</h3>
        <label className="flex min-h-[48px] items-center gap-2 text-base font-bold text-slate-600">
          <input type="checkbox" className="h-6 w-6" checked={onlyWithNotes} onChange={(e) => setOnlyWithNotes(e.target.checked)} />
          只看有筆記的
        </label>
      </div>

      {recent.loading && !all ? (
        <p className="text-base text-slate-500">讀取中…</p>
      ) : rows.length === 0 ? (
        <p className="text-base text-slate-500">{onlyWithNotes ? '還沒有寫過教學筆記。' : '還沒有練習紀錄。'}</p>
      ) : (
        <ul className="mt-1 max-h-[32rem] space-y-2 overflow-y-auto pr-1">
          {rows.map(({ day, session }) => (
            <li key={day.date} className="rounded-2xl bg-slate-50 px-4 py-3">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <span className="text-base font-black">
                  第 {day.number} 次・{day.date}
                </span>
                {day.medals.length > 0 && (
                  <span className="text-sm text-slate-500">
                    {day.medals.map((m) => `${TIER_EMOJI[m.tier]}${m.title}`).join('、')}
                  </span>
                )}
              </div>
              {session?.teachNote ? (
                <p className="mt-1 whitespace-pre-line text-lg text-slate-800">📝 {session.teachNote}</p>
              ) : (
                <p className="mt-1 text-base text-slate-400">（沒有教學筆記）</p>
              )}
              {session?.coachNote && <p className="mt-1 text-base text-violet-800">🗣️ 今日一句話：{session.coachNote}</p>}
            </li>
          ))}
        </ul>
      )}

      {hasOlder && (
        <Button className="mt-2" variant="secondary" size="sm" block disabled={loadingAll} onClick={() => void loadAll()}>
          載入更早的紀錄（約 {player.sessionCount} 次讀取）
        </Button>
      )}
    </div>
  );
}
