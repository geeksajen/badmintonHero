import { motion } from 'framer-motion';
import { useState } from 'react';
import { AVATARS } from '../../data/avatars';
import { NAME_MAX_LENGTH } from '../../engine/actions';
import { useGameActions } from '../../hooks/useGameActions';
import { useReadyGame } from '../../hooks/useGameState';
import { playSound } from '../../lib/sound';
import { Button } from '../ui/Button';
import { Modal } from '../ui/Modal';

/** 小孩自己改名字、選頭像 */
export function ProfileEditor({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <Modal open={open} onClose={onClose} variant="sheet" title="✏️ 我的勇者">
      {open && <EditorBody onClose={onClose} />}
    </Modal>
  );
}

function EditorBody({ onClose }: { onClose: () => void }) {
  const { player } = useReadyGame();
  const actions = useGameActions();
  const [name, setName] = useState(player.name);
  const [avatar, setAvatar] = useState(player.avatar);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const trimmed = name.trim();
  const tooLong = [...trimmed].length > NAME_MAX_LENGTH;
  const changed = trimmed !== player.name || avatar !== player.avatar;

  const save = async () => {
    setBusy(true);
    setError(null);
    try {
      await actions.updateProfile({ name: trimmed, avatar });
      playSound('tada');
      onClose();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* 預覽 */}
      <div className="flex flex-col items-center gap-2">
        <motion.div
          key={avatar}
          initial={{ scale: 0.6, rotate: -15 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ type: 'spring', stiffness: 300, damping: 12 }}
          className="flex h-28 w-28 items-center justify-center rounded-full bg-gradient-to-br from-amber-300 to-pink-400 text-7xl shadow-lg ring-4 ring-amber-200"
        >
          {avatar}
        </motion.div>
        <div className="min-h-[2.5rem] text-3xl font-black">{trimmed || ' '}</div>
      </div>

      {/* 名字 */}
      <label className="block">
        <span className="mb-1 block text-xl font-black text-slate-600">我的名字</span>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={NAME_MAX_LENGTH * 2}
          placeholder="輸入你的名字"
          className={`min-h-[72px] w-full rounded-2xl border-4 px-5 text-3xl font-black ${
            tooLong ? 'border-rose-300' : 'border-slate-200 focus:border-violet-400'
          } outline-none`}
        />
        <span className={`mt-1 block text-right text-base font-bold ${tooLong ? 'text-rose-500' : 'text-slate-400'}`}>
          {[...trimmed].length} / {NAME_MAX_LENGTH}
        </span>
      </label>

      {/* 頭像 */}
      <div>
        <span className="mb-2 block text-xl font-black text-slate-600">選一個頭像</span>
        <div className="space-y-3">
          {AVATARS.map((g) => (
            <div key={g.group}>
              <div className="mb-1 text-base font-bold text-slate-400">{g.group}</div>
              <div className="grid grid-cols-3 gap-3">
                {g.items.map((a) => {
                  const selected = a.emoji === avatar;
                  return (
                    <motion.button
                      key={a.emoji}
                      type="button"
                      whileTap={{ scale: 0.9 }}
                      onClick={() => {
                        playSound('tap');
                        setAvatar(a.emoji);
                      }}
                      aria-label={a.label}
                      aria-pressed={selected}
                      className={`flex min-h-[112px] flex-col items-center justify-center gap-1 rounded-3xl border-4 transition ${
                        selected ? 'border-violet-500 bg-violet-50 shadow-lg' : 'border-slate-200 bg-slate-50'
                      }`}
                    >
                      <span className="text-6xl leading-none">{a.emoji}</span>
                      <span className={`text-base font-bold ${selected ? 'text-violet-700' : 'text-slate-500'}`}>{a.label}</span>
                    </motion.button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>

      {error && <p className="text-lg font-bold text-rose-600">{error}</p>}

      <Button size="lg" variant="success" block disabled={busy || !trimmed || tooLong || !changed} onClick={save}>
        {busy ? '…' : '好了！'}
      </Button>
    </div>
  );
}
