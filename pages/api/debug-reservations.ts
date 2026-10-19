import type { NextApiRequest, NextApiResponse } from 'next';
import prisma from '../../lib/prisma';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (process.env.NODE_ENV === 'production') return res.status(403).json({ error: 'Disabled in production' });
  if (req.method !== 'GET') return res.status(405).end();
  try {
    const rows = await prisma.reservation.findMany({ include: { user: true, location: true }, orderBy: { start: 'asc' } });
    return res.json(rows);
  } catch (err) {
    console.error('Debug reservations failed', err);
    return res.status(500).json({ error: 'Failed' });
  }
}
