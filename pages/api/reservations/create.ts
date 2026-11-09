import type { NextApiRequest, NextApiResponse } from 'next';
import prisma from '../../../lib/prisma';
import { approverIds, fmtRange, notify } from '../../../lib/notify';
import { canActFor, normalizeEmail, requireUser } from '../../../lib/auth';
import { describeSchedule, findBlockingAssignment, locationTimezone, relatedLocationIds } from '../../../lib/assignments';

async function gatherDescendants(tx: any, id: string) {
  const ids = [id];
  const stack = [id];
  while (stack.length) {
    const cur = stack.pop()!;
    const children = await tx.location.findMany({ where: { parentId: cur }, select: { id: true } });
    for (const c of children) {
      ids.push(c.id);
      stack.push(c.id);
    }
  }
  return ids;
}

async function gatherAncestors(tx: any, id: string) {
  const ids: string[] = [];
  let curId: string | null = id;
  while (curId) {
    const loc: { parentId?: string | null } | null = (await tx.location.findUnique({ where: { id: curId }, select: { parentId: true } })) as any;
    if (loc?.parentId) {
      ids.push(loc.parentId);
      curId = loc.parentId;
    } else {
      curId = null;
    }
  }
  return ids;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).end();
  const actor = await requireUser(req, res);
  if (!actor) return;
  // userId is optional: defaults to the signed-in user; admins/managers may book for someone else (id or email)
  const { locationId, userId, start, end, includeChildren } = req.body;
  if (!locationId || !start || !end) return res.status(400).json({ error: 'Missing params' });

  const startDate = new Date(start);
  const endDate = new Date(end);
  if (isNaN(startDate.getTime()) || isNaN(endDate.getTime()) || startDate >= endDate) return res.status(400).json({ error: 'Invalid date range' });

  try {
    let userRecord = actor;
    if (userId && userId !== actor.id) {
      const target = await prisma.user.findFirst({ where: { OR: [{ id: userId }, { email: normalizeEmail(String(userId)) }] } });
      if (!target || !target.active) return res.status(404).json({ error: 'Staff member not found' });
      if (!(await canActFor(actor, target.id))) return res.status(403).json({ error: 'You can only book for yourself or your direct reports' });
      userRecord = target;
    }

    // locations flagged requiresApproval hold the booking as pending unless the booker is an admin or the named approver
    const loc = await prisma.location.findUnique({ where: { id: locationId }, select: { label: true, requiresApproval: true, approverId: true } });
    if (!loc) return res.status(404).json({ error: 'Location not found' });
    const autoApproved = !loc.requiresApproval || actor.role === 'ADMIN' || loc.approverId === actor.id;

    const result = await prisma.$transaction(async (tx) => {
      // assigned seats: someone else's approved schedule on this location, its parent or its children blocks booking
      const blocking = await findBlockingAssignment(tx, await relatedLocationIds(tx, locationId), startDate, endDate);
      if (blocking) throw new Error(`${blocking.location.label} is assigned to ${blocking.userId === userRecord.id ? 'you' : blocking.user.name || blocking.user.email} at that time (${describeSchedule(blocking)})`);

      let locationIds = [locationId];
      if (includeChildren) {
        locationIds = await gatherDescendants(tx, locationId);
      } else {
        // also check ancestors to avoid reserving a child when parent is reserved
        const ancestors = await gatherAncestors(tx, locationId);
        if (ancestors.length > 0) {
          const overlapParent = await tx.reservation.findFirst({ where: { locationId: { in: ancestors }, AND: [{ start: { lt: endDate } }, { end: { gt: startDate } }] } });
          if (overlapParent) throw new Error('Parent location already reserved for this time');
        }
        // also check descendants: if any child is reserved, disallow reserving the parent unless includeChildren is true
        const allDesc = await gatherDescendants(tx, locationId); // includes the parent
        const descendantsOnly = allDesc.filter((id: string) => id !== locationId);
        if (descendantsOnly.length > 0) {
          const overlapChild = await tx.reservation.findFirst({ where: { locationId: { in: descendantsOnly }, AND: [{ start: { lt: endDate } }, { end: { gt: startDate } }] } });
          if (overlapChild) throw new Error('One or more sublocations are already reserved for this time');
        }
      }

      // check overlaps across all affected locationIds
      const overlap = await tx.reservation.findFirst({ where: { locationId: { in: locationIds }, AND: [{ start: { lt: endDate } }, { end: { gt: startDate } }] } });
      if (overlap) throw new Error('Time slot already reserved for one of the affected locations');

      // create reservations for all affected locationIds
      const created: any[] = [];
      for (const lid of locationIds) {
        const r = await tx.reservation.create({ data: { locationId: lid, userId: userRecord.id, start: startDate, end: endDate, approved: autoApproved } });
        created.push(r);
      }
      return created;
    });

    // notifications never fail the booking
    const when = fmtRange(startDate, endDate, await locationTimezone(prisma, locationId));
    if (autoApproved) {
      await notify(userRecord.id, { title: `${loc.label} reserved`, body: when, link: '/' }, actor.id);
    } else {
      await notify(userRecord.id, { title: `${loc.label} is awaiting approval`, body: when, link: '/' });
      await notify(await approverIds(loc.approverId), { title: 'Reservation needs approval', body: `${userRecord.name || userRecord.email} requested ${loc.label}, ${when}`, link: '/assignments' }, actor.id);
    }

    return res.json(result);
  } catch (err: any) {
    console.error(err);
    return res.status(409).json({ error: err.message || 'Conflict' });
  }
}
