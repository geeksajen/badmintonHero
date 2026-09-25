import type { RewardItem } from '../../../types';

/**
 * 商店商品目錄（寫死，讀取成本 0）。
 * 永久改價請改這裡重新部署；臨時上下架／改價用 Admin 的 shopOverrides。
 */
export const REWARDS: RewardItem[] = [
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
