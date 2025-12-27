// src/shared/dates.ts

/**
 * Defaults:
 * - from: 2001-01-01
 * - to:   now minus 6 months
 */

export function toISODateInputValue(d: Date): string {
  // YYYY-MM-DD in local time (good for <input type="date">)
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

export function parseISODateInputValue(v: string): Date | null {
  // expects YYYY-MM-DD
  if (!v || !/^\d{4}-\d{2}-\d{2}$/.test(v)) return null;
  const [y, m, d] = v.split("-").map((x) => Number(x));
  if (!y || !m || !d) return null;
  const dt = new Date(y, m - 1, d, 0, 0, 0, 0);
  return Number.isNaN(dt.getTime()) ? null : dt;
}

export function defaultFromDate(): Date {
  return new Date(2001, 0, 1, 0, 0, 0, 0);
}

export function defaultToDateMinusMonths(months: number): Date {
  const now = new Date();
  const d = new Date(now.getTime());
  d.setMonth(d.getMonth() - months);

  // if date overflowed (e.g., subtracting months from 31st),
  // JS will roll to next month. Keep it stable by clamping:
  // move to last day of target month if needed.
  const targetMonth = d.getMonth();
  while (d.getMonth() !== targetMonth) d.setDate(d.getDate() - 1);

  d.setHours(0, 0, 0, 0);
  return d;
}

export function clampRange(from: Date, to: Date): { from: Date; to: Date } {
  const a = new Date(from.getTime());
  const b = new Date(to.getTime());
  if (a.getTime() <= b.getTime()) return { from: a, to: b };
  return { from: b, to: a };
}

export function withinRange(ts: number, from: Date, to: Date): boolean {
  const f = from.getTime();
  const t = to.getTime();
  return ts >= f && ts <= t;
}
