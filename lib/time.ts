// Timezone helpers built on Intl so we don't need a date library.
// Seat assignments are stored as wall-clock times ("Mon-Fri 8:00-17:00") in the building's timezone,
// while reservations are stored as UTC instants; these helpers convert between the two.

export const DEFAULT_TIMEZONE = process.env.APP_TIMEZONE || Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';

export function isValidTimezone(tz: string) {
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: tz });
    return true;
  } catch {
    return false;
  }
}

export type WallClock = { ymd: string; dow: number; minute: number };

const fmtCache = new Map<string, Intl.DateTimeFormat>();
function formatter(tz: string) {
  let f = fmtCache.get(tz);
  if (!f) {
    f = new Intl.DateTimeFormat('en-US', { timeZone: tz, hourCycle: 'h23', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit' });
    fmtCache.set(tz, f);
  }
  return f;
}

function parts(date: Date, tz: string) {
  const out: Record<string, number> = {};
  for (const p of formatter(tz).formatToParts(date)) if (p.type !== 'literal') out[p.type] = Number(p.value);
  return out as { year: number; month: number; day: number; hour: number; minute: number; second: number };
}

/** Local date, weekday (0 = Sunday) and minute-of-day of an instant in the given zone. */
export function toWallClock(date: Date, tz: string): WallClock {
  const p = parts(date, tz);
  const ymd = `${p.year}-${String(p.month).padStart(2, '0')}-${String(p.day).padStart(2, '0')}`;
  return { ymd, dow: new Date(Date.UTC(p.year, p.month - 1, p.day)).getUTCDay(), minute: p.hour * 60 + p.minute };
}

/** UTC instant for a wall-clock time (YYYY-MM-DD + minute-of-day, minute may be 1440) in the given zone. */
export function fromWallClock(ymd: string, minute: number, tz: string): Date {
  const [y, m, d] = ymd.split('-').map(Number);
  const guess = Date.UTC(y, m - 1, d, 0, minute);
  // offset of the zone at that moment; repeat once so DST transitions settle
  let ts = guess;
  for (let i = 0; i < 2; i++) {
    const p = parts(new Date(ts), tz);
    const asUtc = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second);
    ts = guess - (asUtc - ts);
  }
  return new Date(ts);
}

export function addDays(ymd: string, n: number) {
  const [y, m, d] = ymd.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d + n)).toISOString().slice(0, 10);
}

export function dowOf(ymd: string) {
  const [y, m, d] = ymd.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d)).getUTCDay();
}

/**
 * Split an instant range into per-local-day minute intervals, e.g. a reservation from
 * 22:00 Mon to 02:00 Tue becomes [{Mon, 1320-1440}, {Tue, 0-120}].
 */
export function splitByLocalDay(start: Date, end: Date, tz: string) {
  const s = toWallClock(start, tz);
  const e = toWallClock(end, tz);
  const out: Array<{ ymd: string; dow: number; startMinute: number; endMinute: number }> = [];
  for (let ymd = s.ymd; ymd <= e.ymd; ymd = addDays(ymd, 1)) {
    const startMinute = ymd === s.ymd ? s.minute : 0;
    const endMinute = ymd === e.ymd ? e.minute : 1440;
    if (endMinute > startMinute) out.push({ ymd, dow: dowOf(ymd), startMinute, endMinute });
  }
  return out;
}

export function isYmd(s: unknown): s is string {
  return typeof s === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(s);
}
