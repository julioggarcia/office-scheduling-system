import type { NextApiRequest, NextApiResponse } from 'next';
import prisma from '../../../lib/prisma';
import { canActFor, requireUser } from '../../../lib/auth';
import { locationTimezone } from '../../../lib/assignments';
import { fmtRange, notify } from '../../../lib/notify';

/**
 * Gives back part (or all) of a booking: { reservationId, from, to }.
 * Covers cancelling, leaving early (release from now to the end) and freeing one hour in the middle.
 * A booking made with "include children" is several rows with the same user and times; they are released together.
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).end();
  const actor = await requireUser(req, res);
  if (!actor) return;

  const { reservationId, from, to } = req.body || {};
  const fromDate = new Date(from);
  const toDate = new Date(to);
  if (!reservationId || isNaN(fromDate.getTime()) || isNaN(toDate.getTime()) || fromDate >= toDate) return res.status(400).json({ error: 'Invalid time range' });

  const target = await prisma.reservation.findUnique({ where: { id: reservationId }, include: { location: { select: { label: true } } } });
  if (!target) return res.status(404).json({ error: 'Reservation not found' });
  if (!(await canActFor(actor, target.userId))) return res.status(403).json({ error: 'You can only cancel your own reservations' });
  if (toDate <= new Date()) return res.status(400).json({ error: 'That time has already passed' });

  const siblings = await prisma.reservation.findMany({ where: { userId: target.userId, start: target.start, end: target.end } });
  if (fromDate >= target.end || toDate <= target.start) return res.status(400).json({ error: 'That time is outside the reservation' });

  await prisma.$transaction(async (tx) => {
    for (const r of siblings) {
      if (fromDate <= r.start && toDate >= r.end) {
        await tx.reservation.delete({ where: { id: r.id } });
      } else if (fromDate <= r.start) {
        await tx.reservation.update({ where: { id: r.id }, data: { start: toDate } });
      } else if (toDate >= r.end) {
        await tx.reservation.update({ where: { id: r.id }, data: { end: fromDate } });
      } else {
        // freeing the middle: keep the first part here and book the rest again
        await tx.reservation.update({ where: { id: r.id }, data: { end: fromDate } });
        await tx.reservation.create({ data: { locationId: r.locationId, userId: r.userId, start: toDate, end: r.end, approved: r.approved } });
      }
    }
  });

  const tz = await locationTimezone(prisma, target.locationId);
  await notify(target.userId, { title: `${target.location.label} reservation cancelled`, body: fmtRange(fromDate, toDate, tz), link: '/' }, actor.id);
  return res.json({ ok: true });
}
