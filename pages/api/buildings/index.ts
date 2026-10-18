import type { NextApiRequest, NextApiResponse } from 'next';
import prisma from '../../../lib/prisma';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'GET') {
    const buildings = await prisma.building.findMany({ include: { floors: { select: { id: true, name: true, order: true } } } });
    const out = buildings.map((b) => ({ id: b.id, name: b.name, address: b.address, floorCount: b.floors.length, floors: b.floors }));
    return res.json(out);
  }

  if (req.method === 'POST') {
    const { name, address, floorCount } = req.body;
    if (!name) return res.status(400).json({ error: 'name is required' });
    const count = Number(floorCount) || 0;

    try {
      const result = await prisma.$transaction(async (tx) => {
        const b = await tx.building.create({ data: { name, address: address || null, floorCount: count } });
        const floorsData = [] as any[];
        for (let i = 1; i <= count; i++) {
          floorsData.push({ name: `Floor ${i}`, order: i, buildingId: b.id });
        }
        if (floorsData.length > 0) {
          await tx.floor.createMany({ data: floorsData });
        }
        const created = await tx.building.findUnique({ where: { id: b.id }, include: { floors: true } });
        return created;
      });
      return res.json(result);
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: String(err) });
    }
  }

  res.setHeader('Allow', ['GET', 'POST']);
  res.status(405).end();
}
