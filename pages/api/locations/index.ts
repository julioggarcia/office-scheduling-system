import type { NextApiRequest, NextApiResponse } from 'next';
import prisma from '../../../lib/prisma';
import { requireUser } from '../../../lib/auth';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // reads: any signed-in user; changes: admins only
  if (!(await requireUser(req, res, ...(req.method === 'GET' ? [] : (['ADMIN'] as const))))) return;
  if (req.method === 'GET') {
    const { floorId } = req.query as { floorId?: string };
    const where: any = {};
    if (floorId) where.floorId = floorId;
    const locations = await prisma.location.findMany({ where, include: { polygon: true, floor: true, children: true } });
    return res.json(locations);
  }
  if (req.method === 'POST') {
    const { label, floorId, type, imageUrl, points, parentId } = req.body;
    const data: any = { label, floorId, type, imageUrl };
    if (parentId) data.parentId = parentId;
    const loc = await prisma.location.create({ data });
    if (points) {
      await prisma.locationPolygon.create({ data: { locationId: loc.id, points: JSON.stringify(points) } });
    }
    return res.json(loc);
  }
  res.setHeader('Allow', ['GET', 'POST']);
  res.status(405).end();
}
