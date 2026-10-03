import type { RewardItem } from '../../../types';

/**
 * 商店商品目錄（寫死，讀取成本 0）。
 * 永久改價請改這裡重新部署；臨時上下架／改價用 Admin 的 shopOverrides。
 *
 * 文具定價：台幣 × 2（100 遊戲幣 ≈ 50 元），以自動筆 40 幣為基準。
 * 便宜的小東西設每週上限，避免一次把金幣花光、也讓大獎還有存錢的動機。
 */
export const REWARDS: RewardItem[] = [
  // ✏️ 文具區
  { id: 'rw_eraser', title: '造型橡皮擦', cost: 30, description: '可愛造型的橡皮擦，寫錯也不怕！', icon: '🧽', isActive: true, stockPerWeek: 2, category: 'stationery' },
  { id: 'rw_lead', title: '自動筆芯一盒', cost: 30, description: '自動筆的筆芯，寫完了就換新的。', icon: '✒️', isActive: true, stockPerWeek: 2, category: 'stationery' },
  { id: 'rw_mech_pencil', title: '自動筆', cost: 40, description: '一支自己挑的自動筆。', icon: '✏️', isActive: true, stockPerWeek: 2, category: 'stationery' },
  { id: 'rw_stickers', title: '可愛貼紙一張', cost: 40, description: '挑一張喜歡的貼紙！', icon: '⭐', isActive: true, stockPerWeek: 2, category: 'stationery' },
  { id: 'rw_ruler', title: '造型尺', cost: 50, description: '畫直線用的小尺，有可愛圖案。', icon: '📏', isActive: true, stockPerWeek: 1, category: 'stationery' },
  { id: 'rw_highlighter', title: '螢光筆 3 支', cost: 60, description: '三種顏色的螢光筆。', icon: '🖍️', isActive: true, stockPerWeek: 1, category: 'stationery' },
  { id: 'rw_notebook', title: '卡通筆記本', cost: 70, description: '封面有卡通圖案的筆記本。', icon: '📒', isActive: true, stockPerWeek: 1, category: 'stationery' },
  { id: 'rw_washi_tape', title: '紙膠帶', cost: 80, description: '漂亮花紋的紙膠帶，可以貼東貼西。', icon: '🎀', isActive: true, stockPerWeek: 1, category: 'stationery' },
  { id: 'rw_color_pencils', title: '12 色色鉛筆', cost: 200, description: '一盒 12 種顏色的色鉛筆。', icon: '🎨', isActive: true, category: 'stationery' },
  { id: 'rw_pencil_case', title: '造型鉛筆盒', cost: 300, description: '自己挑一個喜歡的鉛筆盒！', icon: '👝', isActive: true, category: 'stationery' },

  // 🎁 獎品區
  { id: 'rw_cartoon', title: '卡通 30 分鐘', cost: 60, description: '挑一部喜歡的卡通看 30 分鐘。', icon: '📺', isActive: true, stockPerWeek: 2 },
  { id: 'rw_dinner', title: '選今晚的晚餐', cost: 80, description: '今天晚餐吃什麼，你說了算！', icon: '🍜', isActive: true, stockPerWeek: 2 },
  { id: 'rw_bubble_tea', title: '珍珠奶茶', cost: 100, description: '一杯香香的珍珠奶茶。', icon: '🧋', isActive: true, stockPerWeek: 1 },
  { id: 'rw_play_with_dad', title: '跟爸爸去球場打球 1 小時', cost: 120, description: '跟爸爸一起打球，不用上課的那種！', icon: '🏸', isActive: true, stockPerWeek: 1 },
  { id: 'rw_book_toy', title: '挑一本新書 / 小玩具', cost: 200, description: '去書店或玩具店挑一個。', icon: '🎁', isActive: true, stockPerWeek: 1 },
  { id: 'rw_trip', title: '假日出遊選地點', cost: 300, description: '這個假日去哪裡玩，你來決定。', icon: '🗺️', isActive: true },
  { id: 'rw_lego', title: '樂高小盒組', cost: 450, description: '一盒樂高小盒組。', icon: '🧱', isActive: true },
  {
    id: 'rw_new_racket',
    title: '畢業大禮：自己挑一支新球拍',
    cost: 1000,
    description: '存到 1000 金幣，就可以自己挑一支新球拍！',
    icon: '🏆',
    isActive: true,
    isGrandPrize: true,
  },
];
