import type { Prisma, PrismaClient, SeatAssignment } from '@prisma/client';
import { DEFAULT_TIMEZONE, fromWallClock, isYmd, splitByLocalDay } from './time';

type Db = PrismaClient | Prisma.TransactionClient;

export const ACTIVE_STATUSES = ['APPROVED'];

export function parseDays(daysOfWeek: string): number[] {
  return daysOfWeek.split(',').map((d) => Number(d)).filter((d) => Number.isInteger(d) && d >= 0 && d <= 6);
}

/** Validates request input and returns the normalized fields, or an error message. */
export function validateSchedule(input: any): { error: string } | { daysOfWeek: string; startMinute: number; endMinute: number; startDate: string; endDate: string | null } {
  const days = Array.isArray(input.days) ? Array.from(new Set<number>(input.days.map(Number))).filter((d) => d >= 0 && d <= 6).sort() : [];
  if (!days.length) return { error: 'Pick at least one day' };
  const startMinute = Number(input.startMinute);
  const endMinute = Number(input.endMinute);
  if (!Number.isInteger(startMinute) || !Number.isInteger(endMinute) || startMinute < 0 || endMinute > 1440 || startMinute >= endMinute) {
    return { error: 'End time must be after start time' };
  }
  if (!isYmd(input.startDate)) return { error: 'Start date is required' };
  const endDate = input.endDate ? String(input.endDate) : null;
  if (endDate && (!isYmd(endDate) || endDate < input.startDate)) return { error: 'End date must be on or after the start date' };
  return { daysOfWeek: days.join(','), startMinute, endMinute, startDate: input.startDate, endDate };
}

/** Does an assignment apply on this local date? */
export function coversDate(a: Pick<SeatAssignment, 'daysOfWeek' | 'startDate' | 'endDate'>, ymd: string, dow: number) {
  return a.startDate <= ymd && (!a.endDate || ymd <= a.endDate) && parseDays(a.daysOfWeek).includes(dow);
}

/** True when two weekly schedules can ever be in effect at the same time. */
export function schedulesOverlap(a: SeatAssignment, b: SeatAssignment) {
  const daysA = parseDays(a.daysOfWeek);
  if (!parseDays(b.daysOfWeek).some((d) => daysA.includes(d))) return false;
  if (a.endDate && a.endDate < b.startDate) return false;
  if (b.endDate && b.endDate < a.startDate) return false;
  return a.startMinute < b.endMinute && b.startMinute < a.endMinute;
}

/** The location itself plus its ancestors and descendants: booking any of them conflicts with the others. */
export async function relatedLocationIds(db: Db, locationId: string) {
  const ids = new Set<string>([locationId]);
  let cur: string | null = locationId;
  while (cur) {
    const loc: { parentId: string | null } | null = await db.location.findUnique({ where: { id: cur }, select: { parentId: true } });
    cur = loc?.parentId && !ids.has(loc.parentId) ? loc.parentId : null;
    if (cur) ids.add(cur);
  }
  const stack = [locationId];
  while (stack.length) {
    const children = await db.location.findMany({ where: { parentId: stack.pop()! }, select: { id: true } });
    for (const c of children) {
      if (!ids.has(c.id)) {
        ids.add(c.id);
        stack.push(c.id);
      }
    }
  }
  return Array.from(ids);
}

export async function locationTimezone(db: Db, locationId: string) {
  const loc = await db.location.findUnique({ where: { id: locationId }, select: { floor: { select: { building: { select: { timezone: true } } } } } });
  return loc?.floor.building.timezone || DEFAULT_TIMEZONE;
}

/**
 * First approved assignment that blocks reserving [start, end) on any of `locationIds`.
 * The assigned person themself is never blocked by their own assignment.
 */
export async function findBlockingAssignment(db: Db, locationIds: string[], start: Date, end: Date, reservingUserId: string) {
  const assignments = await db.seatAssignment.findMany({
    where: { locationId: { in: locationIds }, status: { in: ACTIVE_STATUSES }, userId: { not: reservingUserId } },
    include: { user: { select: { name: true, email: true } }, location: { select: { label: true } } },
  });
  if (!assignments.length) return null;
  const tz = await locationTimezone(db, locationIds[0]);
  for (const seg of splitByLocalDay(start, end, tz)) {
    for (const a of assignments) {
      if (coversDate(a, seg.ymd, seg.dow) && a.startMinute < seg.endMinute && seg.startMinute < a.endMinute) return a;
    }
  }
  return null;
}

/** Concrete blocked time ranges (UTC instants) produced by assignments on one local date. */
export function blockedIntervalsForDate<T extends SeatAssignment>(assignments: T[], ymd: string, tz: string) {
  const [y, m, d] = ymd.split('-').map(Number);
  const dow = new Date(Date.UTC(y, m - 1, d)).getUTCDay();
  return assignments
    .filter((a) => coversDate(a, ymd, dow))
    .map((a) => ({ assignment: a, start: fromWallClock(ymd, a.startMinute, tz), end: fromWallClock(ymd, a.endMinute, tz) }));
}

/** Existing approved assignments that would clash with `a` on the same or related locations. */
export async function findOverlappingAssignments(db: Db, a: SeatAssignment) {
  const related = await relatedLocationIds(db, a.locationId);
  const others = await db.seatAssignment.findMany({
    where: { id: { not: a.id }, locationId: { in: related }, status: { in: ACTIVE_STATUSES } },
    include: { user: { select: { name: true, email: true } }, location: { select: { label: true } } },
  });
  return others.filter((o) => schedulesOverlap(a, o));
}

/** Upcoming reservations by other people that fall inside an assignment's schedule. */
export async function findConflictingReservations(db: Db, a: SeatAssignment) {
  const related = await relatedLocationIds(db, a.locationId);
  const tz = await locationTimezone(db, a.locationId);
  const now = new Date();
  const rangeStart = fromWallClock(a.startDate, 0, tz);
  const candidates = await db.reservation.findMany({
    where: {
      locationId: { in: related },
      userId: { not: a.userId },
      end: { gt: rangeStart > now ? rangeStart : now },
      ...(a.endDate ? { start: { lt: fromWallClock(a.endDate, 1440, tz) } } : {}),
    },
    include: { user: { select: { name: true, email: true } }, location: { select: { label: true } } },
    orderBy: { start: 'asc' },
  });
  return candidates.filter((r) =>
    splitByLocalDay(r.start, r.end, tz).some((seg) => coversDate(a, seg.ymd, seg.dow) && a.startMinute < seg.endMinute && seg.startMinute < a.endMinute)
  );
}

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export function describeSchedule(a: Pick<SeatAssignment, 'daysOfWeek' | 'startMinute' | 'endMinute'>) {
  const fmt = (m: number) => `${String(Math.floor(m / 60) % 24).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
  return `${parseDays(a.daysOfWeek).map((d) => DAY_NAMES[d]).join(', ')} ${fmt(a.startMinute)}–${a.endMinute === 1440 ? '24:00' : fmt(a.endMinute)}`;
}
