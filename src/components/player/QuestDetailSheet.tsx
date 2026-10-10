import { motion } from 'framer-motion';
import { Minus, Plus } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { TIER_LABEL, tierAmount, tierForCount } from '../../engine/tiers';
import { useGameActions } from '../../hooks/useGameActions';
import { progOf, useReadyGame } from '../../hooks/useGameState';
import { playSound } from '../../lib/sound';
import { TIER_ORDER, type QuestNode, type TierLevel } from '../../types';
import { Button } from '../ui/Button';
import { ConfirmDialog, Modal } from '../ui/Modal';
import { PetBuddy } from './PetBuddy';
import { SpeakButton } from './SpeakButton';
import { petNameOf, petStageIndex } from '../../engine/pet';
import { TierBar } from './TierBar';

const SAVE_DEBOUNCE_MS = 1500;

/** 朗讀時的目標句：下一面還沒拿到的獎牌要做到幾次 */
function goalSentence(node: QuestNode, awarded: TierLevel[]): string {
  const next = TIER_ORDER.find((t) => !awarded.includes(t));
  if (!next) return '。你已經拿到金牌了，好厲害！';
  return `。做到 ${node.tiers[next]} ${node.unit}，就能拿到${TIER_LABEL[next]}！`;
}

const CHEERS = ['加油加油！', '好厲害！', '繼續繼續！', '汪！你好棒！', '我在旁邊幫你數喔！'];

/** 狗狗夥伴按 ＋1 時說的話：跨過獎牌→恭喜；離下一面獎牌 3 下以內→倒數；其他→隨機加油 */
function cheerLine(node: QuestNode, count: number, crossed: TierLevel | undefined, name: string, sleeping: boolean, n: number): string {
  if (sleeping) return `${name} 在夢裡幫你加油！Zzz…`;
  if (crossed) return `${name}：哇！${count} ${node.unit}，拿到${TIER_LABEL[crossed]}的分數了！快跟教練說！`;
  const next = TIER_ORDER.map((t) => [t, node.tiers[t]] as const).find(([, th]) => count < th);
  if (next && next[1] - count <= 3) return `${name}：再 ${next[1] - count} ${node.unit}就到${TIER_LABEL[next[0]]}了！`;
  if (!next) return `${name}：${count} ${node.unit}！比金牌還多，太強了！`;
  return `${name}：${CHEERS[n % CHEERS.length]}`;
}

/** ＋1 的音調：越接近下一面獎牌越高（0.85 → 1.45），超過金牌後維持最高 */
function popRate(node: QuestNode, count: number): number {
  const next = TIER_ORDER.map((t) => node.tiers[t]).find((th) => count < th);
  if (next === undefined) return 1.45;
  const prev = TIER_ORDER.map((t) => node.tiers[t]).filter((th) => th <= count).pop() ?? 0;
  return 0.85 + 0.6 * ((count - prev) / (next - prev));
}

/**
 * 點節點後的底部面板。
 * ＋1 的次數先存在本地 state（畫面立即反應），1.5 秒 debounce 或關閉面板時才寫入一次（spec §6.2 額度注意）。
 */
export function QuestDetailSheet({ node, onClose }: { node: QuestNode | null; onClose: () => void }) {
  return (
    <Modal open={!!node} onClose={onClose} variant="sheet">
      {node && <SheetBody key={node.id} node={node} onClose={onClose} />}
    </Modal>
  );
}

function SheetBody({ node, onClose }: { node: QuestNode; onClose: () => void }) {
  const { progress, curriculum, player } = useReadyGame();
  const actions = useGameActions();
  const prog = progOf(progress, node.id);
  const chapter = curriculum.chapters.find((c) => c.id === node.chapterId);
  const reviewMode = !!player.graduatedAt;
  const waiting = !!prog.submittedAt;

  const [count, setCount] = useState(prog.currentCount);
  // 狗狗夥伴的加油：每按一次 ＋1 跳一下、說一句話
  const petName = petNameOf(player);
  const sleeping = petStageIndex(player.level, !!player.graduatedAt) === 0;
  const [cheer, setCheer] = useState({
    bump: 0,
    line: sleeping ? `${petName} 在夢裡幫你加油！Zzz…` : `${petName}：我們一起挑戰！我幫你數！`,
  });
  const [confirm, setConfirm] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const dirty = useRef(false);
  const countRef = useRef(count);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const flush = useCallback(() => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
    if (!dirty.current) return;
    dirty.current = false;
    void actions.saveCount(node.id, countRef.current);
  }, [actions, node.id]);

  // 關閉面板（unmount）時把未寫入的次數寫出去
  const flushRef = useRef(flush);
  flushRef.current = flush;
  useEffect(() => {
    const f = flushRef;
    return () => f.current();
  }, []);

  // 另一台裝置（家長核可／再練一次）改了 currentCount，且本機沒有未寫入的變更 → 同步
  useEffect(() => {
    if (!dirty.current) {
      setCount(prog.currentCount);
      countRef.current = prog.currentCount;
    }
  }, [prog.currentCount]);

  const change = (delta: number) => {
    const next = Math.max(0, countRef.current + delta);
    const before = tierForCount(node, countRef.current);
    const after = tierForCount(node, next);
    countRef.current = next;
    setCount(next);
    dirty.current = true;
    if (delta > 0 && after && after !== before) playSound('medal');
    else if (delta > 0) playSound('pop', { rate: popRate(node, next) });
    else playSound('tap', { rate: 0.8 });
    if (delta > 0) {
      setCheer((c) => ({
        bump: c.bump + 1,
        line: cheerLine(node, next, after && after !== before ? after : undefined, petName, sleeping, c.bump + 1),
      }));
    }
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(flush, SAVE_DEBOUNCE_MS);
  };

  const submit = async () => {
    setBusy(true);
    setError(null);
    try {
      if (timer.current) clearTimeout(timer.current);
      dirty.current = false; // submit 會一併寫入 currentCount
      await actions.submitQuest({ nodeId: node.id, count: countRef.current });
      playSound('unlock');
      setConfirm(false);
      onClose();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const remaining = TIER_ORDER.filter((t) => !prog.tiersAwarded.includes(t));
  const expLeft = remaining.reduce((s, t) => s + tierAmount(node.rewardExp, t, curriculum.tierRatio), 0);
  const coinsLeft = remaining.reduce((s, t) => s + tierAmount(node.rewardCoins, t, curriculum.tierRatio), 0);
  const eqs = (node.rewardEquipmentIds ?? []).map((id) => curriculum.equipments.find((e) => e.id === id)).filter(Boolean);
  const title = node.rewardTitleId ? curriculum.titles.find((t) => t.id === node.rewardTitleId) : undefined;
  const canPlay = !reviewMode && prog.status !== 'locked' && !waiting;

  return (
    <div className="space-y-5">
      <div>
        <div className="mb-2 flex flex-wrap items-center gap-2">
          <span className={`toon-sm inline-flex items-center gap-1 rounded-full bg-gradient-to-r ${chapter?.theme ?? ''} px-3 py-1 text-base text-white`}>
            {chapter?.icon} {chapter?.name}
          </span>
          {node.isBoss && (
            <span className="toon-sm inline-flex animate-wiggle items-center rounded-full bg-rose-400 px-3 py-1 text-base text-white">
              👑 魔王關
            </span>
          )}
        </div>
        <h2 className="text-[28px] leading-tight text-ink sm:text-4xl">{node.title}</h2>
        <div className="mt-2 flex items-center gap-2 rounded-2xl bg-sky-50 py-2 pl-4 pr-2">
          <p className="flex-1 text-xl leading-relaxed text-slate-700">💬 {node.description}</p>
          <SpeakButton text={`${node.title}。${node.description}${goalSentence(node, prog.tiersAwarded)}`} />
        </div>
      </div>

      <TierBar node={node} prog={prog} count={count} />

      {prog.coachFeedback && (
        <div className="toon-sm relative flex items-center gap-2 rounded-2xl bg-violet-100 py-2 pl-4 pr-2 text-lg text-violet-900">
          <p className="flex-1">
            <span>🗣️ 教練說：</span>
            {prog.coachFeedback}
          </p>
          <SpeakButton text={`教練說：${prog.coachFeedback}`} label="念教練的話" />
        </div>
      )}

      {/* 狗狗夥伴在旁邊加油 */}
      {canPlay && <PetBuddy line={cheer.line} bump={cheer.bump} />}

      {/* 計數區 */}
      <div className="toon dots relative flex items-center justify-between gap-3 rounded-3xl bg-gradient-to-br from-indigo-500 via-violet-500 to-fuchsia-500 px-4 py-4 text-white">
        <div>
          <div className="text-base font-bold text-white/80">這次</div>
          <motion.div
            key={count}
            initial={{ scale: 1.3 }}
            animate={{ scale: 1 }}
            className="font-game text-6xl font-extrabold tabular-nums drop-shadow-[0_3px_0_rgba(43,35,80,0.5)]"
          >
            {count}
            <span className="ml-1 text-2xl">{node.unit}</span>
          </motion.div>
          <div className="text-base font-bold text-white/80">
            最好成績 {prog.bestCount} {node.unit}
          </div>
        </div>
        {canPlay && (
          <div className="flex items-center gap-2">
            <button
              type="button"
              aria-label="減一"
              onClick={() => change(-1)}
              disabled={count === 0}
              className="toon-sm flex h-16 w-16 items-center justify-center rounded-2xl bg-white/90 text-ink disabled:opacity-40"
            >
              <Minus size={30} />
            </button>
            <motion.button
              type="button"
              aria-label="加一"
              whileTap={{ scale: 0.88 }}
              onClick={() => change(1)}
              className="relative flex h-28 w-28 flex-col items-center justify-center overflow-hidden rounded-full border-[3px] border-ink bg-gradient-to-br from-lime-200 via-lime-300 to-emerald-500 text-ink shadow-[0_7px_0_#2b2350] active:translate-y-1 active:shadow-[0_3px_0_#2b2350]"
            >
              <span aria-hidden className="pointer-events-none absolute left-4 top-3 h-5 w-9 -rotate-12 rounded-full bg-white/60" />
              <Plus size={44} strokeWidth={4} />
              <span className="font-game text-2xl font-extrabold">＋1</span>
            </motion.button>
          </div>
        )}
      </div>

      {waiting && !reviewMode && (
        <div className="toon-sm animate-breathe rounded-2xl bg-amber-100 px-4 py-4 text-center text-xl text-amber-900">
          ⏳ 等教練確認中…
        </div>
      )}

      {canPlay && (
        <Button variant="gold" size="lg" block className="toon" disabled={count === 0} onClick={() => setConfirm(true)}>
          🙋 我做到了！
        </Button>
      )}

      {/* 獎勵預覽 */}
      <div className="rounded-2xl border-[3px] border-dashed border-amber-300 bg-amber-50 px-4 py-3">
        <div className="mb-1 text-base text-amber-900">🎁 還可以拿到</div>
        <div className="flex flex-wrap items-center gap-2 text-lg text-amber-950 [&>span]:rounded-full [&>span]:bg-white [&>span]:px-3 [&>span]:py-0.5 [&>span]:shadow-sm">
          {expLeft > 0 || coinsLeft > 0 ? (
            <>
              <span>✨ {expLeft} EXP</span>
              <span>🪙 {coinsLeft} 金幣</span>
            </>
          ) : (
            <span>全部拿到了！🥇</span>
          )}
          {prog.status !== 'completed' &&
            eqs.map((e) => (
              <span key={e!.id}>
                {e!.icon} {e!.name}
              </span>
            ))}
          {prog.status !== 'completed' && title && <span>🏷️ 稱號「{title.name}」</span>}
        </div>
      </div>

      <ConfirmDialog
        open={confirm}
        title="要跟教練說嗎？"
        message={
          <>
            你這次做到了 <b className="text-3xl text-violet-700">{count}</b> {node.unit}！<br />
            要請教練確認嗎？
          </>
        }
        confirmText="好！"
        busy={busy}
        onConfirm={submit}
        onCancel={() => setConfirm(false)}
      >
        {error && <p className="mb-2 text-lg font-bold text-rose-600">{error}</p>}
      </ConfirmDialog>
    </div>
  );
}
