import { motion } from 'framer-motion';
import { Volume2 } from 'lucide-react';
import { useEffect, useId, useSyncExternalStore } from 'react';
import { canSpeak, speak, speakingNow, stopSpeaking, subscribeSpeaking } from '../../lib/speech';

/**
 * 🔊 念給我聽：點一下朗讀，念的時候再點一下停止。元件卸載（例如關掉面板）時自動停止。
 * 裝置不支援語音朗讀時不顯示。
 */
export function SpeakButton({ text, label = '念給我聽', className = '' }: { text: string; label?: string; className?: string }) {
  const id = useId();
  const current = useSyncExternalStore(subscribeSpeaking, speakingNow, speakingNow);
  const speaking = current === id;

  useEffect(
    () => () => {
      if (speakingNow() === id) stopSpeaking();
    },
    [id],
  );

  if (!canSpeak) return null;

  return (
    <motion.button
      type="button"
      aria-label={speaking ? '停止朗讀' : label}
      whileTap={{ scale: 0.9 }}
      onClick={(e) => {
        e.stopPropagation();
        if (speaking) stopSpeaking();
        else speak(text, id);
      }}
      className={`toon-sm flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl ${
        speaking ? 'bg-amber-300' : 'bg-white'
      } text-ink ${className}`}
    >
      <motion.span
        animate={speaking ? { scale: [1, 1.25, 1] } : { scale: 1 }}
        transition={speaking ? { repeat: Infinity, duration: 0.7 } : { duration: 0.2 }}
        className="flex"
      >
        <Volume2 size={32} strokeWidth={2.5} />
      </motion.span>
    </motion.button>
  );
}
