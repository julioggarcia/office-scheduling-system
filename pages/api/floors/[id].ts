import type { NextApiRequest, NextApiResponse } from 'next';
import prisma from '../../../lib/prisma';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { id } = req.query as { id: string };
  if (req.method === 'GET') {
    try {
      const f = await prisma.floor.findUnique({ where: { id } });
      if (!f) return res.status(404).json({ error: 'not found' });
      return res.json(f);
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: String(err) });
    }
  }
  res.setHeader('Allow', ['GET']);
  res.status(405).end();
}
