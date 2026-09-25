import { useState } from 'react';
import { useGameActions } from '../../hooks/useGameActions';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { useRun } from './useRun';

const QUICK: { exp: number; coins: number; label: string }[] = [
  { exp: 10, coins: 0, label: '+10 EXP' },
  { exp: 30, coins: 0, label: '+30 EXP' },
  { exp: 50, coins: 0, label: '+50 EXP' },
  { exp: 0, coins: 10, label: '+10 幣' },
  { exp: 0, coins: 20, label: '+20 幣' },
];

/** 教練即時獎勵（每次練習均值約 25 EXP / 12 幣，spec §4.3） */
export function BonusDispatcher() {
  const actions = useGameActions();
  const { busy, run } = useRun();
  const [exp, setExp] = useState('');
  const [coins, setCoins] = useState('');
  const [message, setMessage] = useState('');

  return (
    <Card id="bonus" title="即時獎勵" icon="🎁">
      <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
        {QUICK.map((q) => (
          <Button
            key={q.label}
            variant={q.exp ? 'primary' : 'gold'}
            disabled={busy}
            onClick={() => run(() => actions.grantBonus({ exp: q.exp, coins: q.coins, message }), `已發放 ${q.label}`)}
          >
            {q.label}
          </Button>
        ))}
      </div>
      <div className="mt-3 grid grid-cols-2 gap-2">
        <input
          type="number"
          inputMode="numeric"
          min={0}
          value={exp}
          onChange={(e) => setExp(e.target.value)}
          placeholder="自訂 EXP"
          className="min-h-[64px] rounded-2xl border-2 border-slate-200 px-4 text-lg"
        />
        <input
          type="number"
          inputMode="numeric"
          min={0}
          value={coins}
          onChange={(e) => setCoins(e.target.value)}
          placeholder="自訂金幣"
          className="min-h-[64px] rounded-2xl border-2 border-slate-200 px-4 text-lg"
        />
      </div>
      <input
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        placeholder="獎勵訊息（選填，例如：今天步法超棒！）"
        className="mt-2 min-h-[64px] w-full rounded-2xl border-2 border-slate-200 px-4 text-lg"
      />
      <Button
        className="mt-2"
        block
        variant="success"
        disabled={busy || (!Number(exp) && !Number(coins))}
        onClick={async () => {
          const ok = await run(
            () => actions.grantBonus({ exp: Number(exp) || 0, coins: Number(coins) || 0, message }),
            '已發放自訂獎勵',
          );
          if (ok) {
            setExp('');
            setCoins('');
            setMessage('');
          }
        }}
      >
        發放自訂獎勵
      </Button>
    </Card>
  );
}
