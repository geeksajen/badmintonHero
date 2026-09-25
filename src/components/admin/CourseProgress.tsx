import { useState } from 'react';
import { currentChapter, expectedChapter, tallyChapter } from '../../engine/stats';
import { courseWeek } from '../../engine/util';
import { useGameActions } from '../../hooks/useGameActions';
import { useReadyGame } from '../../hooks/useGameState';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { ConfirmDialog } from '../ui/Modal';
import { useToast } from '../ui/toastContext';
import { useRun } from './useRun';

/** 課程進度儀表 ＋【重新結算】（spec §7.2 / §12.5） */
export function CourseProgress() {
  const { player, progress, curriculum } = useReadyGame();
  const actions = useGameActions();
  const { busy, run } = useRun();
  const toast = useToast();
  const [confirm, setConfirm] = useState(false);
  const now = new Date();
  const week = courseWeek(player.courseStartDate, now);
  const expected = expectedChapter(curriculum, player.courseStartDate, now);
  const actual = currentChapter(curriculum, progress);
  const behind = !player.graduatedAt && actual < expected;

  return (
    <Card id="course" title="課程進度" icon="📈">
      <div className="grid grid-cols-2 gap-2 text-center">
        <div className="rounded-2xl bg-slate-50 p-3">
          <div className="text-sm font-bold text-slate-500">課程週次</div>
          <div className="text-3xl font-black">
            {Math.min(week, curriculum.courseWeeks)} <span className="text-lg text-slate-400">/ {curriculum.courseWeeks} 週</span>
          </div>
        </div>
        <div className="rounded-2xl bg-slate-50 p-3">
          <div className="text-sm font-bold text-slate-500">出席</div>
          <div className="text-3xl font-black">
            {player.sessionCount} <span className="text-lg text-slate-400">/ {curriculum.plannedSessions} 次</span>
          </div>
        </div>
      </div>

      {behind && (
        <div className="mt-3 rounded-2xl bg-amber-100 px-4 py-3 text-base font-bold text-amber-900">
          ⚠️ 依節奏表，第 {week} 週應在第 {expected} 章，目前在第 {actual} 章。
          考慮下調卡關節點的銅牌門檻，或在該章追加支線（spec §12.4）。
        </div>
      )}

      <ul className="mt-3 space-y-1">
        {curriculum.chapters.map((ch) => {
          const t = tallyChapter(curriculum, ch.id, progress);
          const active = curriculum.quests.filter((q) => q.chapterId === ch.id && !q.isRetired).length;
          return (
            <li key={ch.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl px-2 py-1.5 odd:bg-slate-50">
              <span className="text-lg font-bold">
                {ch.icon} {ch.name}
                <span className="ml-1 text-sm text-slate-400">第 {ch.planWeeks[0]}–{ch.planWeeks[1]} 週</span>
              </span>
              <span className="text-base font-bold tabular-nums">
                <span className="mr-3">⭐ {t.completed}/{active}</span>🥇{t.gold} 🥈{t.silver} 🥉{t.bronze}
              </span>
            </li>
          );
        })}
      </ul>

      <div className="mt-4 rounded-2xl border-2 border-dashed border-slate-200 p-3">
        <div className="text-base text-slate-600">
          課程包 <code className="font-bold">{curriculum.id}</code>・關卡表 v{curriculum.version}・已套用 v{player.curriculumVersion}
        </div>
        <p className="mt-1 text-sm text-slate-500">
          改完關卡表重新部署後，App 會自動結算一次；也可以手動按下面按鈕，補發因門檻調整而應得的獎勵（不會重複發放）。
        </p>
        <Button className="mt-2" variant="secondary" block disabled={busy} onClick={() => setConfirm(true)}>
          🔄 重新結算
        </Button>
      </div>
      <ConfirmDialog
        open={confirm}
        title="重新結算？"
        message="依目前的關卡表檢查所有節點，補發應得但還沒發的獎牌與解鎖。已發放的獎勵不會被收回。"
        confirmText="開始結算"
        busy={busy}
        onConfirm={async () => {
          await run(async () => {
            const r = await actions.reconcile();
            toast(r.playerChanged || r.progressChanged ? '結算完成，已補發 🎁' : '一切都是最新的，沒有需要補發的項目', 'info');
          });
          setConfirm(false);
        }}
        onCancel={() => setConfirm(false)}
      />
    </Card>
  );
}
