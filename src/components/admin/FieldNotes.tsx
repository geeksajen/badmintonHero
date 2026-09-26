import { useMemo, useState } from 'react';
import { TEACH_NOTE_MAX_LENGTH } from '../../engine/actions';
import { chapterPace, fieldNotesMarkdown, nodeRecords } from '../../engine/fieldNotes';
import { toDateStr } from '../../engine/util';
import { useGameActions } from '../../hooks/useGameActions';
import { useReadyGame } from '../../hooks/useGameState';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { useToast } from '../ui/toastContext';
import { useRun } from './useRun';
import { useStuckNodes } from './useStuckNodes';

/**
 * 實戰筆記（spec §12.7 / Step 8）：
 * 教學筆記一行、卡關提醒、各章節奏，以及一鍵匯出成 NOTES.md 格式。
 * 畫面上的統計只用已監聽的進度文件（0 額外讀取）；匯出時才讀一次全部練習紀錄。
 */
export function FieldNotes() {
  const { curriculum, progress, player } = useReadyGame();
  const actions = useGameActions();
  const { busy, run } = useRun();
  const toast = useToast();
  const s = player.activeSession;
  const [draft, setDraft] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);

  const records = useMemo(() => nodeRecords(curriculum, progress, player), [curriculum, progress, player]);
  const pace = useMemo(() => chapterPace(curriculum, records, player), [curriculum, records, player]);
  const stuck = useStuckNodes();
  const reachedPace = pace.filter((p) => p.actual !== undefined);

  const text = draft ?? s?.teachNote ?? '';
  const dirty = draft !== null && draft.trim() !== (s?.teachNote ?? '');

  const build = async () => {
    setExporting(true);
    try {
      const sessions = await actions.fetchAllSessions();
      return fieldNotesMarkdown(curriculum, progress, player, sessions, new Date());
    } finally {
      setExporting(false);
    }
  };

  const copy = async () => {
    try {
      const md = await build();
      setPreview(md);
      try {
        await navigator.clipboard.writeText(md);
        toast('已複製，貼進 NOTES.md 就好 📋');
      } catch {
        toast('無法自動複製，請從下方預覽手動全選複製', 'info');
      }
    } catch (e) {
      toast((e as Error).message || '匯出失敗', 'error');
    }
  };

  const download = async () => {
    try {
      const md = await build();
      setPreview(md);
      const name = `${curriculum.id}-notes-${toDateStr(new Date())}.md`;
      const file = new File([md], name, { type: 'text/markdown' });
      // iPhone／iPad：用分享面板（可存到檔案或傳給自己）；其他裝置直接下載
      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], title: name });
        return;
      }
      const url = URL.createObjectURL(file);
      const a = document.createElement('a');
      a.href = url;
      a.download = name;
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 10_000);
    } catch (e) {
      if ((e as Error).name !== 'AbortError') toast((e as Error).message || '匯出失敗', 'error');
    }
  };

  return (
    <Card id="notes" title="實戰筆記" icon="📝">
      {/* 教學筆記：寫在最近一次練習上 */}
      {s ? (
        <div className="rounded-2xl bg-slate-50 p-3">
          <label htmlFor="teach-note" className="block text-base font-bold text-slate-600">
            第 {s.sessionNumber ?? player.sessionCount} 次練習（{s.date}）的教學筆記
            <span className="ml-1 text-sm font-normal text-slate-400">只有家長看得到</span>
          </label>
          <textarea
            id="teach-note"
            value={text}
            maxLength={TEACH_NOTE_MAX_LENGTH}
            onChange={(e) => setDraft(e.target.value)}
            rows={3}
            placeholder="例：反手握拍還會滑掉；拋球太高她接不到，改低一點就好了"
            className="mt-2 w-full rounded-2xl border-2 border-slate-200 px-4 py-3 text-lg"
          />
          <Button
            className="mt-2"
            block
            disabled={busy || !dirty}
            onClick={async () => {
              if (await run(() => actions.saveTeachNote({ text }), '筆記已儲存')) setDraft(null);
            }}
          >
            儲存筆記
          </Button>
        </div>
      ) : (
        <p className="text-lg text-slate-500">第一次練習簽到後就可以寫教學筆記。</p>
      )}

      {/* 卡關提醒 */}
      <h3 className="mt-4 text-lg font-black">🚧 卡關提醒</h3>
      {stuck.length === 0 ? (
        <p className="text-base text-slate-500">目前沒有卡關的節點（練了預估次數的兩倍、至少 3 次還沒拿到銅牌才會出現）。</p>
      ) : (
        <ul className="mt-1 space-y-2">
          {stuck.map((x) => (
            <li key={x.record.node.id} className="rounded-2xl bg-amber-100 px-4 py-3 text-amber-950">
              <div className="text-lg font-black">
                {x.record.node.title}
                <span className="ml-2 text-base font-bold">已練 {x.sessions} 次（預估 {x.record.node.estimatedSessions} 次）</span>
              </div>
              <div className="text-base">{x.suggestion}</div>
            </li>
          ))}
        </ul>
      )}

      {/* 各章節奏 */}
      {reachedPace.length > 0 && (
        <>
          <h3 className="mt-4 text-lg font-black">⏱️ 各章實際 vs 規劃（練習次數）</h3>
          <ul className="mt-1 space-y-1">
            {reachedPace.map((p) => {
              const over = p.actual! > p.planned;
              return (
                <li key={p.chapterId} className="flex items-center justify-between gap-2 rounded-xl px-2 py-1.5 odd:bg-slate-50">
                  <span className="text-lg font-bold">
                    {p.icon} {p.name}
                  </span>
                  <span className={`text-base font-bold tabular-nums ${over ? 'text-amber-700' : 'text-slate-700'}`}>
                    {p.done ? '' : '進行中 '}
                    {p.actual} 次 <span className="text-slate-400">／ 規劃 {p.planned}</span>
                  </span>
                </li>
              );
            })}
          </ul>
        </>
      )}

      {/* 匯出 */}
      <div className="mt-4 rounded-2xl border-2 border-dashed border-slate-200 p-3">
        <p className="text-base text-slate-600">
          匯出成 <code className="font-bold">NOTES.md</code> 的格式：每次練習拿到的獎牌、教學筆記、各章節奏、各關花了幾次練習、卡關點。
          <span className="text-sm text-slate-400">（會讀取一次全部練習紀錄，約 1 次練習 1 次讀取）</span>
        </p>
        <div className="mt-2 grid grid-cols-2 gap-2">
          <Button variant="secondary" disabled={exporting} onClick={() => void copy()}>
            📋 複製
          </Button>
          <Button variant="secondary" disabled={exporting} onClick={() => void download()}>
            📤 下載／分享
          </Button>
        </div>
        {preview && (
          <textarea
            readOnly
            value={preview}
            rows={10}
            onFocus={(e) => e.currentTarget.select()}
            className="mt-2 w-full rounded-2xl border-2 border-slate-200 px-3 py-2 font-mono text-sm"
          />
        )}
      </div>
    </Card>
  );
}
