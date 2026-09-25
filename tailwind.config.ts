import type { Config } from 'tailwindcss';

export default {
  // 章節主題色、稱號顏色寫在 src/data/**/*.ts，所以 content 必須包含 .ts
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        game: ['"Baloo 2"', 'Huninn', '"Noto Sans TC"', 'system-ui', 'sans-serif'],
        round: ['Huninn', '"Noto Sans TC"', 'system-ui', 'sans-serif'],
      },
      colors: {
        bronze: '#cd7f32',
        silver: '#a8b3c1',
        gold: '#f5b700',
        ink: '#2b2350', // 卡通描邊色
      },
      keyframes: {
        breathe: { '0%,100%': { transform: 'scale(1)', opacity: '1' }, '50%': { transform: 'scale(0.94)', opacity: '0.75' } },
        glow: { '0%,100%': { boxShadow: '0 0 0 0 rgba(255,255,255,0.8)' }, '50%': { boxShadow: '0 0 0 16px rgba(255,255,255,0)' } },
        float: { '0%,100%': { transform: 'translateY(0) rotate(-4deg)' }, '50%': { transform: 'translateY(-12px) rotate(4deg)' } },
        bob: { '0%,100%': { transform: 'translate(-50%, 0)' }, '50%': { transform: 'translate(-50%, -10px)' } },
        wiggle: { '0%,100%': { transform: 'rotate(-6deg)' }, '50%': { transform: 'rotate(6deg)' } },
        'spin-slow': { to: { transform: 'rotate(360deg)' } },
        stripes: { from: { backgroundPosition: '0 0' }, to: { backgroundPosition: '28px 0' } },
        shine: { '0%': { transform: 'translateX(-120%) skewX(-20deg)' }, '60%,100%': { transform: 'translateX(220%) skewX(-20deg)' } },
        drift: { '0%,100%': { transform: 'translateX(0)' }, '50%': { transform: 'translateX(18px)' } },
      },
      animation: {
        breathe: 'breathe 2.4s ease-in-out infinite',
        glow: 'glow 1.8s ease-out infinite',
        float: 'float 4s ease-in-out infinite',
        bob: 'bob 1.2s ease-in-out infinite',
        wiggle: 'wiggle 1.6s ease-in-out infinite',
        'spin-slow': 'spin-slow 14s linear infinite',
        stripes: 'stripes 1s linear infinite',
        shine: 'shine 3.5s ease-in-out infinite',
        drift: 'drift 6s ease-in-out infinite',
      },
    },
  },
  plugins: [],
} satisfies Config;
