import { Delete } from 'lucide-react';
import { useState, type ReactNode } from 'react';

const OK_KEY = 'bhq:admin-ok';
const PIN = (import.meta.env.VITE_ADMIN_PIN as string | undefined) || '0000';

function isUnlocked(): boolean {
  try {
    return sessionStorage.getItem(OK_KEY) === '1';
  } catch {
    return false;
  }
}

/**
 * 4 位數 PIN 閘門（spec §8.2）。
 * ⚠️ 純前端驗證，打開 devtools 就能繞過 —— 目的是防 7 歲小孩誤入，不是防駭客。
 * 真正的存取控制在 Firestore 規則（firestore.rules，鎖定單一家庭 UID）。
 */
export function PinGate({ children }: { children: ReactNode }) {
  const [ok, setOk] = useState(isUnlocked);
  const [input, setInput] = useState('');
  const [shake, setShake] = useState(false);

  if (ok) return <>{children}</>;

  const press = (d: string) => {
    const next = (input + d).slice(0, 4);
    setInput(next);
    if (next.length === 4) {
      if (next === PIN) {
        try {
          sessionStorage.setItem(OK_KEY, '1');
        } catch {
          /* ignore */
        }
        setOk(true);
      } else {
        setShake(true);
        setTimeout(() => {
          setShake(false);
          setInput('');
        }, 500);
      }
    }
  };

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center bg-slate-900 px-6 text-white">
      <div className="mb-2 text-5xl">🔐</div>
      <h1 className="mb-6 text-2xl font-black">家長控制台</h1>
      <div className={`mb-8 flex gap-4 ${shake ? 'animate-[breathe_0.15s_ease-in-out_3]' : ''}`}>
        {[0, 1, 2, 3].map((i) => (
          <span
            key={i}
            className={`h-5 w-5 rounded-full ${i < input.length ? (shake ? 'bg-rose-500' : 'bg-white') : 'bg-white/20'}`}
          />
        ))}
      </div>
      <div className="grid grid-cols-3 gap-3">
        {['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', 'del'].map((k) =>
          k === '' ? (
            <span key="blank" />
          ) : (
            <button
              key={k}
              type="button"
              aria-label={k === 'del' ? '刪除' : k}
              onClick={() => (k === 'del' ? setInput((s) => s.slice(0, -1)) : press(k))}
              className="flex h-20 w-20 items-center justify-center rounded-full bg-white/10 text-3xl font-bold hover:bg-white/20 active:bg-white/30"
            >
              {k === 'del' ? <Delete size={28} /> : k}
            </button>
          ),
        )}
      </div>
    </div>
  );
}
