import type { GameStore } from './types';

export type { GameStore, AuthUser, GameAction, Unsubscribe } from './types';

/** 'local'（預設，開發用）或 'firebase'（正式） */
export const STORE_MODE: 'local' | 'firebase' =
  import.meta.env.VITE_STORE_MODE === 'firebase' ? 'firebase' : 'local';

export const PLAYER_ID: string = (import.meta.env.VITE_PLAYER_ID as string | undefined) || 'hero';

let storePromise: Promise<GameStore> | null = null;

/** 依 VITE_STORE_MODE 選擇 adapter。Firebase SDK 以動態 import 載入，Local Mode 不打包它。 */
export function getStore(): Promise<GameStore> {
  if (!storePromise) {
    storePromise =
      STORE_MODE === 'firebase'
        ? import('./firebaseAdapter').then((m) => m.firebaseAdapter)
        : import('./localAdapter').then((m) => m.localAdapter);
  }
  return storePromise;
}
