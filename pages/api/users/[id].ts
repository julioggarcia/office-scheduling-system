import type { NextApiRequest, NextApiResponse } from 'next';
import prisma from '../../../lib/prisma';
import { ROLES, requireUser } from '../../../lib/auth';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const actor = await requireUser(req, res, 'ADMIN');
  if (!actor) return;
  const { id } = req.query as { id: string };
  if (req.method !== 'PUT') {
    res.setHeader('Allow', ['PUT']);
    return res.status(405).end();
  }

  const { role, managerId, active } = req.body || {};
  const data: any = {};
  if (role !== undefined) {
    if (!ROLES.includes(role)) return res.status(400).json({ error: 'Invalid role' });
    if (id === actor.id && role !== 'ADMIN') return res.status(400).json({ error: "You can't remove your own admin role" });
    data.role = role;
  }
  if (managerId !== undefined) {
    if (managerId === id) return res.status(400).json({ error: "Someone can't be their own manager" });
    data.managerId = managerId || null;
  }
  if (active !== undefined) data.active = !!active;

  try {
    const updated = await prisma.user.update({ where: { id }, data });
    return res.json(updated);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Failed updating user' });
  }
}
