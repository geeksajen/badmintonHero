import { motion } from 'framer-motion';
import { useState } from 'react';
import { canRedeem, effectiveRewards, redeemedThisWeek } from '../../engine/economy';
import { PET_FOODS, petNameOf, type PetFood } from '../../engine/pet';
import { useGameActions } from '../../hooks/useGameActions';
import { useReadyGame } from '../../hooks/useGameState';
import { useHistory } from '../../hooks/useHistory';
import { playSound } from '../../lib/sound';
import type { RewardItem } from '../../types';
import { CoinCounter } from '../ui/CoinCounter';
import { ConfirmDialog, Modal } from '../ui/Modal';
import { Button } from '../ui/Button';

/** 商品卡片輪流使用的糖果色 */
const CARD_COLORS = ['bg-pink-200', 'bg-sky-200', 'bg-lime-200', 'bg-yellow-200', 'bg-violet-200', 'bg-orange-200', 'bg-teal-200'];

export function RewardShop() {
  const { player, curriculum } = useReadyGame();
  const actions = useGameActions();
  const orders = useHistory('orders', player.ordersRev ?? 0);
  const [picking, setPicking] = useState<RewardItem | null>(null);
  const [done, setDone] = useState<RewardItem | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [buyingFood, setBuyingFood] = useState<PetFood | null>(null);
  const [foodError, setFoodError] = useState<string | null>(null);
  const now = new Date();

  const items = effectiveRewards(curriculum.rewards, player);
  const normal = items.filter((r) => !r.isGrandPrize && r.isActive && r.category !== 'stationery');
  const stationery = items.filter((r) => r.isActive && r.category === 'stationery');
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

  const card = (r: RewardItem, i: number) => {
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
        className={`toon toon-press relative flex min-h-[190px] flex-col items-center justify-between rounded-3xl p-4 text-center text-ink transition ${
          check.ok ? CARD_COLORS[i % CARD_COLORS.length] : 'bg-slate-100 opacity-80 grayscale-[70%]'
        }`}
      >
        <span className={`text-6xl drop-shadow-[0_3px_0_rgba(43,35,80,0.25)] ${check.ok ? 'animate-float' : ''}`} style={{ animationDelay: `${-i * 0.7}s` }}>
          {r.icon}
        </span>
        <span className="text-lg leading-tight">{r.title}</span>
        <span className="toon-sm mt-1 -rotate-3 rounded-full bg-yellow-300 px-3 py-0.5 font-game text-xl font-extrabold text-amber-950">
          🪙 {r.cost}
        </span>
        {left !== undefined && <span className="mt-1 text-sm text-slate-600">這週還可以換 {Math.max(0, left)} 次</span>}
        {r.id === player.savingsGoalId && (
          <>
            <span className="toon-sm absolute -left-2 -top-2 rotate-[-8deg] rounded-full bg-rose-400 px-2 py-0.5 text-sm text-white">
              📌 目標
            </span>
            {player.coins < r.cost && <span className="mt-1 text-sm font-bold text-rose-600">還差 {r.cost - player.coins} 🪙</span>}
          </>
        )}
      </motion.button>
    );
  };

  const pickingCheck = picking ? canRedeem(player, picking, now) : null;
  const recent = orders.data.filter((o) => o.status !== 'cancelled').slice(0, 6);

  return (
    <div className="mx-auto max-w-3xl space-y-6 px-4 py-6">
      <div className="toon dots relative flex items-center justify-between overflow-hidden rounded-3xl bg-gradient-to-r from-amber-300 via-orange-300 to-pink-300 px-5 py-4 text-ink">
        <span className="flex items-center gap-2 text-3xl">
          <span className="animate-wiggle">🏪</span> 勇者商店
        </span>
        <span className="toon-sm rounded-full bg-white px-3 py-1">
          <CoinCounter value={player.coins} className="font-game text-3xl font-extrabold text-amber-950" />
        </span>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">{normal.map(card)}</div>

      {/* 狗狗點心：立即放進點心盒，不需要爸媽準備 */}
      <section>
        <h3 className="mb-1 flex items-center gap-2 text-2xl text-ink">
          <span className="animate-wiggle">🦴</span> 狗狗點心區
        </h3>
        <p className="mb-3 text-base text-slate-600">買了馬上放進點心盒，到「夥伴」餵 {petNameOf(player)} 吃！</p>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {PET_FOODS.map((f) => {
            const ok = player.coins >= f.cost;
            const have = player.petFood?.[f.id] ?? 0;
            return (
              <motion.button
                key={f.id}
                type="button"
                whileTap={{ scale: 0.95 }}
                onClick={() => {
                  setFoodError(null);
                  setBuyingFood(f);
                }}
                className={`toon toon-press flex min-h-[150px] flex-col items-center justify-between rounded-3xl p-3 text-center text-ink ${
                  ok ? 'bg-orange-100' : 'bg-slate-100 opacity-80 grayscale-[70%]'
                }`}
              >
                <span className="text-5xl">{f.icon}</span>
                <span className="text-lg leading-tight">{f.name}</span>
                <span className="toon-sm -rotate-3 rounded-full bg-yellow-300 px-3 py-0.5 font-game text-lg font-extrabold text-amber-950">🪙 {f.cost}</span>
                <span className="text-sm text-slate-600">點心盒裡有 {have} 個</span>
              </motion.button>
            );
          })}
        </div>
      </section>

      {stationery.length > 0 && (
        <section>
          <h3 className="mb-3 flex items-center gap-2 text-2xl text-ink">
            <span className="animate-wiggle">✏️</span> 文具區
          </h3>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {stationery.map((r, i) => card(r, i + normal.length))}
          </div>
        </section>
      )}

      {/* 畢業大禮：獨立置底 ＋ 儲蓄進度條 */}
      {grand.map((r) => {
        const pct = Math.min(100, (player.coins / r.cost) * 100);
        return (
          <button
            key={r.id}
            type="button"
            onClick={() => setPicking(r)}
            className="toon toon-press dots relative w-full overflow-hidden rounded-3xl bg-gradient-to-br from-violet-500 via-fuchsia-500 to-pink-500 p-5 text-left text-white"
          >
            <span aria-hidden className="pointer-events-none absolute inset-y-0 left-0 w-1/4 animate-shine bg-white/25" />
            <span aria-hidden className="absolute right-4 top-3 animate-float text-2xl">✨</span>
            <div className="relative flex items-center gap-4">
              <span className="animate-wiggle text-7xl drop-shadow-[0_4px_0_rgba(43,35,80,0.35)]">{r.icon}</span>
              <div className="flex-1">
                <div className="text-2xl">
                  {r.title}
                  {r.id === player.savingsGoalId && (
                    <span className="toon-sm ml-2 inline-block rotate-[-6deg] rounded-full bg-rose-400 px-2 py-0.5 align-middle text-sm">📌 目標</span>
                  )}
                </div>
                <div className="text-base opacity-90">{r.description}</div>
              </div>
            </div>
            <div className="toon-sm relative mt-4 h-9 overflow-hidden rounded-full bg-white/30">
              <motion.div
                className="stripe-fill flex h-full animate-stripes items-center justify-end rounded-full bg-gradient-to-r from-yellow-300 to-amber-300 pr-3 font-game font-extrabold text-amber-950"
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
        <div className="toon rounded-3xl bg-white p-4 text-ink">
          <div className="mb-2 text-xl">📦 我換過的獎品</div>
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
        {picking && (
          <Button
            variant="secondary"
            block
            className="mb-3"
            disabled={busy}
            onClick={async () => {
              const pin = player.savingsGoalId !== picking.id;
              try {
                await actions.setSavingsGoal({ itemId: pin ? picking.id : null });
                playSound(pin ? 'unlock' : 'tap');
                setPicking(null);
              } catch (e) {
                setError((e as Error).message);
              }
            }}
          >
            {player.savingsGoalId === picking.id ? '📌 取消存錢目標' : '📌 設成我的存錢目標'}
          </Button>
        )}
      </ConfirmDialog>

      <ConfirmDialog
        open={!!buyingFood}
        title={buyingFood ? `${buyingFood.icon} ${buyingFood.name}` : ''}
        message={
          buyingFood && player.coins >= buyingFood.cost ? (
            <>
              要用 <b className="text-amber-600">{buyingFood.cost} 金幣</b> 買「{buyingFood.name}」給 {petNameOf(player)} 嗎？
            </>
          ) : (
            <span className="font-bold">還差 {buyingFood ? buyingFood.cost - player.coins : 0} 金幣，繼續加油！💪</span>
          )
        }
        confirmText="買！"
        busy={busy || !buyingFood || player.coins < buyingFood.cost}
        onConfirm={async () => {
          if (!buyingFood) return;
          setBusy(true);
          setFoodError(null);
          try {
            await actions.buyPetFood({ foodId: buyingFood.id });
            playSound('coin');
            setBuyingFood(null);
          } catch (e) {
            setFoodError((e as Error).message);
          } finally {
            setBusy(false);
          }
        }}
        onCancel={() => setBuyingFood(null)}
      >
        {foodError && <p className="mb-2 text-lg font-bold text-rose-600">{foodError}</p>}
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
