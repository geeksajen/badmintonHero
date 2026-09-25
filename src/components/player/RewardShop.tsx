import { motion } from 'framer-motion';
import { useState } from 'react';
import { canRedeem, effectiveRewards, redeemedThisWeek } from '../../engine/economy';
import { useGameActions } from '../../hooks/useGameActions';
import { useReadyGame } from '../../hooks/useGameState';
import { useHistory } from '../../hooks/useHistory';
import { playSound } from '../../lib/sound';
import type { RewardItem } from '../../types';
import { CoinCounter } from '../ui/CoinCounter';
import { ConfirmDialog, Modal } from '../ui/Modal';
import { Button } from '../ui/Button';

export function RewardShop() {
  const { player, curriculum } = useReadyGame();
  const actions = useGameActions();
  const orders = useHistory('orders', player.ordersRev ?? 0);
  const [picking, setPicking] = useState<RewardItem | null>(null);
  const [done, setDone] = useState<RewardItem | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const now = new Date();

  const items = effectiveRewards(curriculum.rewards, player);
  const normal = items.filter((r) => !r.isGrandPrize && r.isActive);
  const grand = items.filter((r) => r.isGrandPrize && r.isActive);

  const redeem = async () => {
    if (!picking) return;
    setBusy(true);
    setError(null);
    try {
      await actions.redeemReward({ itemId: picking.id });
      playSound('coin');
      setDone(picking);
      setPicking(null);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const card = (r: RewardItem) => {
    const check = canRedeem(player, r, now);
    const left = r.stockPerWeek !== undefined ? r.stockPerWeek - redeemedThisWeek(player, r.id, now) : undefined;
    return (
      <motion.button
        key={r.id}
        type="button"
        whileTap={{ scale: 0.95 }}
        onClick={() => {
          setError(null);
          setPicking(r);
        }}
        className={`flex min-h-[180px] flex-col items-center justify-between rounded-3xl p-4 text-center shadow-lg transition ${
          check.ok ? 'bg-white text-slate-800' : 'bg-white/60 text-slate-500 grayscale-[60%]'
        }`}
      >
        <span className="text-6xl">{r.icon}</span>
        <span className="text-lg font-black leading-tight">{r.title}</span>
        <span className="mt-1 rounded-full bg-amber-400 px-3 py-0.5 text-lg font-black text-amber-950">🪙 {r.cost}</span>
        {left !== undefined && <span className="mt-1 text-sm font-bold text-slate-500">這週還可以換 {Math.max(0, left)} 次</span>}
      </motion.button>
    );
  };

  const pickingCheck = picking ? canRedeem(player, picking, now) : null;
  const recent = orders.data.filter((o) => o.status !== 'cancelled').slice(0, 6);

  return (
    <div className="mx-auto max-w-3xl space-y-6 px-4 py-6">
      <div className="flex items-center justify-between rounded-3xl bg-gradient-to-r from-amber-300 to-orange-400 px-5 py-4 text-amber-950 shadow-lg">
        <span className="text-2xl font-black">🏪 勇者商店</span>
        <CoinCounter value={player.coins} className="text-3xl font-black" />
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">{normal.map(card)}</div>

      {/* 畢業大禮：獨立置底 ＋ 儲蓄進度條 */}
      {grand.map((r) => {
        const pct = Math.min(100, (player.coins / r.cost) * 100);
        return (
          <button
            key={r.id}
            type="button"
            onClick={() => setPicking(r)}
            className="w-full rounded-3xl bg-gradient-to-br from-violet-600 to-fuchsia-600 p-5 text-left text-white shadow-xl"
          >
            <div className="flex items-center gap-4">
              <span className="text-7xl">{r.icon}</span>
              <div className="flex-1">
                <div className="text-2xl font-black">{r.title}</div>
                <div className="text-base opacity-90">{r.description}</div>
              </div>
            </div>
            <div className="mt-4 h-7 overflow-hidden rounded-full bg-white/20">
              <motion.div
                className="flex h-full items-center justify-end rounded-full bg-gradient-to-r from-amber-300 to-yellow-200 pr-3 font-game font-extrabold text-amber-950"
                initial={false}
                animate={{ width: `${Math.max(pct, 8)}%` }}
              >
                {Math.floor(pct)}%
              </motion.div>
            </div>
            <div className="mt-2 text-right text-lg font-bold">
              🪙 {player.coins} / {r.cost}
            </div>
          </button>
        );
      })}

      {recent.length > 0 && (
        <div className="rounded-3xl bg-white/90 p-4 text-slate-800 shadow">
          <div className="mb-2 text-lg font-black">📦 我換過的獎品</div>
          <ul className="space-y-1 text-lg">
            {recent.map((o) => (
              <li key={o.id} className="flex items-center justify-between">
                <span>{o.rewardTitleSnapshot}</span>
                <span className={`font-bold ${o.status === 'fulfilled' ? 'text-emerald-600' : 'text-amber-600'}`}>
                  {o.status === 'fulfilled' ? '✅ 拿到了' : '⏳ 準備中'}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <ConfirmDialog
        open={!!picking}
        title={picking ? `${picking.icon} ${picking.title}` : ''}
        message={
          pickingCheck?.ok ? (
            <>
              要用 <b className="text-amber-600">{picking?.cost} 金幣</b> 換「{picking?.title}」嗎？
            </>
          ) : (
            <span className="font-bold">{pickingCheck?.ok === false ? pickingCheck.message : ''}，繼續加油！💪</span>
          )
        }
        confirmText="換！"
        busy={busy || !pickingCheck?.ok}
        onConfirm={redeem}
        onCancel={() => setPicking(null)}
      >
        {error && <p className="mb-2 text-lg font-bold text-rose-600">{error}</p>}
      </ConfirmDialog>

      <Modal open={!!done} onClose={() => setDone(null)}>
        <div className="flex flex-col items-center gap-3 text-center">
          <motion.span className="text-8xl" initial={{ rotate: -20, scale: 0 }} animate={{ rotate: 0, scale: 1 }}>
            {done?.icon}
          </motion.span>
          <div className="text-3xl font-black">兌換成功！</div>
          <div className="text-xl text-slate-600">等爸爸媽媽幫你準備「{done?.title}」喔！</div>
          <Button size="lg" block onClick={() => setDone(null)}>
            好耶！
          </Button>
        </div>
      </Modal>
    </div>
  );
}
