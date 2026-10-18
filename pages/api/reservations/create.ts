import type { NextApiRequest, NextApiResponse } from 'next';
import prisma from '../../../lib/prisma';
import { sendMail } from '../../../lib/nodemailer';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).end();
  const { locationId, userId, start, end } = req.body;
  if (!locationId || !userId || !start || !end) return res.status(400).json({ error: 'Missing params' });

  const startDate = new Date(start);
  const endDate = new Date(end);
  if (startDate >= endDate) return res.status(400).json({ error: 'Invalid date range' });

  try {
    // Use a transaction to check for overlapping reservations and create one atomically
    const result = await prisma.$transaction(async (tx) => {
      const overlaps = await tx.reservation.findFirst({
        where: {
          locationId,
          AND: [
            { start: { lt: endDate } },
            { end: { gt: startDate } },
          ],
        },
      });
      if (overlaps) {
        throw new Error('Time slot already reserved');
      }
      const r = await tx.reservation.create({ data: { locationId, userId, start: startDate, end: endDate, approved: true } });
      return r;
    });

    // send notification (best-effort)
    try {
      const user = await prisma.user.findUnique({ where: { id: userId } });
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
