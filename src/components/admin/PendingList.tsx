import { progOf, useReadyGame } from '../../hooks/useGameState';
import { Card } from '../ui/Card';
import { QuestReviewRow } from './QuestReviewRow';
import { usePendingNodes } from './usePendingNodes';

/** 待審清單：小孩按了【我做到了！】的節點 */
export function PendingList() {
  const { progress } = useReadyGame();
  const pending = usePendingNodes();
  return (
    <Card
      id="pending"
      title="待審清單"
      icon="📝"
      right={
        pending.length > 0 && (
          <span className="flex h-9 min-w-9 items-center justify-center rounded-full bg-rose-500 px-2 text-lg font-black text-white">
            {pending.length}
          </span>
        )
      }
    >
      {pending.length === 0 ? (
        <p className="text-lg text-slate-500">目前沒有待確認的任務。</p>
      ) : (
        <div className="space-y-3">
          {pending.map((n) => (
            <QuestReviewRow key={`${n.id}-${progOf(progress, n.id).submittedAt}`} node={n} prog={progOf(progress, n.id)} mode="pending" />
          ))}
        </div>
      )}
    </Card>
  );
}
