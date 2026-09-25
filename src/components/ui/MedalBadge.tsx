import type { TierLevel } from '../../types';
import { TIER_EMOJI, TIER_LABEL } from '../../engine/tiers';

export function MedalBadge({ tier, size = 'md' }: { tier: TierLevel; size?: 'sm' | 'md' | 'lg' }) {
  const cls = size === 'lg' ? 'text-7xl' : size === 'sm' ? 'text-xl' : 'text-3xl';
  return (
    <span className={cls} role="img" aria-label={TIER_LABEL[tier]}>
      {TIER_EMOJI[tier]}
    </span>
  );
}

/** 只增不減的獎牌統計（spec §12.6：不要顯示百分比或分數） */
export function MedalTally({ gold, silver, bronze, className = '' }: { gold: number; silver: number; bronze: number; className?: string }) {
  return (
    <span className={`inline-flex items-center gap-2 tabular-nums ${className}`}>
      <span>🥇 {gold}</span>
      <span>🥈 {silver}</span>
      <span>🥉 {bronze}</span>
    </span>
  );
}
