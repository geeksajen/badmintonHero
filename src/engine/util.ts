/** 本地時區的 YYYY-MM-DD */
export function toDateStr(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function parseDateStr(s: string): Date {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, (m ?? 1) - 1, d ?? 1);
}

export function daysBetween(fromDateStr: string, now: Date): number {
  const from = parseDateStr(fromDateStr);
  const to = parseDateStr(toDateStr(now));
  return Math.round((to.getTime() - from.getTime()) / 86_400_000);
}

/** 課程第幾週（第 1 天 = 第 1 週） */
export function courseWeek(courseStartDate: string, now: Date): number {
  return Math.max(1, Math.floor(daysBetween(courseStartDate, now) / 7) + 1);
}

/** 該週週一的日期字串，作為 stockPerWeek 的週次 key */
export function weekKey(now: Date): string {
  const d = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const dow = (d.getDay() + 6) % 7; // Mon=0
  d.setDate(d.getDate() - dow);
  return toDateStr(d);
}

export function newId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

export function uniq<T>(arr: T[]): T[] {
  return Array.from(new Set(arr));
}
