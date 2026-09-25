import type { ActivityType } from '../types';

export const LOG_ICON: Record<ActivityType, string> = {
  session_checked_in: '🏸',
  attendance_milestone: '🏅',
  tier_reached: '🎖️',
  quest_submitted: '🙋',
  quest_approved: '✅',
  quest_retry: '💪',
  bonus_granted: '🎁',
  coach_note: '🗣️',
  level_up: '⬆️',
  reward_requested: '🛍️',
  reward_fulfilled: '📦',
  reward_cancelled: '↩️',
  equipment_unlocked: '🎒',
  title_unlocked: '🏷️',
  curriculum_updated: '🗺️',
  admin_adjust: '🛠️',
  graduated: '🎓',
};

export function formatTime(iso: string): string {
  const d = new Date(iso);
  return `${d.getMonth() + 1}/${d.getDate()} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}
