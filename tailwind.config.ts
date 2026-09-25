import type { Config } from 'tailwindcss';

export default {
  // 章節主題色、稱號顏色寫在 src/data/**/*.ts，所以 content 必須包含 .ts
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        game: ['"Baloo 2"', '"Noto Sans TC"', 'system-ui', 'sans-serif'],
      },
      colors: {
        bronze: '#cd7f32',
        silver: '#a8b3c1',
        gold: '#f5b700',
      },
      keyframes: {
        breathe: { '0%,100%': { transform: 'scale(1)', opacity: '1' }, '50%': { transform: 'scale(0.94)', opacity: '0.75' } },
        glow: { '0%,100%': { boxShadow: '0 0 0 0 rgba(255,255,255,0.7)' }, '50%': { boxShadow: '0 0 0 14px rgba(255,255,255,0)' } },
      },
      animation: {
        breathe: 'breathe 2.4s ease-in-out infinite',
        glow: 'glow 1.8s ease-out infinite',
      },
    },
  },
  plugins: [],
} satisfies Config;
