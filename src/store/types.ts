import type { ActionResult, Ctx, GameState } from '../engine/actions';
import type { ActivityLog, Player, PracticeSession, QuestProgressDoc, RedemptionOrder } from '../types';

export type Unsubscribe = () => void;

export interface AuthUser {
  uid: string;
  email: string | null;
}

/**
 * 一個 action = 純函式（見 src/engine/actions.ts）。
 * adapter 負責「讀出目前狀態 → 呼叫 action → 一次寫回」，Firebase 版在 runTransaction 內完成。
 * input 若含 order，adapter 會在交易內重新讀取該訂單，避免用到另一台裝置已處理過的舊資料。
 */
export type GameAction<I> = (state: GameState, ctx: Ctx, input: I) => ActionResult;

/** UI 只依賴這個介面（spec §2.3）。只有 GameProvider 可以呼叫 subscribe*。 */
export interface GameStore {
  readonly mode: 'local' | 'firebase';

  auth: {
    onChange(cb: (user: AuthUser | null) => void): Unsubscribe;
    signIn(email: string, password: string): Promise<void>;
    signOut(): Promise<void>;
  };

  /** 【監聽 1】players/{id} */
  subscribePlayer(playerId: string, cb: (p: Player | null) => void, onError: (e: Error) => void): Unsubscribe;
  /** 【監聽 2】players/{id}/state/questProgress */
  subscribeProgress(
    playerId: string,
    cb: (d: QuestProgressDoc | null) => void,
    onError: (e: Error) => void,
  ): Unsubscribe;

  /** 文件不存在時建立初始狀態（已存在則什麼都不做） */
  initPlayer(playerId: string): Promise<void>;

  dispatch<I>(playerId: string, action: GameAction<I>, input: I): Promise<ActionResult>;

  /** 小孩 ＋1 的計數：debounce 後只寫一個欄位，不走 transaction（離線也能排隊） */
  saveCount(playerId: string, nodeId: string, count: number): Promise<void>;

  /** 歷史型資料：getDocs ＋ 1 小時快取（rev 不同視為失效），不監聽 */
  fetchLogs(playerId: string, rev: number, force?: boolean): Promise<ActivityLog[]>;
  fetchSessions(playerId: string, rev: number, force?: boolean): Promise<PracticeSession[]>;
  fetchOrders(playerId: string, rev: number, force?: boolean): Promise<RedemptionOrder[]>;

  /**
   * 全部練習紀錄（由舊到新）。只在家長按【匯出實戰筆記】、或小孩把蓋章月曆翻到最近 20 筆以前的月份時呼叫：
   * 每頁仍是 limit(20)，最多 MAX_SESSION_PAGES 頁（半年約 52 筆 ≈ 3 頁 ≈ 52 次讀取）。不快取。
   */
  fetchAllSessions(playerId: string): Promise<PracticeSession[]>;
}
