import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { playSound } from '../../lib/sound';

type Variant = 'primary' | 'secondary' | 'success' | 'danger' | 'ghost' | 'gold';
type Size = 'md' | 'lg' | 'sm';

const VARIANT: Record<Variant, string> = {
  primary: 'bg-violet-600 text-white shadow-[0_6px_0_#4c1d95] hover:bg-violet-500',
  secondary: 'bg-white text-slate-800 shadow-[0_6px_0_#cbd5e1] hover:bg-slate-50',
  success: 'bg-emerald-500 text-white shadow-[0_6px_0_#047857] hover:bg-emerald-400',
  danger: 'bg-rose-600 text-white shadow-[0_6px_0_#9f1239] hover:bg-rose-500',
  ghost: 'bg-white/10 text-white hover:bg-white/20',
  gold: 'bg-amber-400 text-amber-950 shadow-[0_6px_0_#b45309] hover:bg-amber-300',
};

/** spec §8.3：最小點擊區 64×64，主要按鈕高度 ≥ 72 */
const SIZE: Record<Size, string> = {
  sm: 'min-h-[48px] px-4 text-base rounded-xl',
  md: 'min-h-[64px] px-5 text-lg rounded-2xl',
  lg: 'min-h-[72px] px-6 text-2xl rounded-3xl',
};

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  block?: boolean;
  sound?: boolean;
  children: ReactNode;
}

export function Button({
  variant = 'primary',
  size = 'md',
  block,
  sound = true,
  className = '',
  onClick,
  disabled,
  children,
  ...rest
}: ButtonProps) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={(e) => {
        if (sound) playSound('tap');
        onClick?.(e);
      }}
      className={[
        'inline-flex select-none items-center justify-center gap-2 font-black transition',
        'active:translate-y-[4px] active:shadow-none disabled:cursor-not-allowed disabled:opacity-40 disabled:active:translate-y-0',
        VARIANT[variant],
        SIZE[size],
        block ? 'w-full' : '',
        className,
      ].join(' ')}
      {...rest}
    >
      {children}
    </button>
  );
}
