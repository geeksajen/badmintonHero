/**
 * 狗狗夥伴的圖（純 SVG，不用 emoji）。同一隻狗依 growth（0～1）改變比例：
 * 小時候頭大、身體小、腿短；長大後身體與腿變長。stage 決定姿勢與配件：
 *   0 睡在小窩裡｜1 小奶狗（坐著）｜2 小幼犬（站起來＋鈴鐺項圈）｜3 活潑小狗（身邊有羽毛球）
 *   4 運動健將（頭帶＋小球拍）｜5 勇者犬（披風）｜6 羽球勇者犬（羽毛翅膀＋金牌＋金球拍）
 * 寶箱的護腕／球鞋／勇者毛巾會穿在狗狗身上（wear）。
 * 動畫用 SVG 內建的 <animate>：呼吸、眨眼、搖尾巴、披風與翅膀擺動；still 時全部關閉。
 */
import { useId } from 'react';
import type { PetColor, PetWear } from '../../engine/pet';

const INK = '#2b2350';

const PALETTES: Record<PetColor, { fur: string; dark: string; light: string; back: string; patch?: string }> = {
  cream: { fur: '#F8DDB0', dark: '#D99E62', light: '#FFF6E6', back: '#EDCB95' },
  shiba: { fur: '#F3A65C', dark: '#D97E2E', light: '#FFF3E2', back: '#E69546' },
  chocolate: { fur: '#A86B3E', dark: '#7A4826', light: '#F1D4B5', back: '#93592F' },
  white: { fur: '#FFFFFF', dark: '#F0C9A4', light: '#FFF7EE', back: '#EEE7DF' },
  patches: { fur: '#FFFFFF', dark: '#3F3A4F', light: '#FFFFFF', back: '#ECE8F2', patch: '#3F3A4F' },
};

export interface PuppyArtProps {
  stage: number;
  growth: number;
  color: PetColor;
  wear?: PetWear;
  happy?: boolean;
  /** 關閉所有動畫（縮圖、reduced-motion） */
  still?: boolean;
  className?: string;
  title?: string;
  /** 'head'：只畫出臉（小圖示用） */
  crop?: 'head';
}

const NO_WEAR: PetWear = { wristband: false, shoes: false, scarf: false };

export function PuppyArt({ stage, growth, color, wear = NO_WEAR, happy = false, still = false, className, title, crop }: PuppyArtProps) {
  const uid = useId().replace(/:/g, '');
  const pal = PALETTES[color];
  const viewBox = crop === 'head' ? headViewBox(stage, growth) : '0 0 200 200';
  return (
    <svg viewBox={viewBox} className={className} role="img" aria-label={title}>
      {title && <title>{title}</title>}
      {stage === 0 ? (
        <SleepingPuppy pal={pal} still={still} />
      ) : (
        <AwakePuppy uid={uid} stage={stage} growth={growth} pal={pal} wear={wear} happy={happy} still={still} />
      )}
    </svg>
  );
}

type Pal = (typeof PALETTES)[PetColor];

/** 第 0 階段：在小籃子裡蜷成一團睡覺 */
function SleepingPuppy({ pal, still }: { pal: Pal; still: boolean }) {
  const sw = 3.2;
  return (
    <g transform="translate(100 182)">
      <ellipse cx={0} cy={0} rx={74} ry={7} fill="rgba(43,35,80,0.16)" />
      {/* 籃子後緣與小毯子 */}
      <ellipse cx={0} cy={-46} rx={68} ry={17} fill="#C98A50" stroke={INK} strokeWidth={sw} />
      <ellipse cx={0} cy={-46} rx={59} ry={12} fill="#F9A8D4" />
      {/* 蜷起來的小狗 */}
      <g>
        {!still && (
          <animateTransform attributeName="transform" type="scale" values="1 1;1.02 1.06;1 1" dur="2.8s" repeatCount="indefinite" additive="sum" />
        )}
        <path d="M 30 -50 C 50 -50 52 -70 38 -70" fill="none" stroke={INK} strokeWidth={11} strokeLinecap="round" />
        <path d="M 30 -50 C 50 -50 52 -70 38 -70" fill="none" stroke={pal.fur} strokeWidth={6} strokeLinecap="round" />
        <ellipse cx={8} cy={-54} rx={34} ry={18} fill={pal.fur} stroke={INK} strokeWidth={sw} />
        {pal.patch && <ellipse cx={18} cy={-60} rx={11} ry={7} fill={pal.patch} />}
        <circle cx={-22} cy={-56} r={21} fill={pal.fur} stroke={INK} strokeWidth={sw} />
        <ellipse cx={-14} cy={-73} rx={6} ry={11} transform="rotate(-40 -14 -73)" fill={pal.dark} stroke={INK} strokeWidth={sw} />
        <ellipse cx={-38} cy={-52} rx={7} ry={12} transform="rotate(30 -38 -52)" fill={pal.dark} stroke={INK} strokeWidth={sw} />
        <ellipse cx={-30} cy={-47} rx={10} ry={7} fill={pal.light} />
        <ellipse cx={-36} cy={-49} rx={3.6} ry={2.8} fill={INK} />
        {/* 閉著的眼睛 */}
        <path d="M -31 -59 q 3 3 6 0" fill="none" stroke={INK} strokeWidth={2.6} strokeLinecap="round" />
        <path d="M -20 -58 q 3 3 6 0" fill="none" stroke={INK} strokeWidth={2.6} strokeLinecap="round" />
        <ellipse cx={-14} cy={-50} rx={4} ry={2.5} fill="#FF9FB5" opacity={0.6} />
      </g>
      {/* 籃子前緣與編織紋 */}
      <path d="M -70 -46 Q -66 -2 -40 -2 L 40 -2 Q 66 -2 70 -46 Q 0 -28 -70 -46 Z" fill="#D9985C" stroke={INK} strokeWidth={sw} strokeLinejoin="round" />
      {[-44, -22, 0, 22, 44].map((x) => (
        <path key={x} d={`M ${x} -34 q ${x / 10} 14 ${x / 6} 30`} fill="none" stroke="#A86B3E" strokeWidth={2.4} strokeLinecap="round" />
      ))}
      <path d="M -62 -24 Q 0 -10 62 -24" fill="none" stroke="#A86B3E" strokeWidth={2.4} />
      {/* Zzz */}
      {[0, 1, 2].map((i) => (
        <text
          key={i}
          x={-44 + i * 12}
          y={-86 - i * 13}
          fontSize={14 + i * 4}
          fontWeight={900}
          fill="#7C6FD0"
          fontFamily="'Baloo 2', sans-serif"
        >
          z
          {!still && (
            <animate attributeName="opacity" values="0;1;1;0" keyTimes="0;0.2;0.7;1" dur="2.4s" begin={`${i * 0.4}s`} repeatCount="indefinite" />
          )}
        </text>
      ))}
    </g>
  );
}

/** 醒著的狗狗的尺寸（區域座標：原點在腳下，往上為負；畫面上再 translate(100 184) scale(k)） */
function puppyGeometry(stage: number, growth: number) {
  const p = Math.min(1, Math.max(0, growth));
  const k = 0.8 + 0.45 * p; // 整體大小（長到最大時，頭頂、球拍、羽毛球仍在畫框內）
  const sitting = stage === 1;
  const headR = 40 - 4 * p;
  const bodyRx = 27 + 11 * p;
  const bodyRy = 24 + 8 * p;
  const legW = 12 + 3 * p;
  const legH = sitting ? 0 : 12 + 20 * p;
  const cy = sitting ? -bodyRy * 0.95 : -(legH + bodyRy * 0.75);
  const hy = cy - bodyRy * 0.6 - headR * (sitting ? 0.8 : 0.75);
  return { k, sitting, headR, bodyRx, bodyRy, legW, cy, hy };
}

/** 只看臉的畫框（地圖上「你在這裡！」的小圖）：以頭為中心，含耳朵 */
function headViewBox(stage: number, growth: number): string {
  if (stage === 0) return '35 75 130 130'; // 睡在籃子裡：框住小狗和籃子
  const { k, headR, hy } = puppyGeometry(stage, growth);
  const cx = 100;
  const cy = 184 + k * hy;
  const half = k * headR * 1.35;
  return `${cx - half} ${cy - half} ${half * 2} ${half * 2}`;
}

function AwakePuppy({
  uid,
  stage,
  growth,
  pal,
  wear,
  happy,
  still,
}: {
  uid: string;
  stage: number;
  growth: number;
  pal: Pal;
  wear: PetWear;
  happy: boolean;
  still: boolean;
}) {
  const { k, sitting, headR, bodyRx, bodyRy, legW, cy, hy } = puppyGeometry(stage, growth);
  const sw = 3.3 / k; // 線條在畫面上維持差不多粗
  const hero = stage >= 6;
  const neckY = hy + headR * 0.85;

  const tailBx = bodyRx * 0.72;
  const tailBy = cy - bodyRy * 0.15;
  const wagDur = happy ? '0.22s' : '0.6s';

  const eyeRx = headR * 0.12;
  const eyeRy = headR * 0.15;
  const noseY = hy + headR * 0.3;
  const mouthY = noseY + headR * 0.17;
  const mw = headR * 0.16;

  const frontX = bodyRx * 0.36;
  const backX = bodyRx * 0.74;

  /** 一隻腳＋腳掌（可穿球鞋、戴護腕） */
  const leg = (x: number, top: number, width: number, front: boolean, band: boolean) => (
    <g key={`${x}-${front}`}>
      <rect x={x - width / 2} y={top} width={width} height={-top} rx={width / 2} fill={front ? pal.fur : pal.back} stroke={INK} strokeWidth={sw} />
      {band && (
        <rect x={x - width * 0.6} y={-width * 1.6} width={width * 1.2} height={width * 0.5} rx={width * 0.2} fill="#38BDF8" stroke={INK} strokeWidth={sw * 0.8} />
      )}
      {wear.shoes ? (
        <g>
          <rect x={x - width * 0.72} y={-width * 0.8} width={width * 1.44} height={width * 0.8} rx={width * 0.36} fill="#EF4444" stroke={INK} strokeWidth={sw} />
          <line x1={x - width * 0.55} y1={-width * 0.12} x2={x + width * 0.55} y2={-width * 0.12} stroke="#FFFFFF" strokeWidth={sw * 0.9} strokeLinecap="round" />
        </g>
      ) : (
        <ellipse cx={x} cy={-width * 0.32} rx={width * 0.64} ry={width * 0.42} fill={pal.light} stroke={INK} strokeWidth={sw} />
      )}
    </g>
  );

  return (
    <g transform={`translate(100 184) scale(${k})`}>
      {/* 影子 */}
      <ellipse cx={0} cy={0} rx={bodyRx * 1.45} ry={6 / k} fill="rgba(43,35,80,0.16)" />

      {/* 道具：羽毛球（活潑小狗起）、小球拍（運動健將起，勇者是金球拍） */}
      {stage >= 3 && <Shuttle x={-(bodyRx + 26)} sw={sw} />}
      {stage >= 4 && <Racket x={bodyRx + 18} sw={sw} gold={hero} />}

      <g>
        {!still && (
          <animateTransform attributeName="transform" type="scale" values="1 1;1.015 1.03;1 1" dur="2.6s" repeatCount="indefinite" />
        )}

        {/* 羽毛翅膀（羽球勇者犬） */}
        {hero && (
          <>
            <Wing side={-1} x={-bodyRx * 0.55} y={cy - bodyRy * 0.65} sw={sw} still={still} />
            <Wing side={1} x={bodyRx * 0.55} y={cy - bodyRy * 0.65} sw={sw} still={still} />
          </>
        )}

        {/* 披風（勇者犬起） */}
        {stage >= 5 && (
          <g>
            {!still && (
              <animateTransform attributeName="transform" type="rotate" values={`-2 0 ${neckY};3 0 ${neckY};-2 0 ${neckY}`} dur="2.4s" repeatCount="indefinite" />
            )}
            <path
              d={`M ${-bodyRx * 0.55} ${neckY} C ${-bodyRx * 1.3} ${cy}, ${-bodyRx * 1.25} ${cy + bodyRy * 0.9}, ${-bodyRx * 1.1} ${cy + bodyRy * 1.05}
                  Q ${-bodyRx * 0.55} ${cy + bodyRy * 0.8} 0 ${cy + bodyRy * 1.05} Q ${bodyRx * 0.55} ${cy + bodyRy * 0.8} ${bodyRx * 1.1} ${cy + bodyRy * 1.05}
                  C ${bodyRx * 1.25} ${cy + bodyRy * 0.9}, ${bodyRx * 1.3} ${cy}, ${bodyRx * 0.55} ${neckY} Z`}
              fill={hero ? '#7C3AED' : '#E11D48'}
              stroke={hero ? '#FACC15' : INK}
              strokeWidth={sw}
              strokeLinejoin="round"
            />
          </g>
        )}

        {/* 尾巴 */}
        <g>
          {!still && (
            <animateTransform
              attributeName="transform"
              type="rotate"
              values={`-14 ${tailBx} ${tailBy};20 ${tailBx} ${tailBy};-14 ${tailBx} ${tailBy}`}
              dur={wagDur}
              repeatCount="indefinite"
            />
          )}
          <path
            d={`M ${tailBx} ${tailBy} C ${tailBx + 14} ${tailBy - 4}, ${tailBx + 22} ${tailBy - 20}, ${tailBx + 15} ${tailBy - 32}`}
            fill="none"
            stroke={INK}
            strokeWidth={legW * 0.75 + sw * 2}
            strokeLinecap="round"
          />
          <path
            d={`M ${tailBx} ${tailBy} C ${tailBx + 14} ${tailBy - 4}, ${tailBx + 22} ${tailBy - 20}, ${tailBx + 15} ${tailBy - 32}`}
            fill="none"
            stroke={pal.fur}
            strokeWidth={legW * 0.75}
            strokeLinecap="round"
          />
        </g>

        {/* 後腳（站著）／坐姿的大腿 */}
        {!sitting && [-backX, backX].map((x) => leg(x, cy + bodyRy * 0.3, legW * 0.95, false, false))}
        {sitting &&
          [-1, 1].map((s) => (
            <ellipse key={s} cx={s * bodyRx * 0.8} cy={-bodyRy * 0.38} rx={bodyRx * 0.4} ry={bodyRy * 0.44} fill={pal.back} stroke={INK} strokeWidth={sw} />
          ))}

        {/* 身體 */}
        <ellipse cx={0} cy={cy} rx={bodyRx} ry={bodyRy} fill={pal.fur} stroke={INK} strokeWidth={sw} />
        <ellipse cx={0} cy={cy + bodyRy * 0.22} rx={bodyRx * 0.55} ry={bodyRy * 0.6} fill={pal.light} />
        {pal.patch && <ellipse cx={-bodyRx * 0.5} cy={cy - bodyRy * 0.25} rx={bodyRx * 0.3} ry={bodyRy * 0.28} fill={pal.patch} />}

        {/* 前腳 */}
        {!sitting && [-frontX, frontX].map((x) => leg(x, cy, legW, true, wear.wristband && x > 0))}
        {sitting && (
          <>
            {[-1, 1].map((s) => (
              <ellipse key={`hind-${s}`} cx={s * bodyRx * 0.85} cy={-5} rx={legW * 0.75} ry={legW * 0.45} fill={pal.light} stroke={INK} strokeWidth={sw} />
            ))}
            {[-frontX * 0.8, frontX * 0.8].map((x) => leg(x, cy + bodyRy * 0.2, legW * 0.9, true, wear.wristband && x > 0))}
          </>
        )}

        {/* 項圈／勇者毛巾圍巾／金牌 */}
        {wear.scarf ? (
          <g>
            <rect x={-headR * 0.62} y={neckY - headR * 0.13} width={headR * 1.24} height={headR * 0.28} rx={headR * 0.13} fill="#14B8A6" stroke={INK} strokeWidth={sw} />
            <path
              d={`M ${headR * 0.25} ${neckY + headR * 0.08} l ${headR * 0.3} ${headR * 0.55} l ${-headR * 0.32} ${-headR * 0.08} Z`}
              fill="#14B8A6"
              stroke={INK}
              strokeWidth={sw}
              strokeLinejoin="round"
            />
          </g>
        ) : (
          stage >= 2 && (
            <rect x={-headR * 0.58} y={neckY - headR * 0.1} width={headR * 1.16} height={headR * 0.2} rx={headR * 0.1} fill="#EF4444" stroke={INK} strokeWidth={sw} />
          )
        )}
        {hero ? (
          <g>
            <path d={`M ${-headR * 0.2} ${neckY} L 0 ${neckY + headR * 0.42} L ${headR * 0.2} ${neckY}`} fill="none" stroke="#3B82F6" strokeWidth={sw * 1.4} />
            <circle cx={0} cy={neckY + headR * 0.55} r={headR * 0.2} fill="#FACC15" stroke={INK} strokeWidth={sw} />
            <path d={starPath(0, neckY + headR * 0.55, headR * 0.11)} fill="#FFFFFF" />
          </g>
        ) : (
          stage >= 2 &&
          !wear.scarf && (
            <g>
              <circle cx={0} cy={neckY + headR * 0.18} r={headR * 0.12} fill="#FACC15" stroke={INK} strokeWidth={sw * 0.9} />
              <line x1={0} y1={neckY + headR * 0.2} x2={0} y2={neckY + headR * 0.28} stroke={INK} strokeWidth={sw * 0.7} />
            </g>
          )
        )}

        {/* 頭 */}
        <defs>
          <clipPath id={`head-${uid}`}>
            <ellipse cx={0} cy={hy} rx={headR * 1.05} ry={headR * 0.92} />
          </clipPath>
        </defs>
        <ellipse cx={0} cy={hy} rx={headR * 1.05} ry={headR * 0.92} fill={pal.fur} stroke={INK} strokeWidth={sw} />
        {pal.patch && <ellipse cx={headR * 0.4} cy={hy - headR * 0.02} rx={headR * 0.28} ry={headR * 0.32} fill={pal.patch} />}

        {/* 頭帶（運動健將起） */}
        {stage >= 4 && (
          <g clipPath={`url(#head-${uid})`}>
            <rect x={-headR * 1.2} y={hy - headR * 0.66} width={headR * 2.4} height={headR * 0.24} fill="#38BDF8" stroke={INK} strokeWidth={sw * 0.8} />
            <rect x={-headR * 1.2} y={hy - headR * 0.57} width={headR * 2.4} height={headR * 0.06} fill="#FFFFFF" />
          </g>
        )}
        {/* 小奶狗頭頂的呆毛 */}
        {stage <= 2 && (
          <path
            d={`M ${-headR * 0.12} ${hy - headR * 0.88} q ${headR * 0.05} ${-headR * 0.25} ${headR * 0.2} ${-headR * 0.22} q ${-headR * 0.12} ${headR * 0.05} ${-headR * 0.02} ${headR * 0.2}`}
            fill={pal.fur}
            stroke={INK}
            strokeWidth={sw * 0.8}
            strokeLinejoin="round"
          />
        )}

        {/* 眼睛（會眨眼） */}
        {[-1, 1].map((s) => (
          <g key={`eye-${s}`}>
            {happy ? (
              <path
                d={`M ${s * headR * 0.38 - eyeRx} ${hy + eyeRy * 0.3} q ${eyeRx} ${-eyeRy * 1.3} ${eyeRx * 2} 0`}
                fill="none"
                stroke={INK}
                strokeWidth={sw}
                strokeLinecap="round"
              />
            ) : (
              <>
                <ellipse cx={s * headR * 0.38} cy={hy + headR * 0.02} rx={eyeRx} ry={eyeRy} fill={INK}>
                  {!still && (
                    <animate
                      attributeName="ry"
                      values={`${eyeRy};${eyeRy};${eyeRy * 0.1};${eyeRy}`}
                      keyTimes="0;0.93;0.96;1"
                      dur="4.5s"
                      repeatCount="indefinite"
                    />
                  )}
                </ellipse>
                <circle cx={s * headR * 0.38 + eyeRx * 0.35} cy={hy + headR * 0.02 - eyeRy * 0.4} r={headR * 0.045} fill="#FFFFFF" />
              </>
            )}
          </g>
        ))}

        {/* 臉頰、口鼻 */}
        {[-1, 1].map((s) => (
          <ellipse key={`blush-${s}`} cx={s * headR * 0.66} cy={hy + headR * 0.4} rx={headR * 0.14} ry={headR * 0.08} fill="#FF9FB5" opacity={0.6} />
        ))}
        <ellipse cx={0} cy={hy + headR * 0.45} rx={headR * 0.42} ry={headR * 0.3} fill={pal.light} />
        <ellipse cx={0} cy={noseY} rx={headR * 0.15} ry={headR * 0.1} fill={INK} />
        <ellipse cx={-headR * 0.04} cy={noseY - headR * 0.03} rx={headR * 0.05} ry={headR * 0.025} fill="#FFFFFF" opacity={0.8} />
        {(happy || stage >= 3) && (
          <ellipse cx={0} cy={mouthY + headR * 0.1} rx={headR * 0.085} ry={headR * 0.11} fill="#FF8FA3" stroke={INK} strokeWidth={sw * 0.7} />
        )}
        <path
          d={`M ${-mw} ${mouthY} Q ${-mw / 2} ${mouthY + headR * 0.11} 0 ${mouthY} Q ${mw / 2} ${mouthY + headR * 0.11} ${mw} ${mouthY}`}
          fill="none"
          stroke={INK}
          strokeWidth={sw * 0.85}
          strokeLinecap="round"
        />

        {/* 垂垂的耳朵 */}
        {[-1, 1].map((s) => (
          <ellipse
            key={`ear-${s}`}
            cx={s * headR * 0.95}
            cy={hy - headR * 0.02}
            rx={headR * 0.3}
            ry={headR * 0.55}
            transform={`rotate(${s * -16} ${s * headR * 0.95} ${hy - headR * 0.02})`}
            fill={pal.dark}
            stroke={INK}
            strokeWidth={sw}
          />
        ))}
      </g>

      {/* 羽球勇者犬的閃光 */}
      {hero &&
        [
          [-bodyRx * 1.4, hy - headR * 0.6, 7],
          [bodyRx * 1.5, hy - headR * 0.2, 6],
          [-bodyRx * 1.1, cy + bodyRy * 0.4, 5],
        ].map(([x, y, r], i) => (
          <path key={i} d={starPath(x, y, r / k)} fill="#FACC15" stroke={INK} strokeWidth={sw * 0.5}>
            {!still && <animate attributeName="opacity" values="0.3;1;0.3" dur="1.8s" begin={`${i * 0.5}s`} repeatCount="indefinite" />}
          </path>
        ))}
    </g>
  );
}

/** 地上的一顆羽毛球 */
function Shuttle({ x, sw }: { x: number; sw: number }) {
  return (
    <g transform={`rotate(-24 ${x} -8)`}>
      <path d={`M ${x - 6} -12 L ${x - 14} -36 L ${x + 14} -36 L ${x + 6} -12 Z`} fill="#FFFFFF" stroke={INK} strokeWidth={sw * 0.8} strokeLinejoin="round" />
      <line x1={x - 10} y1={-25} x2={x + 10} y2={-25} stroke="#CBD5E1" strokeWidth={sw * 0.7} />
      <path d={`M ${x - 7} -12 A 7 7 0 0 0 ${x + 7} -12 Z`} fill="#FDE68A" stroke={INK} strokeWidth={sw * 0.8} />
    </g>
  );
}

/** 靠在旁邊的小球拍 */
function Racket({ x, sw, gold }: { x: number; sw: number; gold: boolean }) {
  const frame = gold ? '#FACC15' : '#8B5CF6';
  return (
    <g transform={`rotate(14 ${x} 0)`}>
      <line x1={x} y1={0} x2={x} y2={-34} stroke={INK} strokeWidth={sw * 2.2} strokeLinecap="round" />
      <line x1={x} y1={0} x2={x} y2={-34} stroke={gold ? '#FDE68A' : '#F472B6'} strokeWidth={sw * 1.1} strokeLinecap="round" />
      <ellipse cx={x} cy={-54} rx={13} ry={18} fill="rgba(255,255,255,0.55)" stroke={frame} strokeWidth={sw * 1.3} />
      <ellipse cx={x} cy={-54} rx={13} ry={18} fill="none" stroke={INK} strokeWidth={sw * 0.5} />
      {[-6, 0, 6].map((d) => (
        <g key={d}>
          <line x1={x + d} y1={-70} x2={x + d} y2={-38} stroke="#94A3B8" strokeWidth={0.9} />
          <line x1={x - 12} y1={-54 + d * 1.6} x2={x + 12} y2={-54 + d * 1.6} stroke="#94A3B8" strokeWidth={0.9} />
        </g>
      ))}
    </g>
  );
}

/** 羽毛翅膀（四根羽毛扇形展開，輕輕拍動） */
function Wing({ side, x, y, sw, still }: { side: -1 | 1; x: number; y: number; sw: number; still: boolean }) {
  return (
    <g>
      {!still && (
        <animateTransform
          attributeName="transform"
          type="rotate"
          values={`0 ${x} ${y};${side * -10} ${x} ${y};0 ${x} ${y}`}
          dur="1.6s"
          repeatCount="indefinite"
        />
      )}
      {[0, 1, 2, 3].map((i) => {
        // 往兩側展開，羽毛要伸出披風外面才看得到
        const angle = side * (48 + i * 18);
        const len = 48 - i * 5;
        return (
          <g key={i} transform={`rotate(${angle} ${x} ${y})`}>
            <ellipse cx={x} cy={y - len / 2} rx={10} ry={len / 2} fill="#E0F2FE" stroke={INK} strokeWidth={sw * 0.8} />
            <ellipse cx={x} cy={y - len * 0.7} rx={5.5} ry={len * 0.24} fill="#7DD3FC" />
          </g>
        );
      })}
    </g>
  );
}

function starPath(cx: number, cy: number, r: number): string {
  const pts: string[] = [];
  for (let i = 0; i < 10; i++) {
    const rr = i % 2 === 0 ? r : r * 0.45;
    const a = (Math.PI / 5) * i - Math.PI / 2;
    pts.push(`${(cx + rr * Math.cos(a)).toFixed(2)} ${(cy + rr * Math.sin(a)).toFixed(2)}`);
  }
  return `M ${pts.join(' L ')} Z`;
}
