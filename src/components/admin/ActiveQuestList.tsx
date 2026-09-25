import { useState } from 'react';
import { visibleNodes } from '../../engine/unlock';
import { progOf, useReadyGame } from '../../hooks/useGameState';
import { Card } from '../ui/Card';
import { QuestReviewRow } from './QuestReviewRow';

/** 當前可挑戰：unlocked ＋ 未滿金牌的 completed（不含待審中）；現場可直接核可、手動輸入次數 */
export function ActiveQuestList() {
  const { curriculum, progress, player } = useReadyGame();
  const [openId, setOpenId] = useState<string | null>(null);
  const [showDone, setShowDone] = useState(false);

  const nodes = visibleNodes(curriculum.quests).filter((n) => {
    const p = progOf(progress, n.id);
    if (p.submittedAt) return false;
    if (p.status === 'unlocked') return true;
    return showDone && p.status === 'completed' && !p.tiersAwarded.includes('gold');
  });

  return (
    <Card
      id="active"
      title="當前可挑戰"
      icon="🎯"
      right={
        <label className="flex min-h-[48px] items-center gap-2 text-base font-bold text-slate-600">
          <input type="checkbox" className="h-6 w-6" checked={showDone} onChange={(e) => setShowDone(e.target.checked)} />
          含未滿金牌
        </label>
      }
    >
      {player.graduatedAt ? (
        <p className="text-lg text-slate-500">已畢業，地圖為回顧模式。</p>
      ) : nodes.length === 0 ? (
        <p className="text-lg text-slate-500">沒有可挑戰的任務。</p>
      ) : (
        <div className="space-y-2">
          {nodes.map((n) => {
            const p = progOf(progress, n.id);
            const open = openId === n.id;
            return (
              <div key={n.id}>
                <button
                  type="button"
                  onClick={() => setOpenId(open ? null : n.id)}
                  className="flex min-h-[64px] w-full items-center justify-between rounded-2xl bg-slate-50 px-4 text-left hover:bg-slate-100"
                >
                  <span className="text-lg font-bold">
                    {curriculum.chapters.find((c) => c.id === n.chapterId)?.icon} {n.title}
                  </span>
                  <span className="text-base text-slate-500">
                    {p.status === 'completed' ? '✅' : '🔵'} 這次 {p.currentCount}・最佳 {p.bestCount}
                  </span>
                </button>
                {open && (
                  <div className="mt-2">
                    <QuestReviewRow node={n} prog={p} mode="active" />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </Card>
  );
}
