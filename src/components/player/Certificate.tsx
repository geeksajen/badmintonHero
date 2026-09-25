import { tallyAll, tallyChapter } from '../../engine/stats';
import { toDateStr } from '../../engine/util';
import { useReadyGame } from '../../hooks/useGameState';
import { useHistory } from '../../hooks/useHistory';
import { formatTime, LOG_ICON } from '../../lib/format';

const HIGHLIGHT_TYPES = new Set(['title_unlocked', 'equipment_unlocked', 'attendance_milestone', 'level_up', 'graduated', 'tier_reached']);

/** 畢業證書（spec §4.6）：可截圖／列印 */
export function Certificate() {
  const { player, progress, curriculum } = useReadyGame();
  const logs = useHistory('logs', player.logsRev ?? 0);
  const all = tallyAll(curriculum, progress);
  const gradDate = player.graduatedAt ? new Date(player.graduatedAt) : new Date();
  const highlights = logs.data.filter((l) => HIGHLIGHT_TYPES.has(l.type)).slice(0, 10);

  return (
    <article className="certificate mx-auto max-w-3xl rounded-[2rem] border-[10px] border-double border-amber-500 bg-amber-50 p-6 text-slate-800 shadow-2xl sm:p-10">
      <header className="text-center">
        <div className="text-6xl">🏆</div>
        <h1 className="mt-2 font-game text-4xl font-extrabold tracking-wide text-amber-700 sm:text-5xl">畢業證書</h1>
        <p className="font-game text-lg font-bold text-amber-600">Badminton Hero Quest — Certificate of Graduation</p>
      </header>

      <p className="mt-8 text-center text-2xl leading-relaxed">
        茲證明 <b className="mx-1 text-4xl text-violet-700">{player.name}</b>
        <br />
        於 {player.courseStartDate.replace(/-/g, ' / ')} 至 {toDateStr(gradDate).replace(/-/g, ' / ')}
        <br />
        走完五大區域，登上王者之巔，
        <br />
        正式成為 <b className="text-3xl text-fuchsia-700">⚔️ 羽球勇者</b>！
      </p>

      <section className="mt-8 grid grid-cols-2 gap-3 text-center sm:grid-cols-4">
        {[
          ['🏸', '總練習', `${player.sessionCount} 次`],
          ['✨', '總 EXP', player.totalExp.toLocaleString()],
          ['⭐', '最終等級', `Lv.${player.level}`],
          ['🗺️', '完成關卡', `${all.completed} 關`],
        ].map(([icon, label, value]) => (
          <div key={label} className="rounded-2xl bg-white p-3 shadow">
            <div className="text-3xl">{icon}</div>
            <div className="text-sm font-bold text-slate-500">{label}</div>
            <div className="text-2xl font-black">{value}</div>
          </div>
        ))}
      </section>

      <section className="mt-6 rounded-2xl bg-white p-4 text-center shadow">
        <div className="text-lg font-black text-slate-500">獎牌</div>
        <div className="mt-1 flex justify-center gap-6 text-3xl font-black">
          <span>🥇 {all.gold}</span>
          <span>🥈 {all.silver}</span>
          <span>🥉 {all.bronze}</span>
        </div>
      </section>

      <section className="mt-6">
        <div className="mb-2 text-lg font-black text-slate-500">走過的五個區域</div>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-5">
          {curriculum.chapters.map((ch) => {
            const t = tallyChapter(curriculum, ch.id, progress);
            return (
              <div key={ch.id} className={`rounded-2xl bg-gradient-to-br ${ch.theme} p-3 text-center text-white shadow`}>
                <div className="text-3xl">{ch.icon}</div>
                <div className="font-black">{ch.name}</div>
                <div className="text-sm font-bold">
                  🥇{t.gold} 🥈{t.silver} 🥉{t.bronze}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {player.finalCoachWords && (
        <section className="mt-6 rounded-2xl bg-violet-100 p-5 text-xl leading-relaxed text-violet-900">
          <div className="mb-1 text-lg font-black">🗣️ 教練的話</div>
          {player.finalCoachWords}
        </section>
      )}

      {highlights.length > 0 && (
        <section className="mt-6">
          <div className="mb-2 text-lg font-black text-slate-500">冒險日誌摘要</div>
          <ul className="space-y-1 text-base">
            {highlights.map((l) => (
              <li key={l.id} className="flex gap-2">
                <span>{LOG_ICON[l.type]}</span>
                <span className="text-slate-400">{formatTime(l.createdAt)}</span>
                <span className="font-bold">{l.message}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <footer className="mt-10 flex items-end justify-between text-lg">
        <span className="font-bold text-slate-500">{curriculum.name}</span>
        <span className="border-t-2 border-slate-400 px-6 pt-1 font-black">教練簽名</span>
      </footer>
    </article>
  );
}
