import type { NextApiRequest, NextApiResponse } from 'next';
import prisma from '../../../lib/prisma';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'GET') {
    const locations = await prisma.location.findMany({ include: { polygon: true, floor: true } });
    return res.json(locations);
  }
  if (req.method === 'POST') {
    const { label, floorId, type, imageUrl, points } = req.body;
    const loc = await prisma.location.create({ data: { label, floorId, type, imageUrl } });
    if (points) {
      await prisma.locationPolygon.create({ data: { locationId: loc.id, points: JSON.stringify(points) } });
    }
    return res.json(loc);
  }
  res.setHeader('Allow', ['GET', 'POST']);
  res.status(405).end();
}
