import type { Curriculum } from '../types';
import { badminton7yoV1, CURRICULUM_ID as DEFAULT_CURRICULUM_ID } from './curricula/badminton-7yo-v1';

/** 所有課程包。新增一個孩子：複製資料夾、在這裡註冊（spec §12.7） */
export const CURRICULA: Record<string, Curriculum> = {
  [badminton7yoV1.id]: badminton7yoV1,
};

export { DEFAULT_CURRICULUM_ID };

/** 依 player.curriculumId 取得課程包；找不到時退回預設包 */
export function getCurriculum(curriculumId?: string): Curriculum {
  return (curriculumId && CURRICULA[curriculumId]) || CURRICULA[DEFAULT_CURRICULUM_ID];
}
