import type { Curriculum } from '../types';
import { TIER_ORDER } from '../types';
import { levelForTotalExp } from './exp';
import { tierAmount } from './tiers';

export interface ValidationReport {
  errors: string[];
  info: string[];
}

/**
 * 課程包靜態檢查（spec §11 Step 0 驗收 ＋ §12 規則）。
 * scripts/validate-data.ts 與 tests/data.test.ts 共用。
 */
export function validateCurriculum(c: Curriculum): ValidationReport {
  const errors: string[] = [];
  const info: string[] = [];
  const byId = new Map(c.quests.map((q) => [q.id, q]));

  // id 唯一
  if (byId.size !== c.quests.length) errors.push('QuestNode id 重複');

  // 對照表完整
  const eqIds = new Set(c.equipments.map((e) => e.id));
  const titleIds = new Set(c.titles.map((t) => t.id));
  const chapterIds = new Set(c.chapters.map((ch) => ch.id));
  if (!titleIds.has(c.initialTitleId)) errors.push(`初始稱號 ${c.initialTitleId} 未定義`);
  if (!titleIds.has(c.graduationTitleId)) errors.push(`畢業稱號 ${c.graduationTitleId} 未定義`);
  for (const id of c.graduationEquipmentIds) if (!eqIds.has(id)) errors.push(`畢業裝備 ${id} 未定義`);
  if (!byId.has(c.finalQuestId)) errors.push(`最終關卡 ${c.finalQuestId} 未定義`);

  for (const q of c.quests) {
    if (!chapterIds.has(q.chapterId)) errors.push(`${q.id}: chapterId ${q.chapterId} 未定義`);
    for (const p of q.parentIds) {
      const parent = byId.get(p);
      if (!parent) errors.push(`${q.id}: parentId ${p} 不存在`);
      else if (parent.isRetired) errors.push(`${q.id}: parentId ${p} 指向退役節點（§12.4-③）`);
    }
    for (const e of q.rewardEquipmentIds ?? []) if (!eqIds.has(e)) errors.push(`${q.id}: 裝備 ${e} 未定義`);
    if (q.rewardTitleId && !titleIds.has(q.rewardTitleId)) errors.push(`${q.id}: 稱號 ${q.rewardTitleId} 未定義`);
    const t = q.tiers;
    if (!(t.bronze >= 1 && t.bronze < t.silver && t.silver < t.gold)) {
      errors.push(`${q.id}: 門檻必須 1 ≤ 銅 < 銀 < 金（目前 ${t.bronze}/${t.silver}/${t.gold}）`);
    }
    if (!Number.isInteger(q.order) || q.order <= 0) errors.push(`${q.id}: order 必須為正整數`);
    if (q.addedInVersion !== undefined && q.addedInVersion > c.version) {
      errors.push(`${q.id}: addedInVersion ${q.addedInVersion} > QUEST_DATA_VERSION ${c.version}（忘了 +1？）`);
    }
  }

  // order 在同一章內唯一（含退役節點，避免日後恢復時撞號）
  for (const ch of c.chapters) {
    const orders = c.quests.filter((q) => q.chapterId === ch.id).map((q) => q.order);
    const dup = orders.filter((o, i) => orders.indexOf(o) !== i);
    if (dup.length) errors.push(`第 ${ch.id} 章 order 重複：${dup.join(', ')}`);
  }

  // DAG 無環（DFS）
  const state = new Map<string, 0 | 1 | 2>();
  const visit = (id: string, stack: string[]): void => {
    const s = state.get(id);
    if (s === 2) return;
    if (s === 1) {
      errors.push(`DAG 有環：${[...stack, id].join(' → ')}`);
      return;
    }
    state.set(id, 1);
    for (const p of byId.get(id)?.parentIds ?? []) if (byId.has(p)) visit(p, [...stack, id]);
    state.set(id, 2);
  };
  for (const q of c.quests) visit(q.id, []);

  // 無孤兒：每個現役節點都能從起點走到（起點 = parentIds 為空）
  const active = c.quests.filter((q) => !q.isRetired);
  const roots = active.filter((q) => q.parentIds.length === 0);
  if (roots.length === 0) errors.push('沒有任何起點節點（parentIds 為空）');
  const reachable = new Set<string>(roots.map((r) => r.id));
  let grew = true;
  while (grew) {
    grew = false;
    for (const q of active) {
      if (!reachable.has(q.id) && q.parentIds.length > 0 && q.parentIds.every((p) => reachable.has(p))) {
        reachable.add(q.id);
        grew = true;
      }
    }
  }
  const orphans = active.filter((q) => !reachable.has(q.id)).map((q) => q.id);
  if (orphans.length) errors.push(`孤兒節點（永遠解不開）：${orphans.join(', ')}`);

  // 最終關卡必須能走到
  if (!reachable.has(c.finalQuestId)) errors.push(`最終關卡 ${c.finalQuestId} 走不到`);

  // 稱號 / 裝備沒人發（僅提示）
  const givenEq = new Set([...c.quests.flatMap((q) => q.rewardEquipmentIds ?? []), ...c.graduationEquipmentIds]);
  const givenTitle = new Set([...c.quests.map((q) => q.rewardTitleId).filter(Boolean), c.initialTitleId, c.graduationTitleId]);
  for (const e of c.equipments) if (!givenEq.has(e.id)) info.push(`提示：裝備 ${e.id} 沒有任何節點發放`);
  for (const t of c.titles) if (!givenTitle.has(t.id)) info.push(`提示：稱號 ${t.id} 沒有任何節點發放`);

  // 三階切分加總必須等於總額
  for (const q of active) {
    const e = TIER_ORDER.reduce((s, t) => s + tierAmount(q.rewardExp, t, c.tierRatio), 0);
    const k = TIER_ORDER.reduce((s, t) => s + tierAmount(q.rewardCoins, t, c.tierRatio), 0);
    if (e !== q.rewardExp || k !== q.rewardCoins) errors.push(`${q.id}: 三階切分加總 ≠ 總額`);
  }

  return { errors, info };
}

export interface Totals {
  nodes: number;
  bosses: number;
  byChapter: { chapterId: number; count: number; exp: number; coins: number }[];
  exp: number;
  coins: number;
  milestoneExp: number;
  milestoneCoins: number;
  curveTotal: number;
}

export function computeTotals(c: Curriculum): Totals {
  const active = c.quests.filter((q) => !q.isRetired);
  return {
    nodes: active.length,
    bosses: active.filter((q) => q.isBoss).length,
    byChapter: c.chapters.map((ch) => {
      const qs = active.filter((q) => q.chapterId === ch.id);
      return {
        chapterId: ch.id,
        count: qs.length,
        exp: qs.reduce((s, q) => s + q.rewardExp, 0),
        coins: qs.reduce((s, q) => s + q.rewardCoins, 0),
      };
    }),
    exp: active.reduce((s, q) => s + q.rewardExp, 0),
    coins: active.reduce((s, q) => s + q.rewardCoins, 0),
    milestoneExp: c.milestones.reduce((s, m) => s + m.bonusExp, 0),
    milestoneCoins: c.milestones.reduce((s, m) => s + m.bonusCoins, 0),
    curveTotal: c.levelCurve.reduce((s, x) => s + x, 0),
  };
}

export interface SimRow {
  session: number;
  chapterId: number;
  totalExp: number;
  coinsEarned: number;
  level: number;
}

/**
 * 52 次練習的收入模擬（spec §11 Step 0）。
 * 每章依節奏表的練習次數平均分配該章節點收入；每次練習 = 出席 ＋ 教練獎勵均值 ＋ 里程碑。
 * @param tierRate 節點收入達成率（1 = 全金牌；0.75 ≈ spec §4.4「約 75% 階級達成」）
 */
export function simulate52(
  c: Curriculum,
  opts: { sessionsPerChapter: number[]; coachExp: number; coachCoins: number; tierRate: number },
): SimRow[] {
  const rows: SimRow[] = [];
  const active = c.quests.filter((q) => !q.isRetired);
  let totalExp = 0;
  let coins = 0;
  let session = 0;
  c.chapters.forEach((ch, i) => {
    const n = opts.sessionsPerChapter[i];
    const qs = active.filter((q) => q.chapterId === ch.id);
    const chExp = qs.reduce((s, q) => s + q.rewardExp, 0) * opts.tierRate;
    const chCoins = qs.reduce((s, q) => s + q.rewardCoins, 0) * opts.tierRate;
    for (let k = 0; k < n; k++) {
      session += 1;
      const m = c.milestones.find((x) => x.count === session);
      totalExp += c.attendanceExp + opts.coachExp + chExp / n + (m?.bonusExp ?? 0);
      coins += c.attendanceCoins + opts.coachCoins + chCoins / n + (m?.bonusCoins ?? 0);
      const { level } = levelForTotalExp(Math.round(totalExp), c.levelCurve, c.maxLevel);
      rows.push({ session, chapterId: ch.id, totalExp: Math.round(totalExp), coinsEarned: Math.round(coins), level });
    }
  });
  return rows;
}
