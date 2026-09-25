import { useState } from 'react';
import { effectiveRewards } from '../../engine/economy';
import { useGameActions } from '../../hooks/useGameActions';
import { useReadyGame } from '../../hooks/useGameState';
import { Card } from '../ui/Card';
import { useRun } from './useRun';

/**
 * 商店管理：商品目錄寫死在 src/data/curricula/<pack>/rewards.ts（讀取成本 0），
 * 這裡只做臨時上下架／臨時改價，覆寫值存在 players/{id}.shopOverrides。
 */
export function ShopManager() {
  const { player, curriculum } = useReadyGame();
  const actions = useGameActions();
  const { busy, run } = useRun();
  const [prices, setPrices] = useState<Record<string, string>>({});
  const items = effectiveRewards(curriculum.rewards, player);
  const ov = player.shopOverrides ?? {};

  return (
    <Card id="shop" title="商店管理" icon="🏪">
      <p className="mb-3 text-sm text-slate-500">
        永久調整請改 <code>src/data/curricula/{curriculum.id}/rewards.ts</code> 後重新部署；這裡是臨時覆寫。
      </p>
      <div className="space-y-2">
        {items.map((r) => {
          const base = curriculum.rewards.find((x) => x.id === r.id)!;
          const overridden = !!ov[r.id];
          return (
            <div key={r.id} className="flex flex-wrap items-center gap-2 rounded-2xl bg-slate-50 p-2">
              <span className="text-3xl">{r.icon}</span>
              <span className={`min-w-0 flex-1 text-lg font-bold ${r.isActive ? '' : 'text-slate-400 line-through'}`}>{r.title}</span>
              <input
                type="number"
                inputMode="numeric"
                min={1}
                aria-label={`${r.title} 價格`}
                value={prices[r.id] ?? String(r.cost)}
                onChange={(e) => setPrices((p) => ({ ...p, [r.id]: e.target.value }))}
                onBlur={() => {
                  const v = Number(prices[r.id]);
                  if (!v || v === r.cost) return;
                  void run(
                    () => actions.setShopOverride({ itemId: r.id, override: { cost: v === base.cost ? undefined : v } }),
                    '已改價',
                  );
                }}
                className="min-h-[56px] w-24 rounded-xl border-2 border-slate-200 text-center text-lg font-bold"
              />
              <button
                type="button"
                disabled={busy}
                onClick={() => run(() => actions.setShopOverride({ itemId: r.id, override: { isActive: !r.isActive } }))}
                className={`min-h-[56px] rounded-xl px-3 text-base font-bold ${r.isActive ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-600'}`}
              >
                {r.isActive ? '上架中' : '已下架'}
              </button>
              {overridden && (
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => {
                    setPrices((p) => {
                      const next = { ...p };
                      delete next[r.id];
                      return next;
                    });
                    void run(() => actions.setShopOverride({ itemId: r.id, override: null }), '已還原');
                  }}
                  className="min-h-[56px] rounded-xl px-3 text-base font-bold text-violet-700 hover:bg-violet-50"
                >
                  還原
                </button>
              )}
            </div>
          );
        })}
      </div>
    </Card>
  );
}
