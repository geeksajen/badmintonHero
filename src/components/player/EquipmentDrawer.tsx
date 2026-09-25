import { useReadyGame } from '../../hooks/useGameState';
import { Modal } from '../ui/Modal';

export function EquipmentDrawer({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { player, curriculum } = useReadyGame();
  return (
    <Modal open={open} onClose={onClose} variant="sheet" title="🎒 我的背包">
      <h3 className="mb-2 text-lg font-black text-slate-500">裝備</h3>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {curriculum.equipments.map((e) => {
          const owned = player.unlockedEquipmentIds.includes(e.id);
          return (
            <div
              key={e.id}
              className={`flex flex-col items-center rounded-2xl border-4 p-3 text-center ${
                owned ? 'border-amber-300 bg-amber-50' : 'border-dashed border-slate-200 bg-slate-50'
              }`}
            >
              <span className={`text-5xl ${owned ? '' : 'opacity-30 grayscale'}`}>{owned ? e.icon : '❔'}</span>
              <span className="mt-1 text-lg font-black">{owned ? e.name : '？？？'}</span>
              {owned && <span className="text-sm text-slate-500">{e.description}</span>}
            </div>
          );
        })}
      </div>

      <h3 className="mb-2 mt-6 text-lg font-black text-slate-500">稱號</h3>
      <div className="flex flex-wrap gap-2">
        {curriculum.titles.map((t) => {
          const owned = player.unlockedTitleIds.includes(t.id);
          return (
            <span
              key={t.id}
              className={`rounded-full px-4 py-2 text-lg font-bold ${
                owned ? `${t.color} text-white` : 'bg-slate-100 text-slate-300'
              } ${player.currentTitleId === t.id ? 'ring-4 ring-amber-300' : ''}`}
            >
              {owned ? t.name : '？？？'}
            </span>
          );
        })}
      </div>
    </Modal>
  );
}
