/**
 * 課程包驗證腳本（spec §11 Step 0）。用法：npm run validate
 * 改完 quests.ts 一定要跑，失敗時 exit code 1（CI 也會擋）。
 */
import { CURRICULA } from '../src/data';
import { computeTotals, simulate52, validateCurriculum } from '../src/engine/validate';

const SESSIONS_PER_CHAPTER = [6, 12, 14, 10, 10]; // spec §5 進度節奏表
let failed = false;

const check = (ok: boolean, label: string, detail = '') => {
  console.log(`${ok ? '✅' : '❌'} ${label}${detail ? `  ${detail}` : ''}`);
  if (!ok) failed = true;
};

for (const c of Object.values(CURRICULA)) {
  console.log(`\n══════ 課程包 ${c.id}（QUEST_DATA_VERSION = ${c.version}）══════\n`);

  const report = validateCurriculum(c);
  check(report.errors.length === 0, '結構檢查（DAG 無環／無孤兒／對照表／門檻遞增／order 唯一／無指向退役節點）');
  for (const e of report.errors) console.log(`   ❌ ${e}`);
  for (const i of report.info) console.log(`   ℹ️  ${i}`);

  // order 以 10 為間隔（初版）
  const gapsOk = c.chapters.every((ch) => {
    const orders = c.quests
      .filter((q) => q.chapterId === ch.id && q.addedInVersion === undefined)
      .map((q) => q.order)
      .sort((a, b) => a - b);
    return orders.every((o, i) => o === (i + 1) * 10);
  });
  check(gapsOk, '初版節點 order 各章為 10, 20, 30…（留 9 個插入空位）');

  const t = computeTotals(c);
  console.log('\n── 數值總和 ──');
  console.table(
    t.byChapter.map((r) => ({ 章: r.chapterId, 節點數: r.count, EXP: r.exp, 金幣: r.coins })),
  );
  if (c.id === 'badminton-7yo-v1') {
    check(t.nodes === 34, '節點數 = 34', `(${t.nodes})`);
    check(
      JSON.stringify(t.byChapter.map((r) => r.count)) === JSON.stringify([6, 7, 8, 7, 6]),
      '各章節點數 6 / 7 / 8 / 7 / 6',
    );
    check(t.exp === 3970 && t.coins === 1985, '節點全金牌 3,970 EXP / 1,985 幣', `(${t.exp} / ${t.coins})`);
    check(t.milestoneExp === 800 && t.milestoneCoins === 400, '出席里程碑 800 EXP / 400 幣');
    check(t.curveTotal === 6720 && c.levelCurve.length === 24, '等級曲線 24 級距合計 6,720');
    check(c.equipments.length === 10 && c.titles.length === 6 && c.rewards.length === 8, '10 裝備 / 6 稱號 / 8 商品');
  }

  console.log('\n── 52 次練習收入模擬 ──');
  const scenarios = [
    { name: '全金牌', tierRate: 1 },
    { name: '約 75% 階級達成', tierRate: 0.75 },
  ];
  for (const s of scenarios) {
    const rows = simulate52(c, {
      sessionsPerChapter: SESSIONS_PER_CHAPTER,
      coachExp: 25,
      coachCoins: 12,
      tierRate: s.tierRate,
    });
    const last = rows[rows.length - 1];
    const maxRow = rows.find((r) => r.level >= c.maxLevel);
    console.log(
      `\n[${s.name}] 第 52 次：累計 ${last.totalExp} EXP / ${last.coinsEarned} 幣 → Lv.${last.level}` +
        (maxRow ? `；第 ${maxRow.session} 次練習（第 ${maxRow.chapterId} 章）滿等` : '；未滿等'),
    );
    const milestones = [1, 6, 18, 32, 42, 52];
    console.table(
      rows
        .filter((r) => milestones.includes(r.session))
        .map((r) => ({ 第幾次: r.session, 章: r.chapterId, 累計EXP: r.totalExp, 累計幣: r.coinsEarned, 等級: r.level })),
    );
    if (s.tierRate === 1) {
      check(!!maxRow && maxRow.chapterId === 5, '全金牌：滿等落在第 5 章');
      check(rows[0].level >= 2, '第一次練習必升級（出席 ＋ 教練獎勵已足夠，另加 q1_1 銅牌）');
    } else {
      check(!maxRow || maxRow.chapterId === 5, '非全金牌：不會在第 5 章之前滿等');
    }
  }
}

console.log(failed ? '\n❌ 驗證失敗' : '\n✅ 全部通過');
process.exit(failed ? 1 : 0);
