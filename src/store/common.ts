import type { ActionResult, Ctx } from '../engine/actions';
import { newId } from '../engine/util';
import { getCurriculum } from '../data';
import type { Player } from '../types';
import { cacheKey, upsertCache } from './cache';

export const HISTORY_LIMIT = 20; // spec §2.2 ③-4：每次 getDocs 一律 limit(20)
export const MAX_SESSION_PAGES = 10; // fetchAllSessions 的上限：200 筆，遠超過 6 個月的 ~52 次

export function makeCtx(player: Player | null, curriculumId?: string): Ctx {
  return { now: new Date(), newId, curriculum: getCurriculum(player?.curriculumId ?? curriculumId) };
}

/** 自己寫入後，把新資料就地放進快取（spec：手動 unshift，而非重新抓取） */
export function applyResultToCaches(playerId: string, r: ActionResult): void {
  if (r.logs.length) {
    upsertCache(cacheKey(playerId, 'logs'), [...r.logs].reverse(), r.player.logsRev, HISTORY_LIMIT);
  }
  if (r.orders?.length) upsertCache(cacheKey(playerId, 'orders'), r.orders, r.player.ordersRev, 50);
  if (r.session) upsertCache(cacheKey(playerId, 'sessions'), [r.session], r.player.sessionsRev, HISTORY_LIMIT);
}

/** 寫入次數（給計數器） */
export function writeCountOf(r: ActionResult): number {
  return (
    (r.playerChanged ? 1 : 0) +
    (r.progressChanged ? 1 : 0) +
    r.logs.length +
    (r.session ? 1 : 0) +
    (r.orders?.length ?? 0)
  );
}
