import type { NextApiRequest, NextApiResponse } from 'next';
import prisma from '../../../lib/prisma';
import { canActFor, requireUser } from '../../../lib/auth';
import { ACTIVE_STATUSES, blockedIntervalsForDate, findOverlappingAssignments, describeSchedule, locationTimezone, validateSchedule } from '../../../lib/assignments';
import { ApprovalConflict, approveAssignment } from '../../../lib/assignmentApproval';
import { sendMail } from '../../../lib/nodemailer';
import { isYmd } from '../../../lib/time';

const include = {
  user: { select: { id: true, name: true, email: true, managerId: true } },
  requestedBy: { select: { id: true, name: true, email: true } },
  reviewedBy: { select: { id: true, name: true, email: true } },
  location: { select: { id: true, label: true, type: true, floor: { select: { id: true, name: true, building: { select: { id: true, name: true } } } } } },
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const actor = await requireUser(req, res);
  if (!actor) return;

  if (req.method === 'GET') {
    const { view, locationIds, date } = req.query as { view?: string; locationIds?: string; date?: string };

    // blocked hours for the day schedule: approved assignments on these locations for one local date
    if (locationIds && date) {
      if (!isYmd(date)) return res.status(400).json({ error: 'date must be YYYY-MM-DD' });
      const ids = locationIds.split(',').map((s) => s.trim()).filter(Boolean);
      if (!ids.length) return res.json({ blocks: [] });
      const tz = await locationTimezone(prisma, ids[0]);
      const assignments = await prisma.seatAssignment.findMany({ where: { locationId: { in: ids }, status: { in: ACTIVE_STATUSES } }, include });
      const blocks = blockedIntervalsForDate(assignments, date, tz).map(({ assignment: a, start, end }) => ({
        id: a.id, locationId: a.locationId, locationLabel: a.location.label, userId: a.userId, userName: a.user.name || a.user.email, start, end,
      }));
      return res.json({ timezone: tz, blocks });
    }

    let where: any;
    if (view === 'review') {
      if (actor.role === 'ADMIN') where = { status: 'PENDING' };
      else if (actor.role === 'MANAGER') where = { status: 'PENDING', user: { managerId: actor.id } };
      else return res.json([]);
    } else if (view === 'all') {
      if (actor.role === 'ADMIN') where = {};
      else if (actor.role === 'MANAGER') where = { OR: [{ userId: actor.id }, { user: { managerId: actor.id } }] };
      else where = { userId: actor.id };
    } else {
      where = { OR: [{ userId: actor.id }, { requestedById: actor.id }] };
    }
    const rows = await prisma.seatAssignment.findMany({ where, include, orderBy: [{ status: 'asc' }, { createdAt: 'desc' }] });
    return res.json(rows.map((r) => ({ ...r, schedule: describeSchedule(r) })));
  }

  if (req.method === 'POST') {
    const { locationId, note, cancelConflicts } = req.body || {};
    const userId: string = req.body?.userId || actor.id;
    if (!locationId) return res.status(400).json({ error: 'Pick a location' });
    if (!(await canActFor(actor, userId))) return res.status(403).json({ error: 'You can only request seats for yourself or your direct reports' });

    const schedule = validateSchedule(req.body || {});
    if ('error' in schedule) return res.status(400).json({ error: schedule.error });

    const [location, target] = await Promise.all([
      prisma.location.findUnique({ where: { id: locationId } }),
      prisma.user.findUnique({ where: { id: userId } }),
    ]);
    if (!location) return res.status(404).json({ error: 'Location not found' });
    if (!target || !target.active) return res.status(404).json({ error: 'Staff member not found' });

    const created = await prisma.seatAssignment.create({
      data: { ...schedule, locationId, userId, requestedById: actor.id, note: note || null, status: 'PENDING' },
    });

    // Admins, and managers requesting for a direct report, don't need anyone else's sign-off.
    const autoApprove = actor.role === 'ADMIN' || (actor.role === 'MANAGER' && target.managerId === actor.id);
    try {
      if (autoApprove) {
        const result = await approveAssignment(created, actor, { cancelConflicts: !!cancelConflicts });
        return res.status(201).json(result.assignment);
      }
      // Don't let staff queue requests for a seat that's already taken at those times.
      const overlapping = await findOverlappingAssignments(prisma, created);
      if (overlapping.length) {
        throw new ApprovalConflict('ASSIGNMENT_OVERLAP', 'This seat is already assigned to someone else during those hours', overlapping.map((o) => ({
          id: o.id, user: o.user.name || o.user.email, location: o.location.label, schedule: describeSchedule(o),
        })));
      }
    } catch (err) {
      await prisma.seatAssignment.delete({ where: { id: created.id } });
      if (err instanceof ApprovalConflict) return res.status(409).json({ error: err.message, code: err.code, details: err.details });
      throw err;
    }

    // let the approver know (best-effort)
    try {
      const approver = target.managerId ? await prisma.user.findUnique({ where: { id: target.managerId } }) : null;
      const to = approver?.email || process.env.ADMIN_EMAIL;
      if (to) await sendMail({ to, subject: 'Seat assignment request', text: `${target.name || target.email} requested ${location.label} as their assigned seat: ${describeSchedule(created)}.` });
    } catch (err) {
      console.error('Failed sending request email', err);
    }
    return res.status(201).json(await prisma.seatAssignment.findUnique({ where: { id: created.id }, include }));
  }

  res.setHeader('Allow', ['GET', 'POST']);
  return res.status(405).end();
}
