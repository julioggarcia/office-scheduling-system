import type { NextApiRequest, NextApiResponse } from 'next';
import prisma from '../../../lib/prisma';
import { canActFor, requireUser } from '../../../lib/auth';
import { fmtRange, notify } from '../../../lib/notify';
import { locationTimezone } from '../../../lib/assignments';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const actor = await requireUser(req, res);
  if (!actor) return;
  const { id } = req.query as { id: string };
  if (!id) return res.status(400).json({ error: 'Missing id' });

  const existing = await prisma.reservation.findUnique({ where: { id }, select: { userId: true, locationId: true, start: true, end: true, approved: true, location: { select: { label: true, approverId: true } } } });
  if (!existing) return res.status(404).json({ error: 'Not found' });
  // owners can cancel their own; admins and the owner's manager can cancel or edit
  const isOwner = existing.userId === actor.id;
  const canManage = actor.role === 'ADMIN' || (!isOwner && (await canActFor(actor, existing.userId)));
  // the location's named approver can approve or reject (cancel) its requests, nothing else
  const isApprover = existing.location.approverId === actor.id;
  if (req.method === 'DELETE' ? !(isOwner || canManage || isApprover) : !(canManage || (isApprover && Object.keys(req.body || {}).every((k) => k === 'approved')))) return res.status(403).json({ error: 'Not allowed' });

  if (req.method === 'DELETE') {
    try {
      await prisma.reservation.delete({ where: { id } });
      // someone else cancelled it: tell the owner (a pending one that gets removed is a decline)
      const when = fmtRange(existing.start, existing.end, await locationTimezone(prisma, existing.locationId));
      await notify(existing.userId, { title: `${existing.location.label} ${existing.approved ? 'reservation cancelled' : 'request declined'}`, body: when, link: '/' }, actor.id);
      return res.json({ ok: true });
    } catch (err) {
      console.error('Failed deleting reservation', err);
      return res.status(500).json({ error: 'Failed deleting' });
    }
  }

  if (req.method === 'PUT') {
    const { approved, start, end, userId, locationId } = req.body;
    try {
      const data: any = {};
      if (approved !== undefined) data.approved = approved;
      if (start) data.start = new Date(start);
      if (end) data.end = new Date(end);
      if (userId) data.userId = userId;
      if (locationId) data.locationId = locationId;
      const updated = await prisma.reservation.update({ where: { id }, data });
      const when = fmtRange(updated.start, updated.end, await locationTimezone(prisma, updated.locationId));
      if (approved !== undefined && approved !== existing.approved) {
        await notify(updated.userId, { title: `${existing.location.label} ${approved ? 'request approved' : 'approval withdrawn'}`, body: when, link: '/' }, actor.id);
      } else if (start || end || locationId || userId) {
        await notify(updated.userId, { title: `${existing.location.label} reservation changed`, body: when, link: '/' }, actor.id);
      }
      return res.json({ ok: true, updated });
    } catch (err) {
      console.error('Failed updating reservation', err);
      return res.status(500).json({ error: 'Failed updating' });
    }
  }

  res.setHeader('Allow', ['DELETE','PUT']);
  return res.status(405).end();
}
