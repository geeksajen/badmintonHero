/**
 * 狗狗夥伴：成長完全由等級（與是否畢業）推算，不另外存 —— 只升不降，跟等級一樣。
 * 不會餓、不會難過、不會變小（spec §8.1 零懲罰）。
 */
import type { Player } from '../types';

export interface PetStage {
  key: 'sleep' | 'baby' | 'pup' | 'playful' | 'athlete' | 'brave' | 'hero';
  minLevel: number;
  name: string;
  /** 點狗狗時會說的話（{name} 會換成狗狗的名字） */
  lines: string[];
}

export const PET_STAGES: PetStage[] = [
  {
    key: 'sleep',
    minLevel: 1,
    name: '睡在小窩裡',
    lines: ['呼嚕……呼嚕……{name} 還在小窩裡睡覺。', '噓～{name} 在做夢，夢到跟你一起打球！'],
  },
  {
    key: 'baby',
    minLevel: 3,
    name: '小奶狗',
    lines: ['汪！{name} 醒來了，好喜歡你！', '{name} 走路還搖搖晃晃的，要一起長大喔！', '汪汪！再練一次球，{name} 就會長大一點！'],
  },
  {
    key: 'pup',
    minLevel: 6,
    name: '小幼犬',
    lines: ['汪！{name} 的尾巴停不下來了！', '{name} 會站起來了，好厲害吧！', '今天也要一起練球喔！'],
  },
  {
    key: 'playful',
    minLevel: 10,
    name: '活潑小狗',
    lines: ['{name} 撿到一顆羽毛球！要不要一起玩？', '汪汪！你打球的樣子好帥！', '{name} 跑得好快，跟你一樣快！'],
  },
  {
    key: 'athlete',
    minLevel: 15,
    name: '運動健將',
    lines: ['{name} 戴上頭帶了，準備好一起練球！', '汪！今天要打幾下？{name} 幫你數！', '你是最棒的教練搭檔！'],
  },
  {
    key: 'brave',
    minLevel: 20,
    name: '勇者犬',
    lines: ['{name} 披上了勇者披風！', '汪！再一下下就要到山頂了！', '{name} 會一直陪著你冒險！'],
  },
  {
    key: 'hero',
    minLevel: 25,
    name: '羽球勇者犬',
    lines: ['{name} 長出羽毛翅膀了！我們是羽球勇者！', '汪汪！謝謝你一直陪 {name} 長大！', '我們一起登上王者之巔了！'],
  },
];

export const PET_MAX_STAGE = PET_STAGES.length - 1;

/** 目前的成長階段（0 ~ 6）。畢業直接變成羽球勇者犬 */
export function petStageIndex(level: number, graduated = false): number {
  if (graduated) return PET_MAX_STAGE;
  let idx = 0;
  PET_STAGES.forEach((s, i) => {
    if (level >= s.minLevel) idx = i;
  });
  return idx;
}

/**
 * 外型的成長程度 0 ~ 1（Lv.3 醒來時為 0，Lv.25／畢業為 1）。
 * 不到下一個階段時，每升一級也會稍微長大一點。
 */
export function petGrowth(level: number, graduated = false): number {
  if (graduated) return 1;
  const first = PET_STAGES[1].minLevel;
  const last = PET_STAGES[PET_MAX_STAGE].minLevel;
  return Math.min(1, Math.max(0, (level - first) / (last - first)));
}

/** 再升幾級會進入下一個階段；已是最後階段回傳 null */
export function levelsToNextStage(level: number, graduated = false): number | null {
  const i = petStageIndex(level, graduated);
  if (i >= PET_MAX_STAGE) return null;
  return PET_STAGES[i + 1].minLevel - level;
}

export type PetColor = 'cream' | 'shiba' | 'chocolate' | 'white' | 'patches';

export const PET_COLORS: { id: PetColor; label: string }[] = [
  { id: 'cream', label: '奶油色' },
  { id: 'shiba', label: '柴犬橘' },
  { id: 'chocolate', label: '巧克力' },
  { id: 'white', label: '雪白色' },
  { id: 'patches', label: '黑白花' },
];

export const DEFAULT_PET_NAME = '旺旺';
export const PET_NAME_MAX_LENGTH = 8;

export function petNameOf(player: Pick<Player, 'petName'>): string {
  return player.petName?.trim() || DEFAULT_PET_NAME;
}

export function petColorOf(player: Pick<Player, 'petColor'>): PetColor {
  return PET_COLORS.some((c) => c.id === player.petColor) ? (player.petColor as PetColor) : 'cream';
}

/** 寶箱裡可以穿在狗狗身上的裝備 */
export interface PetWear {
  wristband: boolean;
  shoes: boolean;
  scarf: boolean;
}

export function petWearOf(player: Pick<Player, 'unlockedEquipmentIds'>): PetWear {
  const has = (id: string) => player.unlockedEquipmentIds.includes(id);
  return { wristband: has('eq_wristband'), shoes: has('eq_shoes'), scarf: has('eq_towel') };
}

export function petLine(stage: number, name: string, seed: number): string {
  const lines = PET_STAGES[stage].lines;
  return lines[Math.abs(seed) % lines.length].replace(/\{name\}/g, name);
}
