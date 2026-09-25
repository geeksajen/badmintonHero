import { useState } from 'react';
import { Link } from 'react-router-dom';
import { checkGraduation } from '../../engine/graduation';
import { useGameActions } from '../../hooks/useGameActions';
import { useReadyGame } from '../../hooks/useGameState';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { ConfirmDialog } from '../ui/Modal';
import { useRun } from './useRun';

/** 危險操作區（全部需二次確認）：畢業典禮、手動調整、重置進度 */
export function DangerZone() {
  const { player, progress, curriculum } = useReadyGame();
  const actions = useGameActions();
  const { busy, run } = useRun();
  const grad = checkGraduation(player, progress, curriculum, new Date());

  const [gradOpen, setGradOpen] = useState(false);
  const [words, setWords] = useState('');
  const [resetOpen, setResetOpen] = useState(false);
  const [resetText, setResetText] = useState('');
  const [adjOpen, setAdjOpen] = useState(false);
  const [adj, setAdj] = useState({ coinsDelta: '', expDelta: '', setLevel: '', name: player.name, avatar: player.avatar, courseStartDate: player.courseStartDate });

  return (
    <Card id="danger" title="危險操作區" icon="⚠️" className="border-4 border-rose-200">
      {/* 畢業 */}
      <div className="rounded-2xl bg-violet-50 p-3">
        <div className="text-lg font-black">🎓 畢業典禮</div>
        {player.graduatedAt ? (
          <p className="text-base text-slate-600">
            已於 {new Date(player.graduatedAt).toLocaleDateString()} 畢業。<Link to="/certificate" className="font-bold text-violet-700 underline">查看畢業證書</Link>
          </p>
        ) : (
          <p className="text-base text-slate-600">
            條件（任一）：完成 {curriculum.finalQuestId} 銅牌 {grad.byFinalQuest ? '✅' : '❌'} ／ 或 ／ 滿 {curriculum.courseWeeks} 週 {grad.byWeeks ? '✅' : `❌（已 ${grad.weeksElapsed} 週）`}
          </p>
        )}
        {grad.eligible && (
          <Button className="mt-2" variant="gold" size="lg" block onClick={() => setGradOpen(true)}>
            🎓 舉行畢業典禮
          </Button>
        )}
      </div>

      {/* 手動調整 */}
      <Button className="mt-3" variant="secondary" block onClick={() => setAdjOpen(true)}>
        🛠️ 手動調整（金幣／等級／名字／課程開始日）
      </Button>

      {/* 重置 */}
      <Button className="mt-3" variant="danger" block onClick={() => setResetOpen(true)}>
        🗑️ 重置全部進度
      </Button>

      <ConfirmDialog
        open={gradOpen}
        title="舉行畢業典禮？"
        message="小孩的畫面會播放全螢幕典禮，授予「羽球勇者」稱號與勇者之拍，地圖進入回顧模式。"
        confirmText="開始典禮"
        busy={busy}
        onConfirm={async () => {
          if (await run(() => actions.graduate({ finalWords: words }), '畢業典禮開始！🎓')) setGradOpen(false);
        }}
        onCancel={() => setGradOpen(false)}
      >
        <textarea
          value={words}
          onChange={(e) => setWords(e.target.value)}
          placeholder="教練的最後一段話（會印在畢業證書上）"
          rows={4}
          className="mb-2 w-full rounded-2xl border-2 border-slate-200 p-3 text-lg"
        />
      </ConfirmDialog>

      <ConfirmDialog
        open={resetOpen}
        title="重置全部進度？"
        message="等級、金幣、裝備、關卡進度全部歸零（日誌保留）。這個動作無法復原。請輸入「重置」確認。"
        confirmText="重置"
        danger
        busy={busy || resetText !== '重置'}
        onConfirm={async () => {
          if (await run(() => actions.resetProgress(), '已重置')) {
            setResetOpen(false);
            setResetText('');
          }
        }}
        onCancel={() => setResetOpen(false)}
      >
        <input
          value={resetText}
          onChange={(e) => setResetText(e.target.value)}
          placeholder="重置"
          className="mb-2 min-h-[64px] w-full rounded-2xl border-2 border-rose-200 px-4 text-xl"
        />
      </ConfirmDialog>

      <ConfirmDialog
        open={adjOpen}
        title="手動調整"
        confirmText="套用"
        busy={busy}
        onConfirm={async () => {
          const ok = await run(
            () =>
              actions.adminAdjust({
                coinsDelta: Number(adj.coinsDelta) || undefined,
                expDelta: Number(adj.expDelta) || undefined,
                setLevel: adj.setLevel ? Number(adj.setLevel) : undefined,
                name: adj.name !== player.name ? adj.name : undefined,
                avatar: adj.avatar !== player.avatar ? adj.avatar : undefined,
                courseStartDate: adj.courseStartDate !== player.courseStartDate ? adj.courseStartDate : undefined,
              }),
            '已調整',
          );
          if (ok) {
            setAdjOpen(false);
            setAdj((a) => ({ ...a, coinsDelta: '', expDelta: '', setLevel: '' }));
          }
        }}
        onCancel={() => setAdjOpen(false)}
      >
        <div className="mb-2 grid grid-cols-2 gap-2 text-base">
          {(
            [
              ['name', '名字', 'text'],
              ['avatar', '頭像 emoji', 'text'],
              ['coinsDelta', `金幣 ± (目前 ${player.coins})`, 'number'],
              ['expDelta', '追加 EXP', 'number'],
              ['setLevel', `設定等級 (目前 ${player.level})`, 'number'],
              ['courseStartDate', '課程開始日', 'date'],
            ] as const
          ).map(([key, label, type]) => (
            <label key={key} className="flex flex-col gap-1 font-bold text-slate-600">
              {label}
              <input
                type={type}
                value={adj[key]}
                onChange={(e) => setAdj((a) => ({ ...a, [key]: e.target.value }))}
                className="min-h-[56px] rounded-xl border-2 border-slate-200 px-3 text-lg font-normal text-slate-800"
              />
            </label>
          ))}
        </div>
      </ConfirmDialog>
    </Card>
  );
}
