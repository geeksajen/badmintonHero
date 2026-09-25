import type { AttendanceMilestone } from '../../../types';

export const ATTENDANCE_EXP = 25; // 每次練習，出席即得
export const ATTENDANCE_COINS = 10;

/** 純累加、永不歸零，不做 streak（spec §8.1） */
export const ATTENDANCE_MILESTONES: AttendanceMilestone[] = [
  { count: 5, bonusExp: 50, bonusCoins: 25, label: '第 5 次練習！好的開始' },
  { count: 10, bonusExp: 100, bonusCoins: 50, label: '第 10 次練習！堅持的勇者' },
  { count: 20, bonusExp: 150, bonusCoins: 75, label: '第 20 次練習！不動如山' },
  { count: 35, bonusExp: 200, bonusCoins: 100, label: '第 35 次練習！快到山頂了' },
  { count: 50, bonusExp: 300, bonusCoins: 150, label: '第 50 次練習！傳說級毅力' },
];
// 合計 800 EXP / 400 金幣
