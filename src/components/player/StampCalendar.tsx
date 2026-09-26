import { motion } from 'framer-motion';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { addMonths, monthCells, monthOf, stampDays, type StampDay, type StampKind } from '../../engine/calendar';
import { TIER_EMOJI, TIER_LABEL } from '../../engine/tiers';
import { toDateStr } from '../../engine/util';
import { useGameActions } from '../../hooks/useGameActions';
import { useReadyGame } from '../../hooks/useGameState';
import { useHistory } from '../../hooks/useHistory';
import type { PracticeSession } from '../../types';
import { SpeakButton } from './SpeakButton';

const WEEKDAYS = ['日', '一', '二', '三', '四', '五', '六'];

const STAMP: Record<StampKind, { emoji: string; bg: string; label: string }> = {
  gold: { emoji: '🥇', bg: 'bg-amber-300', label: '金牌章' },
  silver: { emoji: '🥈', bg: 'bg-slate-200', label: '銀牌章' },
  bronze: { emoji: '🥉', bg: 'bg-orange-300', label: '銅牌章' },
  practice: { emoji: '🏸', bg: 'bg-lime-200', label: '練習章' },
};

/** 由日期決定一個固定的小角度，讓章看起來是「蓋上去的」 */
function tilt(date: string): number {
  let h = 0;
  for (const ch of date) h = (h * 31 + ch.charCodeAt(0)) % 997;
  return (h % 17) - 8;
}

/**
 * 更早的練習紀錄（超過最近 20 筆）：只在小孩翻到那個月時讀一次，依 sessionsRev 快取在記憶體。
 * 半年約 52 筆，讀一次約 52 次讀取。
 */
let olderCache: { rev: number; data: PracticeSession[] } | null = null;

/** 蓋章月曆（spec §7.1 冒險日誌分頁上半部） */
export function StampCalendar() {
  const { curriculum, progress, player } = useReadyGame();
  const actions = useGameActions();
  const rev = player.sessionsRev ?? 0;
  const recent = useHistory('sessions', rev);
  const [older, setOlder] = useState<PracticeSession[] | null>(() => (olderCache?.rev === rev ? olderCache.data : null));

  const thisMonth = monthOf(toDateStr(new Date()));
  const firstMonth = monthOf(player.courseStartDate);
  const [month, setMonth] = useState(thisMonth);
  const [selected, setSelected] = useState<string | null>(null);

  // 翻到的月份早於已載入的最舊紀錄，且還有更早的練習 → 載入全部一次
  const oldestLoaded = recent.data.reduce<string | null>((m, s) => (m === null || s.date < m ? s.date : m), null);
  const needOlder =
    !older &&
    !recent.loading &&
    recent.data.length < player.sessionCount &&
    oldestLoaded !== null &&
    month <= monthOf(oldestLoaded);

  useEffect(() => {
    if (!needOlder) return;
    let alive = true;
    actions
      .fetchAllSessions()
      .then((data) => {
        olderCache = { rev, data };
        if (alive) setOlder(data);
      })
      .catch(() => {
        /* 讀不到就只顯示最近的紀錄 */
      });
    return () => {
      alive = false;
    };
  }, [needOlder, actions, rev]);

  const days = useMemo(
    () => stampDays(curriculum, progress, player, older ?? recent.data),
    [curriculum, progress, player, older, recent.data],
  );

  const cells = useMemo(() => {
    const [y, m] = month.split('-').map(Number);
    return monthCells(y, m - 1);
  }, [month]);
  const inMonth = cells.filter((d): d is string => !!d && days.has(d)).map((d) => days.get(d)!);
  const shown: StampDay | undefined = (selected && days.get(selected)) || inMonth[inMonth.length - 1];
  const today = toDateStr(new Date());
  const [y, m] = month.split('-').map(Number);

  const go = (delta: number) => {
    setMonth((cur) => addMonths(cur, delta));
    setSelected(null);
  };

  return (
    <section className="toon mb-6 rounded-3xl bg-white p-3 text-ink sm:p-5">
      <div className="mb-3 flex items-center justify-between gap-2">
        <button
          type="button"
          aria-label="上個月"
          disabled={month <= firstMonth}
          onClick={() => go(-1)}
          className="toon-sm toon-press flex h-16 w-16 items-center justify-center rounded-2xl bg-sky-100 disabled:opacity-30"
        >
          <ChevronLeft size={34} strokeWidth={3} />
        </button>
        <h2 className="flex items-center gap-2 text-2xl sm:text-3xl">
          <span aria-hidden>📅</span> {y} 年 {m} 月
        </h2>
        <button
          type="button"
          aria-label="下個月"
          disabled={month >= thisMonth}
          onClick={() => go(1)}
          className="toon-sm toon-press flex h-16 w-16 items-center justify-center rounded-2xl bg-sky-100 disabled:opacity-30"
        >
          <ChevronRight size={34} strokeWidth={3} />
        </button>
      </div>

      <div className="grid grid-cols-7 gap-1 text-center text-base text-slate-500 sm:gap-2">
        {WEEKDAYS.map((w) => (
          <div key={w}>{w}</div>
        ))}
      </div>
      <div className="mt-1 grid grid-cols-7 gap-1 sm:gap-2">
        {cells.map((date, i) => {
          if (!date) return <div key={`blank-${i}`} />;
          const day = days.get(date);
          const n = Number(date.slice(8));
          if (!day) {
            return (
              <div
                key={date}
                className={`flex aspect-square items-center justify-center rounded-2xl text-lg ${
                  date === today ? 'border-[3px] border-dashed border-sky-400 text-sky-700' : 'text-slate-400'
                }`}
              >
                {n}
              </div>
            );
          }
          const st = STAMP[day.stamp];
          const active = shown?.date === date;
          return (
            <motion.button
              key={date}
              type="button"
              aria-label={`${m} 月 ${n} 日 ${st.label}`}
              whileTap={{ scale: 0.9 }}
              onClick={() => setSelected(date)}
              className={`relative flex aspect-square min-h-[44px] flex-col items-center justify-center rounded-full border-[3px] ${
                active ? 'border-violet-600 ring-4 ring-violet-300' : 'border-ink'
              } ${st.bg}`}
              style={{ rotate: `${tilt(date)}deg` }}
            >
              <span className="text-2xl leading-none sm:text-4xl">{st.emoji}</span>
              <span className="text-xs font-bold leading-none sm:text-sm">{n}</span>
            </motion.button>
          );
        })}
      </div>

      <p className="mt-3 text-center text-xl">
        {inMonth.length > 0 ? `這個月蓋了 ${inMonth.length} 個章！` : '這個月還沒有章，練習一次就能蓋一個喔！'}
      </p>

      {shown && (
        <div className="toon-sm mt-3 rounded-3xl bg-sky-50 px-4 py-3">
          <div className="text-lg text-slate-600">
            {Number(shown.date.slice(5, 7))} 月 {Number(shown.date.slice(8))} 日・第 {shown.number} 次練習
          </div>
          {shown.medals.length > 0 ? (
            <ul className="mt-1 space-y-1">
              {shown.medals.map((md) => (
                <li key={md.nodeId + md.tier} className="text-xl">
                  {TIER_EMOJI[md.tier]} {md.title}
                  <span className="ml-1 text-base text-slate-500">{TIER_LABEL[md.tier]}</span>
                </li>
              ))}
            </ul>
          ) : (
            <div className="mt-1 text-xl">🏸 認真練習的一天！</div>
          )}
          {!!(shown.exp || shown.coins) && (
            <div className="mt-1 flex gap-4 text-lg">
              {!!shown.exp && <span>✨ +{shown.exp} EXP</span>}
              {!!shown.coins && <span>🪙 +{shown.coins}</span>}
            </div>
          )}
          {shown.coachNote && (
            <div className="mt-2 flex items-center gap-2 rounded-2xl bg-violet-100 py-2 pl-3 pr-2 text-lg text-violet-900">
              <p className="flex-1">🗣️ {shown.coachNote}</p>
              <SpeakButton text={`教練說：${shown.coachNote}`} label="念教練的話" />
            </div>
          )}
        </div>
      )}
    </section>
  );
}
