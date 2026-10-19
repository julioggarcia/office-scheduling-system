import type { NextApiRequest, NextApiResponse } from 'next';
import prisma from '../../../lib/prisma';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { id } = req.query as { id: string };
  if (!id) return res.status(400).json({ error: 'Missing id' });

  if (req.method === 'PUT') {
    const { label, type, points, parentId } = req.body;
    try {
      const data: any = {};
      if (label !== undefined) data.label = label;
      if (type !== undefined) data.type = type;
      if (parentId !== undefined) data.parentId = parentId; // allow null to clear parent
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
