import { ArrowLeft, Printer } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Certificate } from '../components/player/Certificate';
import { useReadyGame } from '../hooks/useGameState';

export function CertificatePage() {
  const { player } = useReadyGame();
  return (
    <div className="min-h-dvh bg-indigo-950 px-3 pb-10 pt-[max(1rem,env(safe-area-inset-top))]">
      <div className="no-print mx-auto mb-4 flex max-w-3xl items-center justify-between">
        <Link to="/" className="flex min-h-[64px] items-center gap-2 rounded-2xl bg-white/10 px-4 text-lg font-bold text-white">
          <ArrowLeft /> 回地圖
        </Link>
        <button
          type="button"
          onClick={() => window.print()}
          className="flex min-h-[64px] items-center gap-2 rounded-2xl bg-amber-400 px-4 text-lg font-black text-amber-950"
        >
          <Printer /> 列印
        </button>
      </div>
      {player.graduatedAt ? (
        <Certificate />
      ) : (
        <p className="mx-auto max-w-md rounded-3xl bg-white/10 p-8 text-center text-xl text-white">畢業之後，這裡會出現你的畢業證書喔！🎓</p>
      )}
    </div>
  );
}
