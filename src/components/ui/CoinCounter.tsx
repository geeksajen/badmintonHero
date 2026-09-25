import { animate, motion, useReducedMotion } from 'framer-motion';
import { useEffect, useRef, useState } from 'react';

/** 金幣／數字滾動 ＋ 彈跳 */
export function CoinCounter({ value, className = '', icon = '🪙' }: { value: number; className?: string; icon?: string }) {
  const [shown, setShown] = useState(value);
  const [bump, setBump] = useState(0);
  const prev = useRef(value);
  const reduce = useReducedMotion();

  useEffect(() => {
    const from = prev.current;
    prev.current = value;
    if (from === value) return;
    setBump((b) => b + 1);
    if (reduce) {
      setShown(value);
      return;
    }
    const controls = animate(from, value, {
      duration: Math.min(1.2, 0.3 + Math.abs(value - from) / 200),
      onUpdate: (v) => setShown(Math.round(v)),
    });
    return () => controls.stop();
  }, [value, reduce]);

  return (
    <motion.span
      key={bump}
      initial={bump && !reduce ? { scale: 1.35 } : false}
      animate={{ scale: 1 }}
      transition={{ type: 'spring', stiffness: 400, damping: 12 }}
      className={`inline-flex items-center gap-1 tabular-nums ${className}`}
    >
      <span aria-hidden>{icon}</span>
      {shown.toLocaleString()}
    </motion.span>
  );
}
