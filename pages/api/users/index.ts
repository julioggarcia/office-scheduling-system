import type { NextApiRequest, NextApiResponse } from 'next';
import prisma from '../../../lib/prisma';
import { requireUser } from '../../../lib/auth';

const select = { id: true, name: true, email: true, role: true, active: true, managerId: true, manager: { select: { id: true, name: true, email: true } } };

// Admins see everyone, managers see themselves + direct reports, staff see only themselves.
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const actor = await requireUser(req, res);
  if (!actor) return;
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).end();
  }
  const q = typeof req.query.q === 'string' ? req.query.q.trim() : '';
  const scope = actor.role === 'ADMIN' ? {} : actor.role === 'MANAGER' ? { OR: [{ id: actor.id }, { managerId: actor.id }] } : { id: actor.id };
  const search = q ? { OR: [{ name: { contains: q } }, { email: { contains: q } }] } : {};
  const users = await prisma.user.findMany({ where: { AND: [scope, search] }, select, orderBy: [{ name: 'asc' }, { email: 'asc' }], take: 500 });
  return res.json(users);
}
