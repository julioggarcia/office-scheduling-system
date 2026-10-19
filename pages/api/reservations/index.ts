import type { NextApiRequest, NextApiResponse } from 'next';
import prisma from '../../../lib/prisma';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'GET') {
    const {
      id,
      reservationId,
      locationId,
      locationIds,
      date,
      startIso,
      endIso,
      page,
      pageSize,
      includePast,
      userId,
      approved
    } = req.query as {
      id?: string;
      reservationId?: string;
      locationId?: string;
      locationIds?: string;
      date?: string;
      startIso?: string;
      endIso?: string;
      page?: string;
      pageSize?: string;
      includePast?: string;
      userId?: string;
      approved?: string;
    };

    // if a reservation id is provided, return that reservation directly
    const resId = reservationId || id;
    if (resId) {
      try {
        const r = await prisma.reservation.findUnique({ where: { id: resId }, include: { user: true, location: true } });
        if (!r) return res.status(404).json({ error: 'Not found' });
        return res.json(r);
      } catch (err) {
        console.error('Failed fetching reservation by id', err);
        return res.status(500).json({ error: 'Failed fetching reservation' });
      }
    }

    // pagination defaults
    const pageNum = Math.max(1, parseInt(page || '1', 10));
    const take = pageSize ? parseInt(pageSize, 10) : 10; // default 10 per page
    const skip = (pageNum - 1) * take;
    const wantPast = includePast === 'true' || includePast === '1';

    // If not provided at all, require at least location filter or date/range
    if ((!locationId && !locationIds) && (!date && !(startIso && endIso)) && !wantPast) return res.status(400).json({ error: 'Missing params' });

    // determine UTC instant range: if startIso/endIso provided use them; if date provided compute local day range; otherwise default to future from now
    let rangeStart: Date | null = null;
    let rangeEnd: Date | null = null;
    if (startIso && endIso) {
      rangeStart = new Date(startIso);
      rangeEnd = new Date(endIso);
    } else if (date) {
      // compute local-day start/end
      rangeStart = new Date((date as string) + 'T00:00:00');
      rangeEnd = new Date((date as string) + 'T23:59:59.999');
      rangeStart = new Date(rangeStart.toISOString());
      rangeEnd = new Date(rangeEnd.toISOString());
    } else if (!wantPast) {
      // no date supplied and not asking past: show upcoming from now for this location(s)
      rangeStart = new Date();
      rangeEnd = null;
    }

    try {
      const locFilter: any = {};
      let expandedIds: string[] | null = null;
      const wantExpand = (req.query.includeChildren === 'true' || req.query.includeChildren === '1');

      if (locationIds) {
        const ids = locationIds.split(',').map((s) => s.trim()).filter(Boolean);
        // optionally expand children for each id
        if (wantExpand) {
          // gather descendants for all ids
          const all = new Set<string>(ids);
          const queue = [...ids];
          while (queue.length) {
            const cur = queue.shift()!;
            const children = await prisma.location.findMany({ where: { parentId: cur }, select: { id: true } });
            for (const c of children) {
              if (!all.has(c.id)) {
                all.add(c.id);
                queue.push(c.id);
              }
            }
          }
          expandedIds = Array.from(all);
          locFilter.locationId = { in: expandedIds };
        } else {
          locFilter.locationId = { in: ids };
        }
      } else if (locationId) {
        if (wantExpand) {
          // BFS to collect all descendant ids
          const all = new Set<string>([locationId]);
          const queue = [locationId];
          while (queue.length) {
            const cur = queue.shift()!;
            const children = await prisma.location.findMany({ where: { parentId: cur }, select: { id: true } });
            for (const c of children) {
              if (!all.has(c.id)) {
                all.add(c.id);
                queue.push(c.id);
              }
            }
          }
          expandedIds = Array.from(all);
          locFilter.locationId = { in: expandedIds };
        } else {
          locFilter.locationId = locationId;
        }
      }

      // build where object (instead of array) so it can be reused for count and findMany
      const where: any = {};
      if (Object.keys(locFilter).length) Object.assign(where, locFilter);

      // apply optional filters
      if (userId) where.userId = userId;
      if (approved === 'true' || approved === 'false') where.approved = approved === 'true';

      // time-based filters
      if (rangeEnd) {
        // overlap: end > rangeStart && start < rangeEnd
        where.AND = [{ end: { gt: rangeStart } }, { start: { lt: rangeEnd } }];
      } else if (rangeStart) {
        // only future reservations: start >= rangeStart
        where.start = { gte: rangeStart };
      } else if (wantPast) {
        // past reservations: end < now
        where.end = { lt: new Date() };
      }

      // count total matching
      const total = await prisma.reservation.count({ where });

      // ordering: past -> newest first, otherwise earliest first
      const orderBy = wantPast ? { start: 'desc' } : { start: 'asc' };

      const reservations = await prisma.reservation.findMany({
        where,
        include: { user: true, location: true },
        orderBy,
        skip,
        take
      });

      const totalPages = Math.max(1, Math.ceil(total / take));

      return res.json({
        meta: { total, page: pageNum, pageSize: take, totalPages },
        reservations
      });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: 'Failed fetching reservations' });
    }
  }
  return res.status(405).end();
}
