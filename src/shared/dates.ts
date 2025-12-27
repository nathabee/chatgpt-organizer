export function startOfDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

export function monthsAgo(n: number, from = new Date()): Date {
  const d = new Date(from);
  d.setMonth(d.getMonth() - n);
  return d;
}

export function defaultFromDate(): Date {
  return new Date("2001-01-01T00:00:00Z");
}

export function defaultToDate(): Date {
  return monthsAgo(6);
}

export function isDateInRange(
  date: Date,
  from: Date,
  to: Date
): boolean {
  const t = date.getTime();
  return t >= from.getTime() && t <= to.getTime();
}
