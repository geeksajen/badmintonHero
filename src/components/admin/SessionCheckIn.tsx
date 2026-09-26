import { useState } from 'react';
import { toDateStr } from '../../engine/util';
import { useGameActions } from '../../hooks/useGameActions';
import { useReadyGame } from '../../hooks/useGameState';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { useRun } from './useRun';

/** 今日練習（置頂）：簽到、本次小計、今日一句話 */
export function SessionCheckIn() {
  const { player, curriculum } = useReadyGame();
  const actions = useGameActions();
  const { busy, run } = useRun();
  const [note, setNote] = useState('');
  const s = player.activeSession;
  const active = s && s.date === toDateStr(new Date());

  return (
    <Card id="today" title="今日練習" icon="🏸">
      {!active ? (
        <>
          <p className="mb-3 text-lg text-slate-600">
            抵達球場後按一下：出席即得 +{curriculum.attendanceExp} EXP / +{curriculum.attendanceCoins} 金幣。
          </p>
          <Button
            size="lg"
            variant="success"
            block
            disabled={busy || !!player.graduatedAt}
            onClick={() => run(() => actions.checkIn(), `第 ${player.sessionCount + 1} 次練習開始！`)}
          >
            ▶️ 開始今天的練習
          </Button>
        </>
      ) : (
        <>
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2 rounded-2xl bg-emerald-50 px-4 py-3">
            <span className="text-lg font-black text-emerald-800">第 {player.sessionCount} 次練習進行中</span>
            <span className="text-lg font-bold text-emerald-900">
              本次已發 ✨{s.expGiven} EXP・🪙{s.coinsGiven}
            </span>
          </div>
          {s.coachNote && <p className="mb-2 text-base text-slate-500">今日一句話：「{s.coachNote}」</p>}
          <div className="flex gap-2">
            <input
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="今日一句話（會出現在小孩畫面）"
              className="min-h-[64px] min-w-0 flex-1 rounded-2xl border-2 border-slate-200 px-4 text-lg"
            />
            <Button
              disabled={busy || !note.trim()}
              onClick={async () => {
                if (await run(() => actions.sendCoachNote({ text: note }), '已送出')) setNote('');
              }}
            >
              送出
            </Button>
          </div>
          <button
            type="button"
            onClick={() => document.getElementById('notes')?.scrollIntoView({ behavior: 'smooth' })}
            className="mt-2 min-h-[48px] text-base font-bold text-violet-700 underline"
          >
            📝 {s.teachNote ? '修改' : '寫'}今天的教學筆記（只有家長看得到）
          </button>
        </>
      )}
    </Card>
  );
}
