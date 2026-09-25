import { useState, useSyncExternalStore } from 'react';
import { getCounterStats, READ_ALARM, subscribeCounter, type CounterStats } from '../lib/firestore-counter';
import { STORE_MODE } from '../store';

let cached: CounterStats = getCounterStats();
const subscribe = (fn: () => void) =>
  subscribeCounter((s) => {
    cached = s;
    fn();
  });
const getSnapshot = () => cached;

/** 開發期讀寫計數器常駐角落（spec §2.2 ④），只在 import.meta.env.DEV 顯示 */
export function DevCounter() {
  const s = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
  const [open, setOpen] = useState(false);
  const alarm = s.reads > READ_ALARM;
  return (
    <div className="no-print fixed bottom-24 left-2 z-[80] font-mono text-xs">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={`rounded-lg px-2 py-1 font-bold text-white shadow ${alarm ? 'animate-pulse bg-rose-600' : 'bg-black/70'}`}
      >
        {STORE_MODE.toUpperCase()} R:{s.reads} W:{s.writes}
      </button>
      {open && (
        <div className="mt-1 max-h-64 overflow-auto rounded-lg bg-black/85 p-2 text-white">
          {Object.entries(s.byLabel).map(([k, v]) => (
            <div key={k}>
              {k}: R{v.reads} W{v.writes}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
