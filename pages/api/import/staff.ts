import type { NextApiRequest, NextApiResponse } from 'next';
import prisma from '../../../lib/prisma';
import { parse } from 'csv-parse/sync';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).end();
  const body = req.body;
  // accept raw CSV in body as text or file upload (TODO: multipart)
  const csv = typeof body === 'string' ? body : req.body.csv || '';
  if (!csv) return res.status(400).json({ error: 'CSV body required' });

  try {
    const records = parse(csv, { columns: true, skip_empty_lines: true });
    const results: any[] = [];
    for (const r of records) {
      // expected headers: email, name, adObjectId, defaultLocationLabel
      const email = r.email?.trim();
      if (!email) continue;
      const name = r.name || '';
      const adObjectId = r.adObjectId || null;

      const up = await prisma.user.upsert({
        where: { email },
        update: { name, adObjectId },
        create: { email, name, adObjectId },
      });
      results.push(up);
    }
    return res.json({ imported: results.length });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: String(err) });
  }
}
