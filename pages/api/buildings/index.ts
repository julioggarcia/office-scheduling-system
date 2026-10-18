import type { NextApiRequest, NextApiResponse } from 'next';
import prisma from '../../../lib/prisma';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') return res.status(405).end();
  const buildings = await prisma.building.findMany({ include: { floors: { select: { id: true, name: true } } } });
  const out = buildings.map((b) => ({ id: b.id, name: b.name, floorCount: b.floors.length, floors: b.floors }));
  return res.json(out);
}
