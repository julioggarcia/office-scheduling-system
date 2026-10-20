import type { NextApiRequest, NextApiResponse } from 'next';
import prisma from '../../../lib/prisma';
import { requireUser } from '../../../lib/auth';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).end();
  if (!(await requireUser(req, res, 'ADMIN'))) return;
  const { childId, parentId } = req.body as { childId?: string; parentId?: string };
  if (!childId || !parentId) return res.status(400).json({ error: 'Missing childId or parentId' });
  try {
    const updated = await prisma.location.update({ where: { id: childId }, data: { parentId } });
    return res.json(updated);
  } catch (err) {
    console.error('set-parent failed', err);
    return res.status(500).json({ error: 'Failed to set parent' });
  }
}
