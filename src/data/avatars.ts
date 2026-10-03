/** 小孩可自選的頭像（與課程包無關，所有孩子共用） */
export interface AvatarOption {
  emoji: string;
  label: string;
}

export const AVATARS: { group: string; items: AvatarOption[] }[] = [
  {
    group: '男生',
    items: [
      { emoji: '👦', label: '小男孩' },
      { emoji: '🦸‍♂️', label: '超級英雄' },
      { emoji: '🧙‍♂️', label: '魔法師' },
      { emoji: '🤴', label: '小王子' },
      { emoji: '👨‍🚀', label: '太空人' },
      { emoji: '🧝‍♂️', label: '小精靈' },
      { emoji: '🧜‍♂️', label: '人魚王子' },
      { emoji: '🧞‍♂️', label: '神燈精靈' },
      { emoji: '👨‍🍳', label: '小廚師' },
      { emoji: '👨‍🎨', label: '小畫家' },
      { emoji: '👨‍🔬', label: '科學家' },
      { emoji: '👨‍🚒', label: '消防員' },
      { emoji: '🏄‍♂️', label: '衝浪高手' },
    ],
  },
  {
    group: '女生',
    items: [
      { emoji: '👧', label: '小女孩' },
      { emoji: '🦸‍♀️', label: '女超人' },
      { emoji: '🧚‍♀️', label: '小仙子' },
      { emoji: '👸', label: '小公主' },
      { emoji: '👩‍🚀', label: '太空人' },
      { emoji: '🧝‍♀️', label: '小精靈' },
      { emoji: '🧜‍♀️', label: '美人魚' },
      { emoji: '🧙‍♀️', label: '小女巫' },
      { emoji: '👩‍🍳', label: '小廚師' },
      { emoji: '👩‍🎨', label: '小畫家' },
      { emoji: '👩‍🔬', label: '科學家' },
      { emoji: '💃', label: '舞蹈家' },
      { emoji: '🏄‍♀️', label: '衝浪高手' },
    ],
  },
];
