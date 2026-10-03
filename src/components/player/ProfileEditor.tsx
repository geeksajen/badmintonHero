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
  // 預設打開目前頭像所在的分頁
  const [group, setGroup] = useState(() =>
    Math.max(0, AVATARS.findIndex((g) => g.items.some((a) => a.emoji === player.avatar))),
  );
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
          className="toon flex h-28 w-28 items-center justify-center rounded-full bg-gradient-to-br from-amber-200 via-pink-300 to-violet-300 text-7xl"
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
        <div className="mb-2 flex items-center justify-between gap-2">
          <span className="text-xl font-black text-slate-600">選一個頭像</span>
          {/* 男生／女生分頁：頭像變多後不用一路往下捲 */}
          <div role="tablist" className="flex gap-1 rounded-2xl bg-slate-100 p-1">
            {AVATARS.map((g, i) => (
              <button
                key={g.group}
                type="button"
                role="tab"
                aria-selected={group === i}
                onClick={() => {
                  playSound('tap');
                  setGroup(i);
                }}
                className={`min-h-[56px] rounded-xl px-5 text-lg font-black transition ${
                  group === i ? 'toon-sm bg-white text-ink' : 'text-slate-500'
                }`}
              >
                {g.group}
              </button>
            ))}
          </div>
        </div>
        <div role="tabpanel" className="grid grid-cols-4 gap-2 sm:grid-cols-6 sm:gap-3">
          {AVATARS[group].items.map((a) => {
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
                className={`flex min-h-[88px] flex-col items-center justify-center gap-1 rounded-2xl border-[3px] px-1 transition ${
                  selected ? 'border-ink bg-yellow-200 shadow-[0_4px_0_#2b2350]' : 'border-slate-200 bg-slate-50'
                }`}
              >
                <span className="text-5xl leading-none">{a.emoji}</span>
                <span className={`w-full truncate text-center text-sm ${selected ? 'text-ink' : 'text-slate-500'}`}>{a.label}</span>
              </motion.button>
            );
          })}
        </div>
      </div>

      {error && <p className="text-lg font-bold text-rose-600">{error}</p>}

      <Button size="lg" variant="success" block disabled={busy || !trimmed || tooLong || !changed} onClick={save}>
        {busy ? '…' : '好了！'}
      </Button>
    </div>
  );
}
