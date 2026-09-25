import { useSyncExternalStore } from 'react';
import { isMuted, playSound, setMuted, subscribeMuted } from '../lib/sound';

export function useSound() {
  const muted = useSyncExternalStore(subscribeMuted, isMuted, isMuted);
  return { play: playSound, muted, toggleMute: () => setMuted(!muted) };
}
