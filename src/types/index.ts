// ============================================================================
// Badminton Hero Quest — 全部型別（spec §3）
// 靜態定義（進版控）與動態狀態（存 DB）嚴格分離。
// ============================================================================

// ---------------------------------------------------------------------------
// 3.2 靜態定義
// ---------------------------------------------------------------------------

export type ChapterId = 1 | 2 | 3 | 4 | 5;

export interface Chapter {
  id: ChapterId;
  name: string; // '氣球村'
  nameEn: string; // 'Balloon Village'
  theme: string; // tailwind gradient, e.g. 'from-pink-400 to-rose-500'
  icon: string; // emoji
  description: string;
  planWeeks: [number, number]; // 預計週次區間，e.g. [1, 3]
}

/** 三階達標 */
export type TierLevel = 'bronze' | 'silver' | 'gold';

export interface QuestTiers {
  bronze: number; // 達到即視為「節點完成」，解鎖後續節點
  silver: number;
  gold: number;
}

/** 各階可領取的 EXP／金幣比例（總和為 1） */
export const TIER_RATIO: Record<TierLevel, number> = {
  bronze: 0.5,
  silver: 0.3,
  gold: 0.2,
};

export const TIER_ORDER: TierLevel[] = ['bronze', 'silver', 'gold'];

/**
 * 靜態關卡定義：不含任何玩家狀態。
 * ★ 這份資料預期會在課程進行中被修改，見 spec §12。
 */
export interface QuestNode {
  id: string; // 'q1_1'。★ 永不重用、永不重排，插入用後綴（'q2_3b'）
  chapterId: ChapterId;
  order: number; // ★ 地圖顯示順序，與 id 脫鉤
  title: string;
  description: string; // 給小孩看：口語、短句、正面用詞
  coachNote: string; // 給家長看：教學重點與驗收標準
  tiers: QuestTiers;
  unit: string; // '下' | '球' | '拍' | '組' | '次' | '分'
  isBoss: boolean;
  isRetired?: boolean; // ★ 退役節點：保留資料與已得獎勵，從地圖隱藏
  addedInVersion?: number; // ★ 於哪個 QUEST_DATA_VERSION 加入，用於 NEW 標記
  estimatedSessions: number;
  rewardExp: number; // 三階全滿的總額（依 TIER_RATIO 分批發放）
  rewardCoins: number;
  rewardTitleId?: string; // 於銅牌達成時發放
  rewardEquipmentIds?: string[]; // 於銅牌達成時發放
  parentIds: string[]; // DAG：空陣列 = 全局起點
}

export interface Equipment {
  id: string;
  name: string;
  icon: string;
  description: string;
}

export interface Title {
  id: string;
  name: string;
  color: string; // tailwind class
}

/** 獎品目錄（可重複兌換的商品，不是一次性旗標） */
export interface RewardItem {
  id: string;
  title: string;
  cost: number;
  description: string;
  icon: string;
  isActive: boolean;
  stockPerWeek?: number;
  isGrandPrize?: boolean; // 畢業大禮：商店獨立置底並顯示儲蓄進度條
}

/** 出席里程碑：純累加、永不歸零 */
export interface AttendanceMilestone {
  count: number;
  bonusExp: number;
  bonusCoins: number;
  label: string;
}

/** 一份完整的課程包（spec §12.7），engine 一律吃這個，而不是讀全域常數 */
export interface Curriculum {
  id: string; // 'badminton-7yo-v1'
  version: number; // QUEST_DATA_VERSION
  name: string;
  chapters: Chapter[];
  quests: QuestNode[];
  equipments: Equipment[];
  titles: Title[];
  rewards: RewardItem[];
  levelCurve: number[];
  maxLevel: number;
  tierRatio: Record<TierLevel, number>;
  attendanceExp: number;
  attendanceCoins: number;
  milestones: AttendanceMilestone[];
  courseWeeks: number; // 26
  plannedSessions: number; // 52
  initialTitleId: string;
  finalQuestId: string; // 完成此節點銅牌即可畢業
  graduationTitleId: string;
  graduationEquipmentIds: string[];
}

// ---------------------------------------------------------------------------
// 3.3 動態狀態
// ---------------------------------------------------------------------------

/** 家長在 Admin 的臨時上下架／改價（spec §7.2），存在 player 文件內 */
export type ShopOverrides = Record<string, { isActive?: boolean; cost?: number }>;

/** 本週各商品的兌換次數（stockPerWeek 檢查用，避免為此額外查詢 orders） */
export interface RedeemCounter {
  weekKey: string; // 該週週一 YYYY-MM-DD
  byItem: Record<string, number>;
}

/**
 * 今天這次練習的小計（Admin 置頂顯示）。
 * sessions/{id} 文件完全由它推導後覆寫，因此更新練習紀錄時不需要先讀取 session 文件。
 */
export interface ActiveSessionSummary {
  id: string;
  date: string; // YYYY-MM-DD
  expGiven: number; // 本次練習所有來源的 EXP 小計
  coinsGiven: number;
  bonusExp: number; // 其中教練額外給的
  bonusCoins: number;
  coachNote?: string;
  teachNote?: string; // 家長的教學筆記（只有家長看得到），匯出實戰筆記用
  sessionNumber?: number; // 第幾次練習（舊資料沒有，匯出時依日期推算）
  durationMin?: number;
  createdAt: string;
}

export interface Player {
  id: string;
  name: string;
  avatar: string;
  level: number;
  currentExp: number; // 當前等級「內」的 EXP（非累計）
  totalExp: number;
  coins: number;
  totalCoinsEarned: number;
  currentTitleId: string;
  unlockedEquipmentIds: string[];
  unlockedTitleIds: string[];
  sessionCount: number;
  courseStartDate: string; // YYYY-MM-DD
  graduatedAt?: string;
  finalCoachWords?: string; // 畢業證書上的教練寄語
  lastEvent?: LiveEvent;
  curriculumId: string;
  curriculumVersion: number;
  shopOverrides?: ShopOverrides;
  redeemCounter?: RedeemCounter;
  activeSession?: ActiveSessionSummary;
  /** 歷史型資料的版本戳：另一台裝置寫入後遞增，讓 1 小時快取得知要失效 */
  logsRev?: number;
  ordersRev?: number;
  sessionsRev?: number;
  updatedAt: string;
}

/**
 * 慶祝動畫的事件匯流排。
 * 家長核可後，把整串要播的動畫寫進 player 文件的 lastEvent；
 * iPad 端的 onSnapshot 收到變更就依序播放。
 */
export interface LiveEvent {
  id: string; // uuid，用於去重
  items: CelebrationItem[];
  createdAt: string;
}

export type CelebrationItem =
  | { kind: 'tier'; nodeId: string; tier: TierLevel; exp: number; coins: number }
  | { kind: 'quest_completed'; nodeId: string }
  | { kind: 'equipment'; equipmentId: string }
  | { kind: 'title'; titleId: string }
  | { kind: 'level_up'; from: number; to: number }
  | { kind: 'node_unlocked'; nodeIds: string[] }
  | { kind: 'chapter_unlocked'; chapterId: ChapterId }
  | { kind: 'attendance'; sessionCount: number; exp: number; coins: number }
  | { kind: 'milestone'; label: string; exp: number; coins: number }
  | { kind: 'order_fulfilled'; rewardTitle: string }
  | { kind: 'coach_note'; text: string }
  | { kind: 'bonus'; exp: number; coins: number; message?: string }
  | { kind: 'discovery'; chapterId: ChapterId; count: number }
  | { kind: 'retro_medals'; count: number }
  | { kind: 'graduation' };

export type QuestStatus =
  | 'locked' // 前置未完成
  | 'unlocked' // 可挑戰
  | 'submitted' // 小孩已回報「我做到了！」，等家長審核
  | 'completed'; // 已達銅牌並經家長核可（仍可回頭挑戰銀／金）

export interface QuestProgress {
  nodeId: string;
  status: QuestStatus;
  currentCount: number;
  bestCount: number; // 只增不減
  tiersAwarded: TierLevel[]; // 只增不減
  attempts: number; // 僅家長可見
  /**
   * 有值 = 待審中。未完成節點同時 status='submitted'；
   * 已完成節點回頭挑戰銀／金時 status 維持 'completed'（不變式 3：不回退），只設這個欄位。
   */
  submittedAt?: string;
  completedAt?: string;
  coachFeedback?: string;
  /** 解鎖時的 player.sessionCount（實戰筆記：這關花了幾次練習）。舊資料沒有，匯出時由前置節點推算 */
  unlockedAtSession?: number;
  /** 各階級頒發時的 player.sessionCount */
  tierSessions?: Partial<Record<TierLevel, number>>;
}

/** 34 節點合併成「一份」Firestore 文件：players/{playerId}/state/questProgress */
export interface QuestProgressDoc {
  byNodeId: Record<string, QuestProgress>;
  updatedAt: string;
}

export interface PracticeSession {
  id: string;
  date: string;
  durationMin?: number;
  attendanceExp: number;
  attendanceCoins: number;
  bonusExp: number;
  bonusCoins: number;
  coachNote?: string;
  teachNote?: string; // 家長的教學筆記（不給小孩看）
  sessionNumber?: number;
  createdAt: string;
}

export type OrderStatus = 'pending' | 'fulfilled' | 'cancelled';

export interface RedemptionOrder {
  id: string;
  rewardItemId: string;
  rewardTitleSnapshot: string;
  costSnapshot: number;
  status: OrderStatus;
  requestedAt: string;
  fulfilledAt?: string;
  note?: string;
}

export type ActivityType =
  | 'session_checked_in'
  | 'attendance_milestone'
  | 'tier_reached'
  | 'quest_submitted'
  | 'quest_approved'
  | 'quest_retry'
  | 'bonus_granted'
  | 'coach_note'
  | 'level_up'
  | 'reward_requested'
  | 'reward_fulfilled'
  | 'reward_cancelled'
  | 'equipment_unlocked'
  | 'title_unlocked'
  | 'curriculum_updated'
  | 'admin_adjust'
  | 'graduated';

export interface ActivityLog {
  id: string;
  type: ActivityType;
  message: string;
  expDelta?: number;
  coinDelta?: number;
  coachFeedback?: string;
  createdAt: string;
}
