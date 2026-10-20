import type { NextApiRequest, NextApiResponse } from 'next';
import prisma from '../../../lib/prisma';
import { canActFor, requireUser } from '../../../lib/auth';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const actor = await requireUser(req, res);
  if (!actor) return;
  const { id } = req.query as { id: string };
  if (!id) return res.status(400).json({ error: 'Missing id' });

  const existing = await prisma.reservation.findUnique({ where: { id }, select: { userId: true } });
  if (!existing) return res.status(404).json({ error: 'Not found' });
  // owners can cancel their own; admins and the owner's manager can cancel or edit
  const isOwner = existing.userId === actor.id;
  const canManage = actor.role === 'ADMIN' || (!isOwner && (await canActFor(actor, existing.userId)));
  if (req.method === 'DELETE' ? !(isOwner || canManage) : !canManage) return res.status(403).json({ error: 'Not allowed' });

  if (req.method === 'DELETE') {
    try {
      await prisma.reservation.delete({ where: { id } });
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
      return res.json({ ok: true, updated });
    } catch (err) {
      console.error('Failed updating reservation', err);
      return res.status(500).json({ error: 'Failed updating' });
    }
  }

  res.setHeader('Allow', ['DELETE','PUT']);
  return res.status(405).end();
}
