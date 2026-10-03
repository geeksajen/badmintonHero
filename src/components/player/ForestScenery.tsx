/**
 * 泡棉森林（第 2 章）的背景：兩側茂密的樹林、躲在樹邊的動物、灑下來的陽光，
 * 以及在「只有一個關卡的那一列」另一側、小路旁邊探頭的小動物。
 *
 * 不擋路的規則：
 * - 樹與邊緣動物只放在左右邊帶（手機上縮小，最寬約到 14%；關卡圓圈最靠邊約在 15%）
 * - 小路旁的動物只放在單一節點列的「對面」，與節點至少相隔 28% 寬度
 * - 全部 pointer-events-none，畫在小路與關卡下面；邊緣加深綠色陰影，讓中間的小路更亮更清楚
 */

import type { TrailSpot } from './mapLayout';

/** 固定的偽隨機（同一張地圖每次長得一樣） */
const jitter = (i: number, salt: number) => {
  const v = Math.sin(i * 12.9898 + salt * 78.233) * 43758.5453;
  return v - Math.floor(v);
};

const TREES = ['🌲', '🌳', '🌲', '🌲', '🌳'];

/** 邊緣的動物：side、垂直位置（%）、動畫 */
const EDGE_ANIMALS: { emoji: string; side: 'left' | 'right'; top: number; anim: string }[] = [
  { emoji: '🦉', side: 'left', top: 14, anim: 'animate-wiggle' },
  { emoji: '🐿️', side: 'right', top: 22, anim: 'animate-float' },
  { emoji: '🦌', side: 'left', top: 36, anim: 'animate-float' },
  { emoji: '🦊', side: 'right', top: 47, anim: 'animate-wiggle' },
  { emoji: '🦔', side: 'left', top: 59, anim: 'animate-float' },
  { emoji: '🐻', side: 'right', top: 68, anim: 'animate-float' },
  { emoji: '🐰', side: 'left', top: 80, anim: 'animate-bounce' },
  { emoji: '🐌', side: 'right', top: 88, anim: 'animate-float' },
];

/** 在邊帶裡飛的小傢伙 */
const FLYERS: { emoji: string; side: 'left' | 'right'; top: number; anim: string }[] = [
  { emoji: '🦋', side: 'left', top: 27, anim: 'animate-float' },
  { emoji: '🐦', side: 'right', top: 33, anim: 'animate-drift' },
  { emoji: '🦋', side: 'right', top: 76, anim: 'animate-float' },
  { emoji: '🐝', side: 'left', top: 70, anim: 'animate-drift' },
];

/** 小路旁探頭的小動物（依序輪流） */
const TRAIL_ANIMALS = ['🐇', '🦝', '🐥', '🐸', '🐞', '🦔'];

export function ForestScenery({ height, trailSpots }: { height: number; trailSpots: TrailSpot[] }) {
  const rows = Math.max(6, Math.round(height / 80));

  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 select-none overflow-hidden">
      {/* 陽光從樹梢灑下來（上半部，淡淡的斜光） */}
      <div
        className="absolute inset-x-0 top-0 h-3/5 opacity-60"
        style={{
          background: 'repeating-linear-gradient(115deg, rgba(255,255,240,0.18) 0 36px, transparent 36px 130px)',
          maskImage: 'linear-gradient(to bottom, black, transparent)',
          WebkitMaskImage: 'linear-gradient(to bottom, black, transparent)',
        }}
      />
      {/* 樹蔭：兩側較深、中間小路較亮 */}
      <div
        className="absolute inset-0"
        style={{
          background:
            'linear-gradient(to right, rgba(6,78,59,0.45), rgba(6,78,59,0) 22%, rgba(6,78,59,0) 78%, rgba(6,78,59,0.45))',
        }}
      />

      {/* 兩側樹林：後排（大、暗）＋ 前排（小、亮） */}
      {(['left', 'right'] as const).map((side, s) =>
        Array.from({ length: rows }, (_, i) => {
          const top = (i / rows) * 100 + jitter(i, s) * 4;
          const back = TREES[(i + s) % TREES.length];
          const front = TREES[(i + s + 2) % TREES.length];
          return (
            <div key={`${side}-${i}`}>
              <span
                className="absolute text-6xl leading-none sm:text-7xl"
                style={{
                  top: `${top - 3}%`,
                  [side]: `${-6 + jitter(i, s + 3) * 3}%`,
                  filter: 'brightness(0.72) saturate(1.1)',
                }}
              >
                {back}
              </span>
              <span
                className="absolute text-4xl leading-none drop-shadow sm:text-5xl"
                style={{ top: `${top + 2}%`, [side]: `${jitter(i, s + 7) * 2.5}%` }}
              >
                {front}
              </span>
            </div>
          );
        }),
      )}

      {/* 地上的蘑菇、花、草（邊帶） */}
      {Array.from({ length: Math.round(rows / 2) }, (_, i) => {
        const side = i % 2 === 0 ? 'left' : 'right';
        return (
          <span
            key={`ground-${i}`}
            className="absolute text-2xl leading-none"
            style={{ top: `${8 + i * (88 / Math.round(rows / 2)) + jitter(i, 11) * 5}%`, [side]: `${3 + jitter(i, 13) * 3}%` }}
          >
            {['🍄', '🌼', '🌿', '🍄', '🌱'][i % 5]}
          </span>
        );
      })}
      <div className="absolute inset-x-0 bottom-1 flex justify-between px-1 text-2xl leading-none">
        <span>🌿🍄🌼</span>
        <span>🌼🍄🌿</span>
      </div>

      {/* 樹邊的動物 */}
      {EDGE_ANIMALS.map((a, i) => (
        <span
          key={`animal-${i}`}
          className={`absolute text-3xl leading-none drop-shadow-[0_2px_0_rgba(43,35,80,0.35)] sm:text-4xl ${a.anim}`}
          style={{ top: `${a.top}%`, [a.side]: '2%', animationDelay: `${-i * 0.8}s`, animationDuration: a.anim === 'animate-bounce' ? '1.6s' : undefined }}
        >
          {a.emoji}
        </span>
      ))}
      {FLYERS.map((f, i) => (
        <span
          key={`fly-${i}`}
          className={`absolute text-2xl leading-none ${f.anim}`}
          style={{ top: `${f.top}%`, [f.side]: '5%', animationDelay: `${-i * 1.3}s` }}
        >
          {f.emoji}
        </span>
      ))}

      {/* 小路旁探頭的小動物（單一節點列的對面） */}
      {trailSpots.map((p, i) => (
        <span
          key={`trail-${i}`}
          className="absolute flex -translate-x-1/2 -translate-y-1/2 flex-col items-center leading-none"
          style={{ left: `${p.x}%`, top: p.y }}
        >
          <span className="animate-float text-4xl drop-shadow-[0_2px_0_rgba(43,35,80,0.35)]" style={{ animationDelay: `${-i * 0.7}s` }}>
            {TRAIL_ANIMALS[i % TRAIL_ANIMALS.length]}
          </span>
          <span className="-mt-1 text-xl">🌿</span>
        </span>
      ))}
    </div>
  );
}
