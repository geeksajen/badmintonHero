import type { AttendanceMilestone } from '../types';

/** 出席次數達到 count 時命中的里程碑（純累加、永不歸零） */
export function milestoneFor(
  sessionCount: number,
  milestones: AttendanceMilestone[],
): AttendanceMilestone | undefined {
  return milestones.find((m) => m.count === sessionCount);
}

/** 下一個尚未達成的里程碑 */
export function nextMilestone(
  sessionCount: number,
  milestones: AttendanceMilestone[],
): AttendanceMilestone | undefined {
  return [...milestones].sort((a, b) => a.count - b.count).find((m) => m.count > sessionCount);
}
