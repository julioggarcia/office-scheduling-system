import type { NextApiRequest, NextApiResponse } from 'next';
import prisma from '../../lib/prisma';
import { requireUser } from '../../lib/auth';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const actor = await requireUser(req, res);
  if (!actor) return;

  if (req.method === 'GET') {
    const [items, unread] = await Promise.all([
      prisma.notification.findMany({ where: { userId: actor.id }, orderBy: { createdAt: 'desc' }, take: 20 }),
      prisma.notification.count({ where: { userId: actor.id, readAt: null } }),
    ]);
    return res.json({ items, unread, emailNotifications: actor.emailNotifications });
  }

  // { ids } marks those read, { markRead: true } marks all read, { emailNotifications } sets the email preference
  if (req.method === 'PUT') {
    const { ids, markRead, emailNotifications } = req.body || {};
    if (typeof emailNotifications === 'boolean') await prisma.user.update({ where: { id: actor.id }, data: { emailNotifications } });
    if (Array.isArray(ids) || markRead) {
      await prisma.notification.updateMany({ where: { userId: actor.id, readAt: null, ...(Array.isArray(ids) ? { id: { in: ids } } : {}) }, data: { readAt: new Date() } });
    }
    return res.json({ ok: true });
  }

  res.setHeader('Allow', ['GET', 'PUT']);
  return res.status(405).end();
}
