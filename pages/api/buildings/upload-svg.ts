import type { NextApiRequest, NextApiResponse } from 'next';
import prisma from '../../../lib/prisma';
import { requireUser } from '../../../lib/auth';

// floorplans arrive as base64 data URLs, which easily exceed Next's 1mb default
export const config = { api: { bodyParser: { sizeLimit: '10mb' } } };

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST' && req.method !== 'DELETE') {
    res.setHeader('Allow', ['POST', 'DELETE']);
    return res.status(405).end();
  }
  if (!(await requireUser(req, res, 'ADMIN'))) return;

  if (req.method === 'DELETE') {
    const { floorId } = req.query as { floorId?: string };
    if (!floorId) return res.status(400).json({ error: 'floorId required' });
    try {
      const f = await prisma.floor.update({ where: { id: floorId }, data: { svgContent: null, imageContent: null } });
      return res.json({ ok: true, floor: { id: f.id, name: f.name } });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: String(err) });
    }
  }

  const { buildingId, floorId, svg, image } = req.body;
  if (!buildingId || !floorId) return res.status(400).json({ error: 'buildingId and floorId required' });

  try {
    // update floor with svg content or image content (data URL)
    const data: any = {};
    if (svg) data.svgContent = svg;
    if (image) data.imageContent = image;
    const f = await prisma.floor.update({ where: { id: floorId }, data });
    return res.json({ ok: true, floor: { id: f.id, name: f.name } });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: String(err) });
  }
}
