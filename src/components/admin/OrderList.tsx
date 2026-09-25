import { RefreshCw } from 'lucide-react';
import { useState } from 'react';
import { useGameActions } from '../../hooks/useGameActions';
import { useReadyGame } from '../../hooks/useGameState';
import { useHistory } from '../../hooks/useHistory';
import type { RedemptionOrder } from '../../types';
import { formatTime } from '../../lib/format';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { ConfirmDialog } from '../ui/Modal';
import { useRun } from './useRun';

/** 訂單出貨：pending → 已完成 / 取消退款 */
export function OrderList() {
  const { player } = useReadyGame();
  const actions = useGameActions();
  const { data, loading, refresh } = useHistory('orders', player.ordersRev ?? 0);
  const { busy, run } = useRun();
  const [cancelling, setCancelling] = useState<RedemptionOrder | null>(null);
  const pending = data.filter((o) => o.status === 'pending');
  const done = data.filter((o) => o.status !== 'pending').slice(0, 8);

  return (
    <Card
      id="orders"
      title="兌換訂單"
      icon="📦"
      right={
        <button type="button" onClick={refresh} aria-label="重新整理" className="flex h-12 w-12 items-center justify-center rounded-xl hover:bg-slate-100">
          <RefreshCw size={22} className={loading ? 'animate-spin' : ''} />
        </button>
      }
    >
      {pending.length === 0 ? (
        <p className="text-lg text-slate-500">沒有待出貨的訂單。</p>
      ) : (
        <div className="space-y-2">
          {pending.map((o) => (
            <div key={o.id} className="rounded-2xl border-2 border-amber-200 bg-amber-50 p-3">
              <div className="flex items-center justify-between">
                <span className="text-xl font-black">{o.rewardTitleSnapshot}</span>
                <span className="font-bold text-amber-700">🪙 {o.costSnapshot}</span>
              </div>
              <div className="text-sm text-slate-500">{formatTime(o.requestedAt)} 兌換</div>
              <div className="mt-2 grid grid-cols-2 gap-2">
                <Button variant="secondary" disabled={busy} onClick={() => setCancelling(o)}>
                  取消並退款
                </Button>
                <Button variant="success" disabled={busy} onClick={() => run(() => actions.fulfillOrder({ order: o }), '已出貨 🎁')}>
                  已完成
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
      {done.length > 0 && (
        <details className="mt-3">
          <summary className="cursor-pointer text-base font-bold text-slate-500">最近處理過的訂單</summary>
          <ul className="mt-2 space-y-1 text-base">
            {done.map((o) => (
              <li key={o.id} className="flex justify-between">
                <span>
                  {o.rewardTitleSnapshot}（{o.costSnapshot}）
                </span>
                <span className={o.status === 'fulfilled' ? 'text-emerald-600' : 'text-slate-400'}>
                  {o.status === 'fulfilled' ? '已完成' : '已取消'}
                </span>
              </li>
            ))}
          </ul>
        </details>
      )}
      <ConfirmDialog
        open={!!cancelling}
        title="取消這筆訂單？"
        message={cancelling ? `「${cancelling.rewardTitleSnapshot}」會退回 ${cancelling.costSnapshot} 金幣。` : ''}
        confirmText="取消並退款"
        cancelText="返回"
        danger
        busy={busy}
        onConfirm={async () => {
          if (cancelling) await run(() => actions.cancelOrder({ order: cancelling }), '已退款');
          setCancelling(null);
        }}
        onCancel={() => setCancelling(null)}
      />
    </Card>
  );
}
