import { TIER_RATIO } from '../../../types';

export { TIER_RATIO };

/** 升到下一級所需 EXP：requiredExp(L) = 50 + (L - 1) * 20，上限 Lv.25 */
export const LEVEL_CURVE: number[] = [
  50, 70, 90, 110, 130, 150, 170, 190, 210, 230,
  250, 270, 290, 310, 330, 350, 370, 390, 410, 430,
  450, 470, 490, 510,
]; // 24 個級距，合計 6,720
export const MAX_LEVEL = 25;
