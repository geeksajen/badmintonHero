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
    ],
  },
  {
    group: '女生',
    items: [
      { emoji: '👧', label: '小女孩' },
      { emoji: '🦸‍♀️', label: '女超人' },
      { emoji: '🧚‍♀️', label: '小仙子' },
    ],
  },
];
