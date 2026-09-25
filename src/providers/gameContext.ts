import { createContext } from 'react';
import type { AuthUser, GameStore } from '../store';
import type { Curriculum, Player, QuestProgressDoc } from '../types';

export type GameStatus = 'loading' | 'needs-login' | 'ready' | 'error';

export interface GameContextValue {
  status: GameStatus;
  error: string | null;
  store: GameStore | null;
  playerId: string;
  user: AuthUser | null;
  player: Player | null;
  progress: QuestProgressDoc | null;
  curriculum: Curriculum;
  online: boolean;
}

export const GameContext = createContext<GameContextValue | null>(null);
