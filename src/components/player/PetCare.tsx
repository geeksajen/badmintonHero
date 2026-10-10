import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { useEffect, useRef, useState, type PointerEvent } from 'react';
import {
  PET_FOODS,
  PET_UNLOCKS,
  nextUnlock,
  petCareStatus,
  petNameOf,
  unlockedAccessories,
  unlocksAt,
  type PetAccessory,
  type PetFood,
  type PetUnlock,
} from '../../engine/pet';
import { toDateStr } from '../../engine/util';
import { useGameActions } from '../../hooks/useGameActions';
import { useReadyGame } from '../../hooks/useGameState';
import { playSound } from '../../lib/sound';
import { Button } from '../ui/Button';
import { Modal } from '../ui/Modal';
import { PuppyArt, type PuppyArtProps } from './PuppyArt';

const ACCESSORY_ICON: Record<PetAccessory, string> = { bow: '🎀', cap: '🧢', sunglasses: '🕶️', crown: '👑' };

function waitText(until: Date, now: Date): string {
  const mins = Math.max(1, Math.ceil((until.getTime() - now.getTime()) / 60000));
  return mins >= 60 ? `${Math.ceil(mins / 60)} 小時後` : `${mins} 分鐘後`;
}

/**
 * 夥伴分頁的照顧區：💗 親密度（只增不減）、餵點心、洗澡、配飾、學會的把戲。
 * 不照顧什麼事都不會發生；吃飽了、洗過了都只是友善提示（spec §8.1）。
 */
export function PetCareSection({
  art,
  onFed,
  onBathed,
  onGoShop,
}: {
  /** 目前狗狗的外型（洗澡小遊戲用） */
  art: Omit<PuppyArtProps, 'className'>;
  onFed: (food: PetFood, unlocked: PetUnlock[]) => void;
  onBathed: (unlocked: PetUnlock[]) => void;
  onGoShop: () => void;
}) {
  const { player } = useReadyGame();
  const actions = useGameActions();
  const [feeding, setFeeding] = useState(false);
  const [bathing, setBathing] = useState(false);
  const name = petNameOf(player);
  const affection = player.petAffection ?? 0;
  const now = new Date();
  const status = petCareStatus(player, now, toDateStr(now));
  const next = nextUnlock(affection);
  const accessories = unlockedAccessories(affection);
  const tricks = unlocksAt(affection).filter((u) => u.kind === 'trick');

  const feedHint =
    status.mealsLeft === 0
      ? `今天吃飽飽了，明天再吃！`
      : status.nextMealAt
        ? `還飽飽的，${waitText(status.nextMealAt, now)}可以再吃`
        : `今天還可以吃 ${status.mealsLeft} 次`;

  return (
    <section className="toon rounded-3xl bg-white p-4 text-ink">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-xl">💗 跟 {name} 的感情</h3>
        <span className="toon-sm rounded-full bg-pink-100 px-3 py-1 font-game text-xl font-extrabold text-pink-700">💗 {affection}</span>
      </div>
      <p className="mb-3 text-base text-slate-600">
        {next
          ? `再 ${next.hearts - affection} 顆 💗，${name} 就會${next.kind === 'trick' ? `學會「${next.name}」` : `得到「${next.name}」`}！`
          : `${name} 的把戲和配飾全部都拿到了！`}
      </p>

      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={() => setFeeding(true)}
          className="toon-sm toon-press flex min-h-[88px] flex-col items-center justify-center rounded-3xl bg-orange-200 px-2 py-2"
        >
          <span className="text-3xl">🍖</span>
          <span className="text-lg">餵點心</span>
          <span className="text-xs text-slate-600">{feedHint}</span>
        </button>
        <button
          type="button"
          disabled={!status.canBathe}
          onClick={() => setBathing(true)}
          className="toon-sm toon-press flex min-h-[88px] flex-col items-center justify-center rounded-3xl bg-sky-200 px-2 py-2 disabled:opacity-60"
        >
          <span className="text-3xl">🛁</span>
          <span className="text-lg">洗澡</span>
          <span className="text-xs text-slate-600">{status.canBathe ? '一天可以洗一次' : '今天洗過了，香香的！'}</span>
        </button>
      </div>

      {accessories.length > 0 && <AccessoryPicker accessories={accessories} />}

      {tricks.length > 0 && (
        <div className="mt-3">
          <div className="text-base text-slate-600">🎪 學會的把戲（點狗狗有機會表演）</div>
          <div className="mt-1 flex flex-wrap gap-1.5">
            {tricks.map((t) => (
              <span key={t.id} className="rounded-full bg-violet-100 px-3 py-1 text-base text-violet-800">
                {t.name}
              </span>
            ))}
          </div>
        </div>
      )}

      <FeedSheet
        open={feeding}
        onClose={() => setFeeding(false)}
        onGoShop={() => {
          setFeeding(false);
          onGoShop();
        }}
        onFed={async (food) => {
          const before = player.petAffection ?? 0;
          const r = await actions.feedPet({ foodId: food.id });
          setFeeding(false);
          onFed(food, newUnlocksBetween(before, r.player.petAffection ?? before));
        }}
      />
      <BathGame
        open={bathing}
        art={art}
        name={name}
        onClose={() => setBathing(false)}
        onBathe={async () => {
          const before = player.petAffection ?? 0;
          const r = await actions.bathePet();
          return newUnlocksBetween(before, r.player.petAffection ?? before);
        }}
        onDone={(unlocked) => {
          setBathing(false);
          onBathed(unlocked);
        }}
      />
    </section>
  );
}

function newUnlocksBetween(before: number, after: number): PetUnlock[] {
  return PET_UNLOCKS.filter((u) => u.hearts > before && u.hearts <= after);
}

function AccessoryPicker({ accessories }: { accessories: PetAccessory[] }) {
  const { player } = useReadyGame();
  const actions = useGameActions();
  const current = player.petAccessory;
  const pick = (id: PetAccessory | null) => {
    playSound('tap');
    void actions.setPetAccessory({ id });
  };
  const label = (id: PetAccessory) => PET_UNLOCKS.find((u) => u.id === id)?.name ?? id;
  return (
    <div className="mt-3">
      <div className="text-base text-slate-600">✨ 幫狗狗打扮</div>
      <div className="mt-1 flex flex-wrap gap-1.5">
        <button
          type="button"
          onClick={() => pick(null)}
          className={`min-h-[48px] rounded-2xl border-[3px] px-3 text-base ${!current ? 'border-ink bg-yellow-200' : 'border-slate-200 bg-slate-50'}`}
        >
          不戴
        </button>
        {accessories.map((id) => (
          <button
            key={id}
            type="button"
            onClick={() => pick(id)}
            className={`min-h-[48px] rounded-2xl border-[3px] px-3 text-base ${current === id ? 'border-ink bg-yellow-200' : 'border-slate-200 bg-slate-50'}`}
          >
            {ACCESSORY_ICON[id]} {label(id)}
          </button>
        ))}
      </div>
    </div>
  );
}

/** 選點心餵狗狗；點心盒是空的就帶去商店 */
function FeedSheet({
  open,
  onClose,
  onFed,
  onGoShop,
}: {
  open: boolean;
  onClose: () => void;
  onFed: (food: PetFood) => Promise<void>;
  onGoShop: () => void;
}) {
  const { player } = useReadyGame();
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const box = player.petFood ?? {};
  const any = PET_FOODS.some((f) => (box[f.id] ?? 0) > 0);
  const name = petNameOf(player);
  const now = new Date();
  const status = petCareStatus(player, now, toDateStr(now));
  const blocked =
    status.mealsLeft === 0
      ? `${name} 今天吃飽飽了，明天再一起吃！`
      : status.nextMealAt
        ? `${name} 還飽飽的，${waitText(status.nextMealAt, now)}再來餵喔！`
        : null;

  useEffect(() => {
    if (open) setError(null);
  }, [open]);

  return (
    <Modal open={open} onClose={onClose} variant="sheet" title="🍖 餵點心">
      <div className="space-y-4">
        {blocked ? (
          <p className="rounded-2xl bg-amber-50 px-4 py-3 text-xl text-amber-900">😋 {blocked}</p>
        ) : !any ? (
          <div className="space-y-3 text-center">
            <p className="text-xl text-ink">點心盒是空的～</p>
            <Button size="lg" variant="gold" block onClick={onGoShop}>
              🏪 去商店買點心
            </Button>
          </div>
        ) : (
          <p className="text-lg text-slate-600">要給 {name} 吃什麼呢？</p>
        )}

        <div className="grid grid-cols-2 gap-2">
          {PET_FOODS.map((f) => {
            const have = box[f.id] ?? 0;
            return (
              <motion.button
                key={f.id}
                type="button"
                whileTap={{ scale: 0.94 }}
                disabled={busy || have === 0 || !!blocked}
                onClick={async () => {
                  setBusy(true);
                  setError(null);
                  try {
                    await onFed(f);
                  } catch (e) {
                    setError((e as Error).message);
                  } finally {
                    setBusy(false);
                  }
                }}
                className="toon-sm flex min-h-[96px] flex-col items-center justify-center rounded-3xl bg-orange-100 px-2 py-2 text-ink disabled:opacity-40"
              >
                <span className="text-4xl">{f.icon}</span>
                <span className="text-lg">{f.name}</span>
                <span className="text-sm text-slate-600">點心盒裡有 {have} 個</span>
              </motion.button>
            );
          })}
        </div>
        {error && <p className="text-lg font-bold text-rose-600">{error}</p>}
        {any && !blocked && (
          <button type="button" onClick={onGoShop} className="mx-auto block min-h-[48px] text-lg text-violet-700 underline">
            🏪 去商店買更多點心
          </button>
        )}
      </div>
    </Modal>
  );
}

interface Bubble {
  id: number;
  x: number;
  y: number;
  r: number;
}

/** 洗澡小遊戲：用手指在狗狗身上搓出泡泡 → 沖水 → 甩甩 → 亮晶晶 */
function BathGame({
  open,
  art,
  name,
  onClose,
  onBathe,
  onDone,
}: {
  open: boolean;
  art: Omit<PuppyArtProps, 'className'>;
  name: string;
  onClose: () => void;
  onBathe: () => Promise<PetUnlock[]>;
  onDone: (unlocked: PetUnlock[]) => void;
}) {
  return (
    <Modal open={open} onClose={onClose} variant="sheet" title={`🛁 幫 ${name} 洗澡`}>
      {open && <BathBody art={art} name={name} onBathe={onBathe} onDone={onDone} />}
    </Modal>
  );
}

const SCRUB_NEEDED = 2200; // 搓多長的距離（px）泡泡才會滿

function BathBody({
  art,
  name,
  onBathe,
  onDone,
}: {
  art: Omit<PuppyArtProps, 'className'>;
  name: string;
  onBathe: () => Promise<PetUnlock[]>;
  onDone: (unlocked: PetUnlock[]) => void;
}) {
  const reduce = !!useReducedMotion();
  const [phase, setPhase] = useState<'scrub' | 'rinse' | 'shake' | 'done'>('scrub');
  const [bubbles, setBubbles] = useState<Bubble[]>([]);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [unlocked, setUnlocked] = useState<PetUnlock[]>([]);
  const area = useRef<HTMLDivElement>(null);
  const last = useRef<{ x: number; y: number } | null>(null);
  const dist = useRef(0);
  const sinceSound = useRef(0);
  const nextId = useRef(0);
  const finished = useRef(false);

  const addBubble = (x: number, y: number) => {
    const id = nextId.current++;
    setBubbles((b) => [...b.slice(-45), { id, x, y, r: 14 + ((id * 37) % 18) }]);
  };

  const onMove = (e: PointerEvent<HTMLDivElement>) => {
    if (phase !== 'scrub' || !area.current) return;
    if (e.pointerType === 'mouse' && e.buttons === 0) return;
    const rect = area.current.getBoundingClientRect();
    const p = { x: e.clientX - rect.left, y: e.clientY - rect.top };
    if (last.current) {
      const d = Math.hypot(p.x - last.current.x, p.y - last.current.y);
      dist.current += d;
      sinceSound.current += d;
      if (sinceSound.current > 70) {
        sinceSound.current = 0;
        addBubble(p.x, p.y);
        playSound('pop', { rate: 1.3 + Math.random() * 0.5 });
      }
      const pr = Math.min(1, dist.current / SCRUB_NEEDED);
      setProgress(pr);
      if (pr >= 1) void finishScrub();
    }
    last.current = p;
  };

  const finishScrub = async () => {
    // 同一輪 render 內可能連續收到好幾個 pointermove，用 ref 確保只結算一次
    if (finished.current) return;
    finished.current = true;
    setPhase('rinse');
    playSound('unlock');
    try {
      const u = await onBathe();
      setUnlocked(u);
    } catch (e) {
      setError((e as Error).message);
    }
  };

  // 沖水 → 甩甩 → 完成
  useEffect(() => {
    if (phase === 'rinse') {
      const t = setTimeout(() => {
        setBubbles([]);
        setPhase('shake');
      }, 1300);
      return () => clearTimeout(t);
    }
    if (phase === 'shake') {
      const t = setTimeout(() => {
        setPhase('done');
        playSound('medal');
      }, 900);
      return () => clearTimeout(t);
    }
  }, [phase]);

  const tip =
    phase === 'scrub'
      ? progress === 0
        ? `用手指在 ${name} 身上搓一搓，搓出泡泡！`
        : '搓搓搓～泡泡越來越多了！'
      : phase === 'rinse'
        ? '沖沖水～嘩啦嘩啦！'
        : phase === 'shake'
          ? `${name} 甩甩身體！`
          : `洗好了！${name} 香香的～`;

  return (
    <div className="space-y-3">
      <p className="text-center text-xl text-ink">{tip}</p>
      <div
        ref={area}
        onPointerDown={(e) => {
          last.current = null;
          onMove(e);
        }}
        onPointerMove={onMove}
        onPointerUp={() => (last.current = null)}
        className="relative mx-auto h-72 w-full max-w-sm touch-none select-none overflow-hidden rounded-[2rem] border-[3px] border-ink bg-gradient-to-b from-sky-100 to-cyan-200"
      >
        {/* 浴缸 */}
        <div className="absolute inset-x-6 bottom-0 h-16 rounded-t-[2rem] border-[3px] border-b-0 border-ink bg-white/80" />
        <motion.div
          className="absolute inset-x-0 bottom-4 flex justify-center"
          animate={
            reduce
              ? undefined
              : phase === 'shake'
                ? { rotate: [0, -10, 10, -8, 8, 0] }
                : phase === 'done'
                  ? { y: [0, -16, 0] }
                  : undefined
          }
          transition={{ duration: phase === 'shake' ? 0.8 : 0.6 }}
        >
          <PuppyArt {...art} happy={phase === 'done'} className="h-60 w-60" />
        </motion.div>

        {/* 泡泡 */}
        <AnimatePresence>
          {bubbles.map((b) => (
            <motion.span
              key={b.id}
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 0.9 }}
              exit={{ opacity: 0, y: 40 }}
              className="pointer-events-none absolute rounded-full border-2 border-white bg-white/60 shadow-[inset_-3px_-3px_0_rgba(125,211,252,0.6)]"
              style={{ left: b.x - b.r, top: b.y - b.r, width: b.r * 2, height: b.r * 2 }}
            />
          ))}
        </AnimatePresence>

        {/* 沖水的水滴 */}
        {phase === 'rinse' &&
          Array.from({ length: 14 }, (_, i) => (
            <motion.span
              key={i}
              className="pointer-events-none absolute top-0 h-5 w-2 rounded-full bg-sky-400"
              style={{ left: `${8 + i * 6.5}%` }}
              initial={{ y: -20, opacity: 0 }}
              animate={{ y: 300, opacity: [0, 1, 1, 0] }}
              transition={{ duration: 0.9, delay: (i % 5) * 0.08, repeat: 1 }}
            />
          ))}

        {/* 亮晶晶 */}
        {phase === 'done' &&
          ['12%,20%', '80%,18%', '20%,60%', '78%,55%', '50%,8%'].map((pos, i) => {
            const [left, top] = pos.split(',');
            return (
              <motion.span
                key={i}
                className="pointer-events-none absolute text-3xl"
                style={{ left, top }}
                initial={{ scale: 0 }}
                animate={{ scale: [0, 1.3, 1] }}
                transition={{ delay: i * 0.1 }}
              >
                ✨
              </motion.span>
            );
          })}
      </div>

      {phase === 'scrub' && (
        <div className="toon-sm relative mx-auto h-6 max-w-sm overflow-hidden rounded-full bg-sky-100">
          <div className="h-full rounded-full bg-gradient-to-r from-sky-300 to-cyan-400 transition-[width]" style={{ width: `${progress * 100}%` }} />
          <span className="absolute inset-0 flex items-center justify-center text-sm text-ink">🫧 泡泡</span>
        </div>
      )}
      {error && <p className="text-center text-lg font-bold text-rose-600">{error}</p>}
      {phase === 'done' && (
        <Button size="lg" variant="success" block onClick={() => onDone(unlocked)}>
          好香！💗 +1
        </Button>
      )}
    </div>
  );
}
