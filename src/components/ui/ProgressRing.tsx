import type { QuestTiers, TierLevel } from '../../types';

const TIER_COLOR: Record<TierLevel, string> = {
  bronze: '#cd7f32',
  silver: '#a8b3c1',
  gold: '#f5b700',
};

/**
 * 節點外環：以金牌門檻為一整圈，依 count 分段著色（灰 → 銅 → 銀 → 金）。
 * completed 且未滿金牌時留一圈缺口，暗示「還可以再來」（spec §7.1）。
 */
export function ProgressRing({
  size,
  stroke = 8,
  count,
  tiers,
  highest,
  mode,
}: {
  size: number;
  stroke?: number;
  count: number;
  tiers: QuestTiers;
  highest?: TierLevel; // 已頒發的最高階級（completed 時使用）
  mode: 'progress' | 'completed' | 'locked' | 'gold';
}) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const cx = size / 2;

  const segments: { from: number; to: number; color: string }[] = [];
  if (mode === 'gold') {
    segments.push({ from: 0, to: 1, color: TIER_COLOR.gold });
  } else if (mode === 'completed') {
    const frac = highest === 'gold' ? 1 : highest === 'silver' ? 0.88 : 0.75;
    segments.push({ from: 0, to: frac, color: TIER_COLOR[highest ?? 'bronze'] });
  } else if (mode === 'progress' && count > 0) {
    const g = tiers.gold;
    const bounds: [number, number, string][] = [
      [0, tiers.bronze, '#e2e8f0'],
      [tiers.bronze, tiers.silver, TIER_COLOR.bronze],
      [tiers.silver, tiers.gold, TIER_COLOR.silver],
    ];
    for (const [lo, hi, color] of bounds) {
      if (count <= lo) break;
      segments.push({ from: lo / g, to: Math.min(count, hi) / g, color });
    }
    if (count >= g) segments.push({ from: 0, to: 1, color: TIER_COLOR.gold });
  }

  return (
    <svg width={size} height={size} className="absolute inset-0 -rotate-90" aria-hidden>
      <circle cx={cx} cy={cx} r={r} fill="none" stroke="rgba(255,255,255,0.35)" strokeWidth={stroke} />
      {segments.map((s, i) => (
        <circle
          key={i}
          cx={cx}
          cy={cx}
          r={r}
          fill="none"
          stroke={s.color}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={`${Math.max(0, (s.to - s.from) * c)} ${c}`}
          strokeDashoffset={-s.from * c}
        />
      ))}
    </svg>
  );
}
