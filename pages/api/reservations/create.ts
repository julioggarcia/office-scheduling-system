import type { NextApiRequest, NextApiResponse } from 'next';
import prisma from '../../../lib/prisma';
import { sendMail } from '../../../lib/nodemailer';

async function gatherDescendants(tx: any, id: string) {
  const ids = [id];
  const stack = [id];
  while (stack.length) {
    const cur = stack.pop()!;
    const children = await tx.location.findMany({ where: { parentId: cur }, select: { id: true } });
    for (const c of children) {
      ids.push(c.id);
      stack.push(c.id);
    }
  }
  return ids;
}

async function gatherAncestors(tx: any, id: string) {
  const ids: string[] = [];
  let curId: string | null = id;
  while (curId) {
    const loc: { parentId?: string | null } | null = (await tx.location.findUnique({ where: { id: curId }, select: { parentId: true } })) as any;
    if (loc?.parentId) {
      ids.push(loc.parentId);
      curId = loc.parentId;
    } else {
      curId = null;
    }
  }
  return ids;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).end();
  const { locationId, userId, start, end, includeChildren } = req.body;
  if (!locationId || !userId || !start || !end) return res.status(400).json({ error: 'Missing params' });

  const startDate = new Date(start);
  const endDate = new Date(end);
  if (startDate >= endDate) return res.status(400).json({ error: 'Invalid date range' });

  try {
    // allow any userId temporarily: find or create a placeholder user when missing
    let userRecord = await prisma.user.findUnique({ where: { id: userId } });
    if (!userRecord) {
      // derive an email for placeholder users; prefer if userId looks like an email
      const derivedEmail = typeof userId === 'string' && userId.includes('@') ? userId : `${userId.replace(/[^a-z0-9_.-]/gi, '') || 'user'}@placeholder.local`;
      try {
        userRecord = await prisma.user.create({ data: { id: userId, email: derivedEmail, name: userId } });
      } catch (createErr) {
        console.warn('Failed to create placeholder user:', createErr);
        // if email unique constraint caused failure, try to find user by email
        const byEmail = await prisma.user.findUnique({ where: { email: derivedEmail } }).catch(() => null);
        if (byEmail) {
          userRecord = byEmail;
        } else {
          // fallback to a generic placeholder user id
          let fallback = await prisma.user.findUnique({ where: { email: 'placeholder@local' } }).catch(() => null);
          if (!fallback) {
            fallback = await prisma.user.create({ data: { email: 'placeholder@local', name: 'Placeholder User' } });
          }
          userRecord = fallback;
        }
      }
    }

    const result = await prisma.$transaction(async (tx) => {
      let locationIds = [locationId];
      if (includeChildren) {
        locationIds = await gatherDescendants(tx, locationId);
      } else {
        // also check ancestors to avoid reserving a child when parent is reserved
        const ancestors = await gatherAncestors(tx, locationId);
        if (ancestors.length > 0) {
          const overlapParent = await tx.reservation.findFirst({ where: { locationId: { in: ancestors }, AND: [{ start: { lt: endDate } }, { end: { gt: startDate } }] } });
          if (overlapParent) throw new Error('Parent location already reserved for this time');
        }
        // also check descendants: if any child is reserved, disallow reserving the parent unless includeChildren is true
        const allDesc = await gatherDescendants(tx, locationId); // includes the parent
        const descendantsOnly = allDesc.filter((id: string) => id !== locationId);
        if (descendantsOnly.length > 0) {
          const overlapChild = await tx.reservation.findFirst({ where: { locationId: { in: descendantsOnly }, AND: [{ start: { lt: endDate } }, { end: { gt: startDate } }] } });
          if (overlapChild) throw new Error('One or more sublocations are already reserved for this time');
        }
      }

      // check overlaps across all affected locationIds
      const overlap = await tx.reservation.findFirst({ where: { locationId: { in: locationIds }, AND: [{ start: { lt: endDate } }, { end: { gt: startDate } }] } });
      if (overlap) throw new Error('Time slot already reserved for one of the affected locations');

      // create reservations for all affected locationIds
      const created: any[] = [];
      for (const lid of locationIds) {
        const r = await tx.reservation.create({ data: { locationId: lid, userId: userRecord!.id, start: startDate, end: endDate, approved: true } });
        created.push(r);
      }
      return created;
    });

    // send notification (best-effort) to user
    try {
      const user = await prisma.user.findUnique({ where: { id: userRecord!.id } });
      if (user?.email) {
        await sendMail({ to: user.email, subject: 'Reservation confirmed', text: `Your reservation for location ${locationId} from ${start} to ${end} is confirmed.` });
      }
    } catch (mailErr) {
      console.error('Failed sending mail', mailErr);
    }

    return res.json(result);
  } catch (err: any) {
    console.error(err);
    return res.status(409).json({ error: err.message || 'Conflict' });
  }
}
