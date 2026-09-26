/**
 * 實戰筆記（spec §12.7）：把 App 已經記錄的資料整理成 NOTES.md 需要的內容，
 * 讓家長不必每次練習後手寫「第幾次練習做到什麼」。
 *
 * 資料來源：
 * - 進度文件（已在監聽中，0 額外讀取）：各節點解鎖／各階級頒發時的 sessionCount、最佳成績、送審次數
 * - 練習紀錄（只在匯出時讀一次）：日期、教學筆記、今日一句話
 *
 * 舊資料沒有 unlockedAtSession／tierSessions：銅牌依 completedAt 的日期對照練習紀錄推算，
 * 解鎖時間依前置節點的銅牌推算；推不出來的顯示「—」。
 */
import type { ChapterId, Curriculum, Player, PracticeSession, QuestNode, QuestProgress, QuestProgressDoc, TierLevel } from '../types';
import { TIER_ORDER } from '../types';
import { TIER_EMOJI } from './tiers';
import { visibleNodes } from './unlock';
import { courseWeek, toDateStr } from './util';

/** 至少練了這麼多次還沒拿到銅牌，才提醒卡關 */
export const STUCK_MIN_SESSIONS = 3;

export interface NumberedSession extends PracticeSession {
  number: number;
}

/** 由舊到新編號（舊資料沒有 sessionNumber，依順序推算） */
export function numberSessions(sessions: PracticeSession[]): NumberedSession[] {
  return [...sessions]
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt))
    .map((s, i) => ({ ...s, number: s.sessionNumber ?? i + 1 }));
}

/** 某個時間點是第幾次練習：當天或之前最近的一次 */
function sessionAt(iso: string, sessions: NumberedSession[]): number | undefined {
  const day = toDateStr(new Date(iso));
  let hit: number | undefined;
  for (const s of sessions) if (s.date <= day) hit = s.number;
  return hit;
}

export interface NodeRecord {
  node: QuestNode;
  prog: QuestProgress;
  /** 第幾次練習解鎖（≥ 1） */
  unlockedAt?: number;
  /** 各階級在第幾次練習頒發 */
  tierAt: Partial<Record<TierLevel, number>>;
  /** 從解鎖到拿銅牌用了幾次練習（含頭尾） */
  sessionsToBronze?: number;
  /** 還沒拿銅牌：到目前為止已經練了幾次 */
  sessionsSoFar?: number;
}

/** 已到達（非 locked）的現役節點紀錄，依地圖順序 */
export function nodeRecords(
  c: Curriculum,
  progress: QuestProgressDoc,
  player: Player,
  sessions: NumberedSession[] = [],
): NodeRecord[] {
  const tierAtOf = (prog: QuestProgress): Partial<Record<TierLevel, number>> => {
    const t = { ...prog.tierSessions };
    if (t.bronze === undefined && prog.completedAt) t.bronze = sessionAt(prog.completedAt, sessions);
    return t;
  };

  const memo = new Map<string, number | undefined>();
  const unlockedAtOf = (node: QuestNode, depth = 0): number | undefined => {
    if (memo.has(node.id)) return memo.get(node.id);
    const prog = progress.byNodeId[node.id];
    let v: number | undefined = prog?.unlockedAtSession;
    if (v === undefined && depth < 50) {
      if (node.parentIds.length === 0) v = 1;
      else {
        const parents = node.parentIds.map((id) => progress.byNodeId[id]);
        const at = parents.map((p) => (p ? tierAtOf(p).bronze : undefined));
        if (at.every((x) => x !== undefined)) v = Math.max(...(at as number[]));
      }
    }
    if (v !== undefined) v = Math.max(1, v); // 第一次簽到前就解鎖的起點 = 第 1 次
    memo.set(node.id, v);
    return v;
  };

  return visibleNodes(c.quests)
    .filter((n) => {
      const s = progress.byNodeId[n.id]?.status;
      return s !== undefined && s !== 'locked';
    })
    .map((node) => {
      const prog = progress.byNodeId[node.id];
      const tierAt = tierAtOf(prog);
      const unlockedAt = unlockedAtOf(node);
      const rec: NodeRecord = { node, prog, unlockedAt, tierAt };
      if (unlockedAt !== undefined && tierAt.bronze !== undefined) {
        rec.sessionsToBronze = Math.max(1, tierAt.bronze - unlockedAt + 1);
      } else if (unlockedAt !== undefined && prog.status !== 'completed' && player.sessionCount >= unlockedAt) {
        rec.sessionsSoFar = player.sessionCount - unlockedAt + 1;
      }
      return rec;
    });
}

export interface StuckNode {
  record: NodeRecord;
  sessions: number;
  threshold: number;
  suggestion: string;
}

export function stuckThreshold(node: QuestNode): number {
  return Math.max(STUCK_MIN_SESSIONS, node.estimatedSessions * 2);
}

/** 卡關：練了「預估次數的兩倍」（至少 3 次）還沒拿到銅牌 */
export function findStuck(records: NodeRecord[]): StuckNode[] {
  return records.flatMap((record) => {
    const { node, prog, sessionsSoFar } = record;
    if (prog.status === 'completed' || sessionsSoFar === undefined) return [];
    const threshold = stuckThreshold(node);
    if (sessionsSoFar < threshold) return [];
    const best = prog.bestCount;
    const suggestion =
      best > 0 && best < node.tiers.bronze
        ? `最佳紀錄 ${best} ${node.unit}（銅牌要 ${node.tiers.bronze}）→ 可把銅牌門檻調成 ${best}，重新部署後會自動補發（§12.4-④）`
        : `可以在它前面加一個更簡單的支線（§12.4-②），或調低銅牌門檻（§12.4-④）`;
    return [{ record, sessions: sessionsSoFar, threshold, suggestion }];
  });
}

export interface ChapterPace {
  chapterId: ChapterId;
  name: string;
  icon: string;
  planned: number;
  /** 實際用了幾次練習（進行中 = 到目前為止） */
  actual?: number;
  done: boolean;
}

export function chapterPace(c: Curriculum, records: NodeRecord[], player: Player): ChapterPace[] {
  return c.chapters.map((ch) => {
    const weeks = ch.planWeeks[1] - ch.planWeeks[0] + 1;
    const planned = Math.round((weeks * c.plannedSessions) / c.courseWeeks);
    const recs = records.filter((r) => r.node.chapterId === ch.id);
    const bosses = c.quests.filter((q) => q.chapterId === ch.id && q.isBoss && !q.isRetired);
    const bossRecs = recs.filter((r) => r.node.isBoss);
    const done = bosses.length > 0 && bossRecs.length === bosses.length && bossRecs.every((r) => r.prog.status === 'completed');
    const starts = recs.map((r) => r.unlockedAt).filter((x): x is number => x !== undefined);
    const start = starts.length ? Math.min(...starts) : undefined;
    let actual: number | undefined;
    if (start !== undefined) {
      if (done) {
        const ends = bossRecs.map((r) => r.tierAt.bronze);
        if (ends.every((x) => x !== undefined)) actual = Math.max(...(ends as number[])) - start + 1;
      } else if (player.sessionCount >= start) {
        actual = player.sessionCount - start + 1;
      }
    }
    return { chapterId: ch.id, name: ch.name, icon: ch.icon, planned, actual, done };
  });
}

/** 某次練習拿到的獎牌：['q1_1 氣球不落地 🥉🥈', …] */
function medalsInSession(records: NodeRecord[], n: number): string[] {
  return records.flatMap((r) => {
    const tiers = TIER_ORDER.filter((t) => r.tierAt[t] === n);
    return tiers.length ? [`${r.node.title} ${tiers.map((t) => TIER_EMOJI[t]).join('')}`] : [];
  });
}

const cell = (s: string | number | undefined) =>
  s === undefined || s === '' ? '—' : String(s).replace(/\|/g, '／').replace(/\s*\n\s*/g, ' ');
const nth = (n: number | undefined) => (n === undefined ? '—' : `第 ${n} 次`);

/** 產生可直接貼進 NOTES.md 的 Markdown */
export function fieldNotesMarkdown(
  c: Curriculum,
  progress: QuestProgressDoc,
  player: Player,
  rawSessions: PracticeSession[],
  now: Date,
): string {
  const sessions = numberSessions(rawSessions);
  const records = nodeRecords(c, progress, player, sessions);
  const stuck = findStuck(records);
  const pace = chapterPace(c, records, player);
  const L: string[] = [];

  L.push(`# ${c.id} 實戰筆記（自動匯出 ${toDateStr(now)}）`, '');
  L.push(
    `> 對象：${player.name}・已練習 ${player.sessionCount} 次・課程第 ${courseWeek(player.courseStartDate, now)} 週（${player.courseStartDate} 開始）。`,
    '> 由家長控制台【實戰筆記 → 匯出】產生。「—」表示舊資料推算不出來。',
    '',
  );

  L.push('## 每次練習紀錄', '', '| 日期 | 第幾次 | 拿到的獎牌 | 教學筆記 | 今日一句話 |', '|---|---|---|---|---|');
  if (sessions.length === 0) L.push('| — | — | — | — | — |');
  for (const s of sessions) {
    L.push(`| ${s.date} | ${s.number} | ${cell(medalsInSession(records, s.number).join('、'))} | ${cell(s.teachNote)} | ${cell(s.coachNote)} |`);
  }
  L.push('');

  L.push('## 各章實際耗時 vs 規劃', '', '| 章節 | 規劃練習數 | 實際 | 差異 |', '|---|---|---|---|');
  for (const p of pace) {
    const actual = p.actual === undefined ? '—' : p.done ? String(p.actual) : `${p.actual}（進行中）`;
    const diff = p.actual === undefined || !p.done ? '' : p.actual - p.planned === 0 ? '剛好' : `${p.actual - p.planned > 0 ? '+' : ''}${p.actual - p.planned}`;
    L.push(`| ${p.icon} ${p.name} | ${p.planned} | ${actual} | ${cell(diff)} |`);
  }
  L.push('');

  L.push(
    '## 各關紀錄',
    '',
    '| id | 任務 | 門檻 🥉/🥈/🥇 | 最佳 | 解鎖 | 🥉 | 🥈 | 🥇 | 幾次練習拿到銅牌 | 送審次數 |',
    '|---|---|---|---|---|---|---|---|---|---|',
  );
  for (const r of records) {
    const { node, prog } = r;
    const toBronze = r.sessionsToBronze ?? (r.sessionsSoFar !== undefined ? `練了 ${r.sessionsSoFar} 次` : undefined);
    L.push(
      `| \`${node.id}\` | ${cell(node.title)} | ${node.tiers.bronze}/${node.tiers.silver}/${node.tiers.gold} ${node.unit} | ${prog.bestCount} | ${nth(r.unlockedAt)} | ${nth(r.tierAt.bronze)} | ${nth(r.tierAt.silver)} | ${nth(r.tierAt.gold)} | ${cell(toBronze)} | ${prog.attempts} |`,
    );
  }
  L.push('');

  L.push('## 卡關點與解法', '');
  if (stuck.length === 0) L.push('- （目前沒有卡關的節點）');
  for (const s of stuck) {
    L.push(`- \`${s.record.node.id}\` ${s.record.node.title}：已練 ${s.sessions} 次還沒拿到銅牌（預估 ${s.record.node.estimatedSessions} 次）。${s.suggestion}`);
  }
  L.push('- 解法：（自己填）', '');

  L.push('## 實際達標次數（建議下一版的門檻）', '');
  const done = records.filter((r) => r.prog.status === 'completed');
  if (done.length === 0) L.push('- （還沒有完成的節點）');
  for (const r of done) {
    const { node, prog } = r;
    const hints: string[] = [];
    if (prog.bestCount >= node.tiers.gold && (r.sessionsToBronze ?? 99) <= 1) hints.push('一次就到金牌，可能太簡單');
    if ((r.sessionsToBronze ?? 0) >= stuckThreshold(node)) hints.push('花的次數偏多，可能太難');
    L.push(
      `- \`${node.id}\` ${node.title}：銅牌門檻 ${node.tiers.bronze}，最佳 ${prog.bestCount} ${node.unit}` +
        (r.sessionsToBronze !== undefined ? `，${r.sessionsToBronze} 次練習拿到銅牌` : '') +
        (hints.length ? `（${hints.join('；')}）` : ''),
    );
  }
  L.push('', '## 下一版建議', '', '- （自己填）', '');
  return L.join('\n');
}
