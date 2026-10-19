import type { NextApiRequest, NextApiResponse } from 'next';
import prisma from '../../../lib/prisma';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { id } = req.query as { id: string };
  if (!id) return res.status(400).json({ error: 'Missing id' });

  if (req.method === 'DELETE') {
    try {
      await prisma.reservation.delete({ where: { id } });
      return res.json({ ok: true });
    } catch (err) {
      console.error('Failed deleting reservation', err);
      return res.status(500).json({ error: 'Failed deleting' });
    }
  }

  if (req.method === 'PUT') {
    const { approved, start, end, userId, locationId } = req.body;
    try {
      const data: any = {};
      if (approved !== undefined) data.approved = approved;
      if (start) data.start = new Date(start);
      if (end) data.end = new Date(end);
      if (userId) data.userId = userId;
      if (locationId) data.locationId = locationId;
      const updated = await prisma.reservation.update({ where: { id }, data });
      return res.json({ ok: true, updated });
    } catch (err) {
      console.error('Failed updating reservation', err);
      return res.status(500).json({ error: 'Failed updating' });
    }
  }

  res.setHeader('Allow', ['DELETE','PUT']);
  return res.status(405).end();
}
