import js from '@eslint/js';
import globals from 'globals';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import tseslint from 'typescript-eslint';

/**
 * spec §2.2 ④ / §9 的兩條硬性規則：
 * 1. react-hooks/exhaustive-deps = error（防無窮迴圈燒額度）
 * 2. firebase/firestore 只能在 src/store/ 與 src/lib/firebase.ts 內 import
 */
export const FIRESTORE_RESTRICTION = [
  'error',
  {
    patterns: [
      {
        group: ['firebase/firestore', 'firebase/firestore/*', '@firebase/firestore'],
        message: 'Firestore 只能在 src/store/ 內使用（見 spec §2.2 ④）',
      },
    ],
  },
];

export default tseslint.config(
  { ignores: ['dist', 'dev-dist', 'node_modules', 'coverage'] },
  {
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      ecmaVersion: 2020,
      globals: { ...globals.browser, ...globals.node },
    },
    plugins: {
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      'react-hooks/exhaustive-deps': 'error',
      'react-refresh/only-export-components': ['warn', { allowConstantExport: true }],
      'no-restricted-imports': FIRESTORE_RESTRICTION,
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
    },
  },
  {
    // 唯一允許 import firebase/firestore 的地方
    files: ['src/store/**/*.{ts,tsx}', 'src/lib/firebase.ts'],
    rules: { 'no-restricted-imports': 'off' },
  },
);
