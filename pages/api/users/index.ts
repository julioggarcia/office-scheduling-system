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
  const orderBy = [{ name: 'asc' as const }, { email: 'asc' as const }];

  // ?pageSize=N switches to a paged lookup ({ users, total, page, pageSize }) used by the user picker
  if (req.query.pageSize) {
    const pageSize = Math.min(Math.max(Number(req.query.pageSize) || 5, 1), 50);
    const page = Math.max(Number(req.query.page) || 1, 1);
    const where = { AND: [scope, search, req.query.active === 'true' ? { active: true } : {}] };
    const [total, users] = await Promise.all([
      prisma.user.count({ where }),
      prisma.user.findMany({ where, select, orderBy, skip: (page - 1) * pageSize, take: pageSize }),
    ]);
    return res.json({ users, total, page, pageSize });
  }

  const users = await prisma.user.findMany({ where: { AND: [scope, search] }, select, orderBy, take: 500 });
  return res.json(users);
}
