/**
 * spec §2.2 ④ 與 §11 Step 4 的靜態驗收：
 * - ESLint 能擋下「在元件內 import firebase/firestore」與 exhaustive-deps 違規
 * - onSnapshot 只出現在 firebaseAdapter（2 次），且訂閱只由 GameProvider 建立（2 次）
 * - firebase/firestore 的 import 只出現在 src/store/ 與 src/lib/firebase.ts
 */
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import { ESLint } from 'eslint';
import { describe, expect, it } from 'vitest';

const ROOT = join(__dirname, '..');

function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const p = join(dir, name);
    return statSync(p).isDirectory() ? walk(p) : /\.(ts|tsx)$/.test(name) ? [p] : [];
  });
}
const srcFiles = walk(join(ROOT, 'src')).map((p) => ({ rel: relative(ROOT, p).split(sep).join('/'), text: readFileSync(p, 'utf8') }));

describe('ESLint 硬性規則', () => {
  const eslint = new ESLint({ cwd: ROOT });

  it('元件內 import firebase/firestore → error', async () => {
    const [res] = await eslint.lintText(
      "import { onSnapshot } from 'firebase/firestore';\nexport const x = onSnapshot;\n",
      { filePath: join(ROOT, 'src/components/player/Bad.tsx') },
    );
    expect(res.messages.some((m) => m.ruleId === 'no-restricted-imports' && m.severity === 2)).toBe(true);
  });

  it('src/store/ 內允許 import firebase/firestore', async () => {
    const [res] = await eslint.lintText(
      "import { onSnapshot } from 'firebase/firestore';\nexport const x = onSnapshot;\n",
      { filePath: join(ROOT, 'src/store/ok.ts') },
    );
    expect(res.messages.filter((m) => m.ruleId === 'no-restricted-imports')).toEqual([]);
  });

  it('exhaustive-deps 違規 → error', async () => {
    const code = `import { useEffect, useState } from 'react';
export function Bad({ id }: { id: string }) {
  const [v, setV] = useState(0);
  useEffect(() => { setV(id.length); }, []);
  return v;
}
`;
    const [res] = await eslint.lintText(code, { filePath: join(ROOT, 'src/components/player/Bad2.tsx') });
    expect(res.messages.some((m) => m.ruleId === 'react-hooks/exhaustive-deps' && m.severity === 2)).toBe(true);
  });
});

describe('Firestore 使用範圍（grep 驗收）', () => {
  it('onSnapshot( 只出現在 firebaseAdapter.ts，且恰好 2 次', () => {
    const hits = srcFiles.flatMap((f) => (f.text.match(/\bonSnapshot\(/g) ?? []).map(() => f.rel));
    expect(hits).toEqual(['src/store/firebaseAdapter.ts', 'src/store/firebaseAdapter.ts']);
  });

  it('監聽只由 GameProvider 建立：subscribePlayer / subscribeProgress 各呼叫 1 次', () => {
    const calls = srcFiles.flatMap((f) =>
      (f.text.match(/\.subscribe(Player|Progress)\(/g) ?? []).map((m) => `${f.rel}:${m}`),
    );
    expect(calls.sort()).toEqual([
      'src/providers/GameProvider.tsx:.subscribePlayer(',
      'src/providers/GameProvider.tsx:.subscribeProgress(',
    ]);
  });

  it("'firebase/firestore' 只在 src/store/ 與 src/lib/firebase.ts 內 import", () => {
    const offenders = srcFiles
      .filter((f) => /from\s+['"]firebase\/firestore['"]/.test(f.text))
      .map((f) => f.rel)
      .filter((rel) => !rel.startsWith('src/store/') && rel !== 'src/lib/firebase.ts');
    expect(offenders).toEqual([]);
  });
});
