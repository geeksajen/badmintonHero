import type { Curriculum } from '../../../types';
import { CHAPTERS } from './chapters';
import { QUESTS } from './quests';
import { EQUIPMENTS } from './equipments';
import { TITLES } from './titles';
import { REWARDS } from './rewards';
import { LEVEL_CURVE, MAX_LEVEL, TIER_RATIO } from './levelCurve';
import { ATTENDANCE_COINS, ATTENDANCE_EXP, ATTENDANCE_MILESTONES } from './attendance';

/** ★ 每次修改 quests.ts 就 +1，並在 CHANGELOG.md 記一行（spec §12.5） */
export const QUEST_DATA_VERSION = 1;

export const CURRICULUM_ID = 'badminton-7yo-v1';

export const badminton7yoV1: Curriculum = {
  id: CURRICULUM_ID,
  version: QUEST_DATA_VERSION,
  name: '羽球勇者冒險記（7 歲・6 個月）',
  chapters: CHAPTERS,
  quests: QUESTS,
  equipments: EQUIPMENTS,
  titles: TITLES,
  rewards: REWARDS,
  levelCurve: LEVEL_CURVE,
  maxLevel: MAX_LEVEL,
  tierRatio: TIER_RATIO,
  attendanceExp: ATTENDANCE_EXP,
  attendanceCoins: ATTENDANCE_COINS,
  milestones: ATTENDANCE_MILESTONES,
  courseWeeks: 26,
  plannedSessions: 52,
  initialTitleId: 'title_newbie',
  finalQuestId: 'q5_6',
  graduationTitleId: 'title_hero',
  graduationEquipmentIds: ['eq_champion_racket'],
};

export {
  CHAPTERS, QUESTS, EQUIPMENTS, TITLES, REWARDS,
  LEVEL_CURVE, MAX_LEVEL, TIER_RATIO,
  ATTENDANCE_EXP, ATTENDANCE_COINS, ATTENDANCE_MILESTONES,
};
