import { useState } from 'react';
import { useGameState } from '../hooks/useGameState';
import { Button } from './ui/Button';

/**
 * Firebase 模式的家庭帳號登入（Email/Password，單一家庭共用帳號，spec §10.3）。
 * 每台裝置登入一次，之後以 browserLocalPersistence 自動保持登入。
 */
export function LoginGate() {
  const { store } = useGameState();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="flex min-h-dvh items-center justify-center bg-indigo-950 px-5">
      <form
        className="w-full max-w-sm rounded-[2rem] bg-white p-6 shadow-2xl"
        onSubmit={async (e) => {
          e.preventDefault();
          if (!store) return;
          setBusy(true);
          setError(null);
          try {
            await store.auth.signIn(email.trim(), password);
          } catch (err) {
            setError((err as { code?: string }).code === 'auth/invalid-credential' ? '帳號或密碼不正確' : (err as Error).message);
          } finally {
            setBusy(false);
          }
        }}
      >
        <div className="text-center text-5xl">🏸</div>
        <h1 className="mt-2 text-center text-2xl font-black">羽球勇者冒險記</h1>
        <p className="mb-5 text-center text-base text-slate-500">請家長登入家庭帳號（每台裝置只要登入一次）</p>
        <input
          type="email"
          autoComplete="username"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Email"
          className="mb-3 min-h-[64px] w-full rounded-2xl border-2 border-slate-200 px-4 text-lg"
        />
        <input
          type="password"
          autoComplete="current-password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="密碼"
          className="mb-3 min-h-[64px] w-full rounded-2xl border-2 border-slate-200 px-4 text-lg"
        />
        {error && <p className="mb-3 font-bold text-rose-600">{error}</p>}
        <Button type="submit" size="lg" block disabled={busy}>
          {busy ? '登入中…' : '登入'}
        </Button>
      </form>
    </div>
  );
}
