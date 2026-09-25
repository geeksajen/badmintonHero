import { visibleNodes } from '../../engine/unlock';
import { progOf, useReadyGame } from '../../hooks/useGameState';

/** 待審中的節點（小孩按了【我做到了！】） */
export function usePendingNodes() {
  const { curriculum, progress } = useReadyGame();
  return visibleNodes(curriculum.quests).filter((n) => !!progOf(progress, n.id).submittedAt);
}
