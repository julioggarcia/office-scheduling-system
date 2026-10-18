import type { NextApiRequest, NextApiResponse } from 'next';
import prisma from '../../../lib/prisma';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).end();
  const { buildingId, floorId, svg } = req.body;
  if (!buildingId || !floorId || !svg) return res.status(400).json({ error: 'buildingId, floorId and svg required' });

  try {
    // update floor with svg content
    const f = await prisma.floor.update({ where: { id: floorId }, data: { svgContent: svg } });
    return res.json({ ok: true, floor: { id: f.id, name: f.name } });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: String(err) });
  }
}
