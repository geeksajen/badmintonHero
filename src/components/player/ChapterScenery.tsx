/**
 * 每一章的專屬地圖背景：兩側的景物（前後兩排）、躲在邊上的動物、飛來飛去的小東西、
 * 地上的小裝飾、整片的氣氛層（陽光／泡泡／暴風雲／風／星光），以及小路旁探頭的小動物。
 *
 * 不擋路的規則（所有章節共用，見 tests/mapLayout.test.ts）：
 * - 景物與邊緣動物只放在左右邊帶（手機上縮小，最寬約到 14%；關卡圓圈最靠邊約在 15%）
 * - 小路旁的動物只放在單一關卡列的「對面」，與關卡至少相隔 28% 寬度
 * - 全部 pointer-events-none，畫在小路與關卡下面；兩側加深陰影，讓中間的小路更亮更清楚
 */
import type { CSSProperties } from 'react';
import type { ChapterId } from '../../types';
import type { TrailSpot } from './mapLayout';

type Anim = 'animate-float' | 'animate-wiggle' | 'animate-bounce' | 'animate-drift' | 'animate-rise' | 'animate-flash' | 'animate-twinkle' | '';

interface Placed {
  emoji: string;
  anim: Anim;
}

interface Landmark extends Placed {
  side: 'left' | 'right';
  top: number; // %，從章節招牌下方（LANDMARK_TOP）再往下的偏移
}

interface SceneTheme {
  /** 兩側陰影的顏色（中間保持亮） */
  shade: string;
  overlay: 'sunrays' | 'bokeh' | 'storm' | 'wind' | 'stars';
  /** 後排大景物（較暗）與前排小景物 */
  back: string[];
  front: string[];
  backFilter: string;
  frontAnim?: Anim;
  ground: string[];
  /** 邊緣動物：依序左右交錯、由上往下平均分布 */
  edgeAnimals: Placed[];
  flyers: Placed[];
  /** 小路旁探頭的小動物（輪流） */
  trail: string[];
  /** 固定位置的地標（城堡、彩虹…），只放在邊帶 */
  landmarks?: Landmark[];
}

const THEMES: Record<ChapterId, SceneTheme> = {
  // 第 1 章 氣球村：小房子、花園、農場動物、往上飄的氣球
  1: {
    shade: 'rgba(190,24,93,0.28)',
    overlay: 'bokeh',
    back: ['🏡', '🌳', '🏠', '🌸', '🏡'],
    front: ['🌷', '🌼', '🌸', '🌻', '🌷'],
    backFilter: 'brightness(0.92) saturate(1.05)',
    ground: ['🍭', '🌼', '🍬', '🌷', '🧁'],
    edgeAnimals: [
      { emoji: '🐑', anim: 'animate-float' },
      { emoji: '🐤', anim: 'animate-wiggle' },
      { emoji: '🐱', anim: 'animate-float' },
      { emoji: '🐶', anim: 'animate-wiggle' },
      { emoji: '🐷', anim: 'animate-float' },
      { emoji: '🐮', anim: 'animate-float' },
      { emoji: '🐔', anim: 'animate-wiggle' },
      { emoji: '🐰', anim: 'animate-bounce' },
    ],
    flyers: [
      { emoji: '🎈', anim: 'animate-rise' },
      { emoji: '🦋', anim: 'animate-float' },
      { emoji: '🎈', anim: 'animate-rise' },
      { emoji: '🎈', anim: 'animate-rise' },
    ],
    trail: ['🎈', '🧸', '🐣', '🎁', '🍭', '🎀'],
  },

  // 第 2 章 泡棉森林：茂密樹林、森林動物、樹梢灑下的陽光
  2: {
    shade: 'rgba(6,78,59,0.45)',
    overlay: 'sunrays',
    back: ['🌲', '🌳', '🌲', '🌲', '🌳'],
    front: ['🌲', '🌲', '🌳', '🌲', '🌳'],
    backFilter: 'brightness(0.72) saturate(1.1)',
    ground: ['🍄', '🌼', '🌿', '🍄', '🌱'],
    edgeAnimals: [
      { emoji: '🦉', anim: 'animate-wiggle' },
      { emoji: '🐿️', anim: 'animate-float' },
      { emoji: '🦌', anim: 'animate-float' },
      { emoji: '🦊', anim: 'animate-wiggle' },
      { emoji: '🦔', anim: 'animate-float' },
      { emoji: '🐻', anim: 'animate-float' },
      { emoji: '🐰', anim: 'animate-bounce' },
      { emoji: '🐌', anim: 'animate-float' },
    ],
    flyers: [
      { emoji: '🦋', anim: 'animate-float' },
      { emoji: '🐦', anim: 'animate-drift' },
      { emoji: '🐝', anim: 'animate-drift' },
      { emoji: '🦋', anim: 'animate-float' },
    ],
    trail: ['🐇', '🦝', '🐥', '🐸', '🐞', '🦔'],
  },

  // 第 3 章 雷霆峽谷：岩壁、仙人掌、暴風雲與閃電、沙漠動物
  3: {
    shade: 'rgba(124,45,18,0.42)',
    overlay: 'storm',
    back: ['⛰️', '🪨', '⛰️', '🪨', '⛰️'],
    front: ['🌵', '🪨', '🌵', '🌾', '🌵'],
    backFilter: 'brightness(0.78) sepia(0.25)',
    ground: ['🪨', '🌵', '🌾', '🪨', '🌼'],
    edgeAnimals: [
      { emoji: '🦅', anim: 'animate-wiggle' },
      { emoji: '🦎', anim: 'animate-float' },
      { emoji: '🐐', anim: 'animate-float' },
      { emoji: '🐪', anim: 'animate-float' },
      { emoji: '🦙', anim: 'animate-wiggle' },
      { emoji: '🐢', anim: 'animate-float' },
      { emoji: '🦔', anim: 'animate-float' },
      { emoji: '🐿️', anim: 'animate-bounce' },
    ],
    flyers: [
      { emoji: '⚡', anim: 'animate-flash' },
      { emoji: '🦅', anim: 'animate-drift' },
      { emoji: '⚡', anim: 'animate-flash' },
      { emoji: '🌪️', anim: 'animate-wiggle' },
    ],
    trail: ['🦎', '🐢', '🐐', '🦙', '🐣', '🦔'],
    landmarks: [
      { emoji: '🌩️', side: 'left', top: 3, anim: 'animate-float' },
      { emoji: '⛈️', side: 'right', top: 6, anim: 'animate-float' },
    ],
  },

  // 第 4 章 風之階梯：雲朵、風箏、風鈴、飄落的葉子、各種鳥
  4: {
    shade: 'rgba(30,58,138,0.36)',
    overlay: 'wind',
    back: ['☁️', '☁️', '☁️', '☁️', '☁️'],
    front: ['🌾', '🍃', '🌾', '🌿', '🌾'],
    backFilter: 'brightness(1.05)',
    frontAnim: 'animate-wiggle',
    ground: ['🌾', '🍃', '🌼', '🍂', '🌾'],
    edgeAnimals: [
      { emoji: '🕊️', anim: 'animate-float' },
      { emoji: '🐑', anim: 'animate-float' },
      { emoji: '🦢', anim: 'animate-float' },
      { emoji: '🦜', anim: 'animate-wiggle' },
      { emoji: '🦩', anim: 'animate-float' },
      { emoji: '🐧', anim: 'animate-wiggle' },
      { emoji: '🦆', anim: 'animate-float' },
      { emoji: '🐦', anim: 'animate-bounce' },
    ],
    flyers: [
      { emoji: '🪁', anim: 'animate-drift' },
      { emoji: '🍃', anim: 'animate-drift' },
      { emoji: '🎐', anim: 'animate-wiggle' },
      { emoji: '🍂', anim: 'animate-drift' },
    ],
    trail: ['🐑', '🦆', '🐧', '🦜', '🕊️', '🐣'],
    landmarks: [
      { emoji: '🎏', side: 'right', top: 4, anim: 'animate-wiggle' },
      { emoji: '🌀', side: 'left', top: 5, anim: 'animate-float' },
    ],
  },

  // 第 5 章 王者之巔：雪山、城堡、彩虹、閃亮的星星與寶石、傳說中的動物
  5: {
    shade: 'rgba(76,29,149,0.42)',
    overlay: 'stars',
    back: ['🏔️', '⛰️', '🏔️', '🏔️', '⛰️'],
    front: ['💎', '🌟', '✨', '💎', '⭐'],
    backFilter: 'brightness(0.85) saturate(1.1)',
    frontAnim: 'animate-twinkle',
    ground: ['💎', '⭐', '🌟', '💎', '✨'],
    edgeAnimals: [
      { emoji: '🦅', anim: 'animate-wiggle' },
      { emoji: '🦄', anim: 'animate-float' },
      { emoji: '🦁', anim: 'animate-float' },
      { emoji: '🐉', anim: 'animate-wiggle' },
      { emoji: '🦚', anim: 'animate-float' },
      { emoji: '🐯', anim: 'animate-float' },
      { emoji: '🦢', anim: 'animate-float' },
      { emoji: '🐲', anim: 'animate-bounce' },
    ],
    flyers: [
      { emoji: '🌠', anim: 'animate-drift' },
      { emoji: '✨', anim: 'animate-twinkle' },
      { emoji: '⭐', anim: 'animate-twinkle' },
      { emoji: '🦋', anim: 'animate-float' },
    ],
    trail: ['🦄', '🦁', '🐲', '🦚', '🐯', '🦅'],
    landmarks: [
      { emoji: '🏰', side: 'left', top: 3, anim: '' },
      { emoji: '🌈', side: 'right', top: 4, anim: 'animate-float' },
    ],
  },
};

/** 地標放在章節招牌下方（招牌約占區塊頂端 12%，手機上招牌很寬，地標放太高會從招牌後面露出來） */
const LANDMARK_TOP = 12;
/** 邊緣動物從地標下面開始排 */
const ANIMALS_TOP = 22;

/** 固定的偽隨機（同一張地圖每次長得一樣） */
const jitter = (i: number, salt: number) => {
  const v = Math.sin(i * 12.9898 + salt * 78.233) * 43758.5453;
  return v - Math.floor(v);
};

/** 兩側淡出、中間透明的遮罩：讓氣氛層集中在邊上，不干擾小路 */
const EDGE_MASK = 'linear-gradient(to right, black, black 18%, transparent 30%, transparent 70%, black 82%, black)';

function Overlay({ kind }: { kind: SceneTheme['overlay'] }) {
  const style: CSSProperties = {};
  switch (kind) {
    case 'sunrays':
      return (
        <div
          className="absolute inset-x-0 top-0 h-3/5 opacity-60"
          style={{
            background: 'repeating-linear-gradient(115deg, rgba(255,255,240,0.18) 0 36px, transparent 36px 130px)',
            maskImage: 'linear-gradient(to bottom, black, transparent)',
            WebkitMaskImage: 'linear-gradient(to bottom, black, transparent)',
          }}
        />
      );
    case 'bokeh':
      // 粉彩泡泡（像飄在空中的小氣球影子）
      style.background = [
        'radial-gradient(circle at 8% 12%, rgba(255,255,255,0.45) 0 18px, transparent 19px)',
        'radial-gradient(circle at 92% 26%, rgba(253,224,71,0.45) 0 14px, transparent 15px)',
        'radial-gradient(circle at 6% 48%, rgba(147,197,253,0.5) 0 16px, transparent 17px)',
        'radial-gradient(circle at 94% 63%, rgba(255,255,255,0.45) 0 20px, transparent 21px)',
        'radial-gradient(circle at 10% 82%, rgba(196,181,253,0.5) 0 13px, transparent 14px)',
        'radial-gradient(circle at 90% 90%, rgba(134,239,172,0.45) 0 15px, transparent 16px)',
      ].join(',');
      break;
    case 'storm':
      // 上方的暴風雲陰影
      return (
        <div
          className="absolute inset-x-0 top-0 h-2/5"
          style={{ background: 'linear-gradient(to bottom, rgba(68,64,60,0.4), rgba(68,64,60,0))' }}
        />
      );
    case 'wind':
      // 斜斜的風線（只在兩側）
      style.background = 'repeating-linear-gradient(172deg, rgba(255,255,255,0.22) 0 4px, transparent 4px 46px)';
      style.maskImage = EDGE_MASK;
      style.WebkitMaskImage = EDGE_MASK;
      break;
    case 'stars':
      // 頂端的光芒 ＋ 兩側的小星點
      return (
        <>
          <div
            className="absolute inset-x-0 top-0 h-1/3"
            style={{ background: 'radial-gradient(ellipse at 50% 0%, rgba(253,230,138,0.45), transparent 70%)' }}
          />
          <div
            className="absolute inset-0"
            style={{
              backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.9) 1.5px, transparent 2.5px)',
              backgroundSize: '38px 46px',
              maskImage: EDGE_MASK,
              WebkitMaskImage: EDGE_MASK,
              opacity: 0.6,
            }}
          />
        </>
      );
  }
  return <div className="absolute inset-0" style={style} />;
}

export function ChapterScenery({
  chapterId,
  height,
  trailSpots,
}: {
  chapterId: ChapterId;
  height: number;
  trailSpots: TrailSpot[];
}) {
  const t = THEMES[chapterId];
  const rows = Math.max(6, Math.round(height / 80));
  const groundCount = Math.round(rows / 2);

  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 select-none overflow-hidden">
      <Overlay kind={t.overlay} />
      {/* 兩側陰影、中間小路較亮 */}
      <div
        className="absolute inset-0"
        style={{ background: `linear-gradient(to right, ${t.shade}, transparent 22%, transparent 78%, ${t.shade})` }}
      />

      {/* 兩側景物：後排（大、暗）＋ 前排（小、亮） */}
      {(['left', 'right'] as const).map((side, s) =>
        Array.from({ length: rows }, (_, i) => {
          const top = (i / rows) * 100 + jitter(i, s) * 4;
          return (
            <div key={`${side}-${i}`}>
              <span
                className="absolute text-6xl leading-none sm:text-7xl"
                style={{ top: `${top - 3}%`, [side]: `${-6 + jitter(i, s + 3) * 3}%`, filter: t.backFilter }}
              >
                {t.back[(i + s) % t.back.length]}
              </span>
              <span
                className={`absolute text-4xl leading-none drop-shadow sm:text-5xl ${t.frontAnim ?? ''}`}
                style={{ top: `${top + 2}%`, [side]: `${jitter(i, s + 7) * 2.5}%`, animationDelay: `${-i * 0.6}s` }}
              >
                {t.front[(i + s + 2) % t.front.length]}
              </span>
            </div>
          );
        }),
      )}

      {/* 地上的小裝飾 */}
      {Array.from({ length: groundCount }, (_, i) => {
        const side = i % 2 === 0 ? 'left' : 'right';
        return (
          <span
            key={`ground-${i}`}
            className="absolute text-2xl leading-none"
            style={{ top: `${8 + i * (88 / groundCount) + jitter(i, 11) * 5}%`, [side]: `${3 + jitter(i, 13) * 3}%` }}
          >
            {t.ground[i % t.ground.length]}
          </span>
        );
      })}
      <div className="absolute inset-x-0 bottom-1 flex justify-between px-1 text-2xl leading-none">
        <span>{t.ground.slice(0, 3).join('')}</span>
        <span>{t.ground.slice(2, 5).join('')}</span>
      </div>

      {/* 地標（城堡、彩虹、暴風雲…） */}
      {t.landmarks?.map((l, i) => (
        <span
          key={`landmark-${i}`}
          className={`absolute text-4xl leading-none drop-shadow sm:text-6xl ${l.anim}`}
          style={{ top: `${LANDMARK_TOP + l.top}%`, [l.side]: '1%', animationDelay: `${-i * 1.1}s` }}
        >
          {l.emoji}
        </span>
      ))}

      {/* 邊上的動物：左右交錯、由上往下平均分布 */}
      {t.edgeAnimals.map((a, i) => (
        <span
          key={`animal-${i}`}
          className={`absolute text-3xl leading-none drop-shadow-[0_2px_0_rgba(43,35,80,0.35)] sm:text-4xl ${a.anim}`}
          style={{
            top: `${ANIMALS_TOP + i * ((94 - ANIMALS_TOP) / t.edgeAnimals.length)}%`,
            [i % 2 === 0 ? 'left' : 'right']: '2%',
            animationDelay: `${-i * 0.8}s`,
            animationDuration: a.anim === 'animate-bounce' ? '1.6s' : undefined,
          }}
        >
          {a.emoji}
        </span>
      ))}
      {t.flyers.map((f, i) => (
        <span
          key={`fly-${i}`}
          className={`absolute text-2xl leading-none ${f.anim}`}
          style={{
            top: `${24 + i * (60 / t.flyers.length) + jitter(i, 17) * 6}%`,
            [i % 2 === 0 ? 'left' : 'right']: '5%',
            animationDelay: `${-i * 1.3}s`,
          }}
        >
          {f.emoji}
        </span>
      ))}

      {/* 小路旁探頭的小動物（單一關卡列的對面） */}
      {trailSpots.map((p, i) => (
        <span
          key={`trail-${i}`}
          className="absolute flex -translate-x-1/2 -translate-y-1/2 flex-col items-center leading-none"
          style={{ left: `${p.x}%`, top: p.y }}
        >
          <span className="animate-float text-4xl drop-shadow-[0_2px_0_rgba(43,35,80,0.35)]" style={{ animationDelay: `${-i * 0.7}s` }}>
            {t.trail[i % t.trail.length]}
          </span>
          <span className="-mt-1 text-xl">{t.ground[(i + 2) % t.ground.length]}</span>
        </span>
      ))}
    </div>
  );
}
