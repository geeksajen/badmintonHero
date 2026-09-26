import { useMemo } from 'react';
import { findStuck, nodeRecords } from '../../engine/fieldNotes';
import { useReadyGame } from '../../hooks/useGameState';

/** 卡關節點：只用已監聽的進度文件計算（0 額外讀取） */
export function useStuckNodes() {
  const { curriculum, progress, player } = useReadyGame();
  return useMemo(
    () => (player.graduatedAt ? [] : findStuck(nodeRecords(curriculum, progress, player))),
    [curriculum, progress, player],
  );
}
