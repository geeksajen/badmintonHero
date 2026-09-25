import { useContext } from 'react';
import { GameContext, type GameContextValue } from '../providers/gameContext';
import type { Player, QuestProgress, QuestProgressDoc } from '../types';
import { emptyProgress } from '../engine/unlock';

export function useGameState(): GameContextValue {
  const ctx = useContext(GameContext);
  if (!ctx) throw new Error('useGameState 必須在 <GameProvider> 內使用');
  return ctx;
}

export type ReadyGame = GameContextValue & { player: Player; progress: QuestProgressDoc };

/** 只在 status === 'ready' 之後渲染的元件使用 */
export function useReadyGame(): ReadyGame {
  const ctx = useGameState();
  if (!ctx.player || !ctx.progress) throw new Error('遊戲資料尚未載入');
  return ctx as ReadyGame;
}

/** 讀取節點進度；新節點尚未 reconcile 時視為 locked */
export function progOf(progress: QuestProgressDoc, nodeId: string): QuestProgress {
  return progress.byNodeId[nodeId] ?? emptyProgress(nodeId);
}
