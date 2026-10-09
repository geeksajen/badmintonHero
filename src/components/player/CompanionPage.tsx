import { motion, useReducedMotion } from 'framer-motion';
import { useEffect, useMemo, useState } from 'react';
import {
  PET_COLORS,
  PET_MAX_STAGE,
  PET_NAME_MAX_LENGTH,
  PET_STAGES,
  levelsToNextStage,
  petColorOf,
  petGrowth,
  petLine,
  petNameOf,
  petStageIndex,
  petWearOf,
  type PetColor,
} from '../../engine/pet';
import { useGameActions } from '../../hooks/useGameActions';
import { useReadyGame } from '../../hooks/useGameState';
import { DEV_PREVIEW_AVAILABLE, useShowAllChapters } from '../../lib/devPreview';
import { playSound } from '../../lib/sound';
import { Button } from '../ui/Button';
import { Modal } from '../ui/Modal';
import { PuppyArt } from './PuppyArt';
import { SpeakButton } from './SpeakButton';

/** 某個階段剛開始時的外型（相簿、開發預覽用） */
function stageGrowth(stage: number): number {
  return stage >= PET_MAX_STAGE ? 1 : petGrowth(PET_STAGES[stage].minLevel);
}

function seenKey(playerId: string) {
  return `bhq:pet:seenSession:${playerId}`;
}

/**
 * 夥伴分頁：狗狗住的小院子。成長只看等級（只升不降）；點狗狗會開心地跳一下、汪一聲、說一句話。
 * 每次練習後第一次打開，狗狗會開心轉一圈。不會餓、不會難過、不會變小（spec §8.1）。
 */
export function CompanionPage() {
  const { player, playerId } = useReadyGame();
  const reduce = !!useReducedMotion();
  const devAll = useShowAllChapters(); // 只有 npm run dev 時可能為 true
  const graduated = !!player.graduatedAt;
  const realStage = petStageIndex(player.level, graduated);
  const [preview, setPreview] = useState<number | null>(null);
  const stage = preview ?? realStage;
  const growth = preview !== null ? stageGrowth(preview) : petGrowth(player.level, graduated);
  const name = petNameOf(player);
  const color = petColorOf(player);
  const wear = petWearOf(player);
  const toNext = levelsToNextStage(player.level, graduated);

  const [taps, setTaps] = useState(0);
  const [line, setLine] = useState<string | null>(null);
  const [anim, setAnim] = useState<{ key: number; kind: 'happy' | 'spin' } | null>(null);
  const [editing, setEditing] = useState(false);

  // 每次練習後第一次打開：轉一圈慶祝
  useEffect(() => {
    let seen = -1;
    try {
      seen = Number(localStorage.getItem(seenKey(playerId)) ?? -1);
    } catch {
      /* ignore */
    }
    if (player.sessionCount > 0 && seen < player.sessionCount) {
      setLine(realStage === 0 ? `${name} 在夢裡聽到你今天有練球，笑了一下！` : `你今天有練球！${name} 好開心，轉了一圈！`);
      setAnim({ key: Date.now(), kind: 'spin' });
      if (realStage > 0) playSound('woof', { rate: 1.45 - 0.45 * petGrowth(player.level, graduated) });
    }
    try {
      localStorage.setItem(seenKey(playerId), String(player.sessionCount));
    } catch {
      /* ignore */
    }
  }, [playerId, player.sessionCount, player.level, realStage, graduated, name]);

  // 開心的動作與表情維持一下下就恢復
  useEffect(() => {
    if (!anim) return;
    const t = setTimeout(() => setAnim(null), 1400);
    return () => clearTimeout(t);
  }, [anim]);

  const tap = () => {
    const next = taps + 1;
    setTaps(next);
    setLine(petLine(stage, name, next));
    setAnim({ key: Date.now(), kind: 'happy' });
    if (stage === 0) playSound('tap', { rate: 0.7 });
    else playSound('woof', { rate: 1.45 - 0.45 * growth });
  };

  const animating = anim !== null;
  const bubble = line ?? (stage === 0 ? `噓～${name} 在睡覺，點點看！` : `點點 ${name}，跟牠打招呼！`);
  const albumAll = DEV_PREVIEW_AVAILABLE && devAll;

  return (
    <div className="mx-auto max-w-3xl space-y-5 px-4 py-6">
      <div className="toon dots flex items-center justify-between gap-2 rounded-3xl bg-gradient-to-r from-sky-300 via-cyan-200 to-lime-200 py-2 pl-5 pr-2 text-ink">
        <h2 className="flex min-w-0 items-center gap-2 text-3xl">
          <span className="animate-wiggle">🐶</span>
          <span className="truncate">我的夥伴</span>
        </h2>
        <button
          type="button"
          onClick={() => setEditing(true)}
          className="toon-sm toon-press flex min-h-[64px] shrink-0 items-center gap-1 rounded-2xl bg-white px-4 text-lg"
        >
          ✏️ 名字和毛色
        </button>
      </div>

      {/* 小院子 */}
      <section className="toon relative overflow-hidden rounded-[2rem] bg-gradient-to-b from-sky-200 via-sky-100 to-lime-200 px-3 pb-4 pt-3">
        <Yard />
        {/* 對話泡泡 */}
        <div className="relative z-10 mx-auto flex max-w-md items-center gap-2 rounded-3xl border-[3px] border-ink bg-white py-2 pl-4 pr-2 text-xl text-ink">
          <p className="flex-1 leading-snug">{bubble}</p>
          <SpeakButton text={bubble} label="念給我聽" />
          <span aria-hidden className="absolute -bottom-[14px] left-1/2 h-0 w-0 -translate-x-1/2 border-x-[12px] border-t-[14px] border-x-transparent border-t-ink" />
        </div>

        <motion.button
          type="button"
          aria-label={`${name}，點一下跟牠打招呼`}
          onClick={tap}
          className="relative z-10 mx-auto mt-3 block"
          key={anim?.key ?? 'idle'}
          animate={
            reduce || !anim
              ? undefined
              : anim.kind === 'spin'
                ? { rotate: [0, 360], y: [0, -30, 0] }
                : { y: [0, -26, 0, -10, 0], rotate: [0, -6, 6, 0] }
          }
          transition={{ duration: anim?.kind === 'spin' ? 1 : 0.7 }}
        >
          <PuppyArt
            stage={stage}
            growth={growth}
            color={color}
            wear={wear}
            happy={animating}
            still={reduce}
            className="h-64 w-64 sm:h-80 sm:w-80"
            title={name}
          />
        </motion.button>

        <div className="relative z-10 mt-1 text-center">
          <div className="text-3xl text-ink">
            {name}
            <span className="toon-sm ml-2 inline-block -rotate-2 rounded-full bg-yellow-300 px-3 py-0.5 align-middle text-lg">
              {PET_STAGES[stage].name}
            </span>
          </div>
          {preview !== null ? (
            <p className="mt-1 text-base text-slate-600">🛠 DEV 預覽中（實際是「{PET_STAGES[realStage].name}」）</p>
          ) : toNext === null ? (
            <p className="mt-1 text-xl text-ink">🏆 {name} 已經是最厲害的羽球勇者犬了！</p>
          ) : (
            <p className="mt-1 text-xl text-ink">
              再升 <b className="font-game text-3xl text-violet-700">{toNext}</b> 級，{name} 就會長大！
            </p>
          )}
        </div>
      </section>

      {/* 身上的寶物 */}
      <section className="toon rounded-3xl bg-white p-4 text-ink">
        <h3 className="mb-2 text-xl">🎁 {name} 身上的寶物</h3>
        <ul className="grid grid-cols-3 gap-2 text-center text-base">
          {[
            { on: wear.wristband, icon: '🎽', label: '護腕' },
            { on: wear.shoes, icon: '👟', label: '球鞋' },
            { on: wear.scarf, icon: '🧣', label: '勇者毛巾' },
          ].map((w) => (
            <li key={w.label} className={`rounded-2xl px-2 py-2 ${w.on ? 'bg-lime-100' : 'bg-slate-100 text-slate-400'}`}>
              <div className={`text-3xl ${w.on ? '' : 'grayscale opacity-50'}`}>{w.icon}</div>
              {w.on ? `穿上${w.label}了！` : `拿到${w.label}就能穿`}
            </li>
          ))}
        </ul>
      </section>

      {/* 成長相簿 */}
      <section className="toon rounded-3xl bg-white p-4 text-ink">
        <h3 className="mb-2 text-xl">📷 成長相簿{albumAll && <span className="ml-2 text-sm text-slate-500">🛠 DEV：全部顯示，點一下預覽</span>}</h3>
        <div className="grid grid-cols-4 gap-2 sm:grid-cols-7">
          {PET_STAGES.map((s, i) => {
            const reached = i <= realStage || albumAll;
            const current = i === stage;
            const content = (
              <>
                <div className={reached ? '' : 'opacity-25 [filter:brightness(0)]'}>
                  <PuppyArt stage={i} growth={stageGrowth(i)} color={color} wear={wear} still className="mx-auto h-16 w-16 sm:h-20 sm:w-20" />
                </div>
                <div className="text-sm leading-tight">{reached ? s.name : '？？？'}</div>
                <div className="text-xs text-slate-500">{i === PET_MAX_STAGE ? 'Lv.25／畢業' : `Lv.${s.minLevel}`}</div>
              </>
            );
            const cls = `flex min-h-[64px] flex-col items-center rounded-2xl border-[3px] px-1 py-2 ${
              current ? 'border-ink bg-yellow-100' : 'border-slate-200 bg-slate-50'
            }`;
            return albumAll ? (
              <button key={s.key} type="button" className={cls} onClick={() => setPreview(i === realStage ? null : i)}>
                {content}
              </button>
            ) : (
              <div key={s.key} className={cls}>
                {content}
              </div>
            );
          })}
        </div>
      </section>

      <PetEditor open={editing} onClose={() => setEditing(false)} stage={Math.max(1, realStage)} />
    </div>
  );
}

/** 院子的背景：太陽、狗屋、草地上的花（純裝飾，畫在狗狗後面） */
function Yard() {
  return (
    <svg aria-hidden viewBox="0 0 400 300" preserveAspectRatio="xMidYMax slice" className="pointer-events-none absolute inset-0 h-full w-full">
      <circle cx={350} cy={40} r={26} fill="#FDE68A" stroke="#2b2350" strokeWidth={3} />
      <ellipse cx={80} cy={50} rx={34} ry={13} fill="#FFFFFF" opacity={0.9} />
      <ellipse cx={250} cy={30} rx={26} ry={10} fill="#FFFFFF" opacity={0.8} />
      <path d="M 0 230 Q 100 200 200 225 T 400 215 L 400 300 L 0 300 Z" fill="#86EFAC" />
      <path d="M 0 255 Q 120 235 240 252 T 400 245 L 400 300 L 0 300 Z" fill="#4ADE80" />
      {/* 狗屋 */}
      <g transform="translate(18 158)">
        <path d="M 0 40 L 40 4 L 80 40 Z" fill="#F87171" stroke="#2b2350" strokeWidth={3} strokeLinejoin="round" />
        <rect x={8} y={38} width={64} height={52} fill="#FBBF24" stroke="#2b2350" strokeWidth={3} />
        <path d="M 26 90 L 26 66 A 14 14 0 0 1 54 66 L 54 90 Z" fill="#78350F" stroke="#2b2350" strokeWidth={3} />
        <rect x={28} y={44} width={24} height={9} rx={4} fill="#FFFFFF" stroke="#2b2350" strokeWidth={2} />
      </g>
      {/* 小花 */}
      {[
        [330, 250, '#F472B6'],
        [365, 262, '#FDE047'],
        [130, 262, '#A78BFA'],
        [300, 275, '#FB7185'],
      ].map(([x, y, c], i) => (
        <g key={i}>
          <circle cx={x as number} cy={y as number} r={5} fill={c as string} stroke="#2b2350" strokeWidth={1.5} />
          <circle cx={x as number} cy={y as number} r={2} fill="#FFFFFF" />
        </g>
      ))}
    </svg>
  );
}

/** 幫狗狗取名字、選毛色 */
function PetEditor({ open, onClose, stage }: { open: boolean; onClose: () => void; stage: number }) {
  return (
    <Modal open={open} onClose={onClose} variant="sheet" title="✏️ 我的狗狗">
      {open && <PetEditorBody onClose={onClose} stage={stage} />}
    </Modal>
  );
}

function PetEditorBody({ onClose, stage }: { onClose: () => void; stage: number }) {
  const { player } = useReadyGame();
  const actions = useGameActions();
  const [name, setName] = useState(petNameOf(player));
  const [color, setColor] = useState<PetColor>(petColorOf(player));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const growth = useMemo(() => stageGrowth(stage), [stage]);

  const trimmed = name.trim();
  const tooLong = [...trimmed].length > PET_NAME_MAX_LENGTH;
  const changed = trimmed !== petNameOf(player) || color !== petColorOf(player);

  const save = async () => {
    setBusy(true);
    setError(null);
    try {
      await actions.updatePet({ name: trimmed, color });
      playSound('woof');
      onClose();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-5">
      <label className="block">
        <span className="mb-1 block text-xl font-black text-slate-600">狗狗的名字</span>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={PET_NAME_MAX_LENGTH * 2}
          placeholder="幫狗狗取個名字"
          className={`min-h-[72px] w-full rounded-2xl border-4 px-5 text-3xl font-black outline-none ${
            tooLong ? 'border-rose-300' : 'border-slate-200 focus:border-violet-400'
          }`}
        />
        <span className={`mt-1 block text-right text-base font-bold ${tooLong ? 'text-rose-500' : 'text-slate-400'}`}>
          {[...trimmed].length} / {PET_NAME_MAX_LENGTH}
        </span>
      </label>

      <div>
        <span className="mb-2 block text-xl font-black text-slate-600">選毛色</span>
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
          {PET_COLORS.map((c) => {
            const selected = c.id === color;
            return (
              <motion.button
                key={c.id}
                type="button"
                whileTap={{ scale: 0.92 }}
                onClick={() => {
                  playSound('tap');
                  setColor(c.id);
                }}
                aria-pressed={selected}
                className={`flex flex-col items-center rounded-2xl border-[3px] px-1 py-2 ${
                  selected ? 'border-ink bg-yellow-200 shadow-[0_4px_0_#2b2350]' : 'border-slate-200 bg-slate-50'
                }`}
              >
                <PuppyArt stage={stage} growth={growth} color={c.id} still className="h-20 w-20" />
                <span className="text-base">{c.label}</span>
              </motion.button>
            );
          })}
        </div>
      </div>

      {error && <p className="text-lg font-bold text-rose-600">{error}</p>}
      <Button size="lg" variant="success" block disabled={busy || !trimmed || tooLong || !changed} onClick={save}>
        {busy ? '…' : '好了！'}
      </Button>
    </div>
  );
}
