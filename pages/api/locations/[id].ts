import type { NextApiRequest, NextApiResponse } from 'next';
import prisma from '../../../lib/prisma';
import { requireUser } from '../../../lib/auth';
import { notify } from '../../../lib/notify';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // reads: any signed-in user; changes: admins only
  const actor = await requireUser(req, res, ...(req.method === 'GET' ? [] : (['ADMIN'] as const)));
  if (!actor) return;
  const { id } = req.query as { id: string };
  if (!id) return res.status(400).json({ error: 'Missing id' });

  if (req.method === 'PUT') {
    const { label, type, points, parentId, requiresApproval, approverId } = req.body;
    try {
      const before = await prisma.location.findUnique({ where: { id }, select: { approverId: true } });
      const data: any = {};
      if (label !== undefined) data.label = label;
      if (type !== undefined) data.type = type;
      if (parentId !== undefined) data.parentId = parentId; // allow null to clear parent
      if (requiresApproval !== undefined) {
        data.requiresApproval = !!requiresApproval;
        data.approverId = requiresApproval ? approverId || null : null; // null approver = any admin
      }
      const updated = await prisma.location.update({ where: { id }, data });
      if (points) {
        const ptsStr = JSON.stringify(points);
        const existing = await prisma.locationPolygon.findUnique({ where: { locationId: id } });
        if (existing) {
          await prisma.locationPolygon.update({ where: { id: existing.id }, data: { points: ptsStr } });
        } else {
          await prisma.locationPolygon.create({ data: { locationId: id, points: ptsStr } });
        }
      }
      if (updated.approverId && updated.approverId !== before?.approverId) {
        await notify(updated.approverId, { title: `You approve reservations for ${updated.label}`, body: 'New requests for this space will be sent to you.', link: '/assignments' }, actor.id);
      }
      return res.json({ ok: true, updated });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: 'Failed to update' });
    }
  }

  if (req.method === 'DELETE') {
    try {
      // delete polygon first
      await prisma.locationPolygon.deleteMany({ where: { locationId: id } });
      await prisma.location.delete({ where: { id } });
      return res.json({ ok: true });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: 'Failed to delete' });
    }
  }

  res.setHeader('Allow', ['PUT', 'DELETE']);
  res.status(405).end();
}
