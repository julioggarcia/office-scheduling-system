import type { NextApiRequest, NextApiResponse } from 'next';
import prisma from '../../../lib/prisma';
import { ROLES, normalizeEmail, requireUser } from '../../../lib/auth';
import { parse } from 'csv-parse/sync';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).end();
  if (!(await requireUser(req, res, 'ADMIN'))) return;
  const body = req.body;
  // accept raw CSV in body as text or file upload (TODO: multipart)
  const csv = typeof body === 'string' ? body : req.body.csv || '';
  if (!csv) return res.status(400).json({ error: 'CSV body required' });

  try {
    const records = parse(csv, { columns: true, skip_empty_lines: true });
    const results: any[] = [];
    const managerLinks: Array<{ email: string; managerEmail: string }> = [];
    for (const r of records as any[]) {
      // expected headers: email, name, adObjectId; optional: role (STAFF|MANAGER|ADMIN), managerEmail
      const email = r.email ? normalizeEmail(r.email) : '';
      if (!email) continue;
      const name = r.name || '';
      const adObjectId = r.adObjectId || null;
      const role = typeof r.role === 'string' && ROLES.includes(r.role.trim().toUpperCase()) ? r.role.trim().toUpperCase() : undefined;

      const up = await prisma.user.upsert({
        where: { email },
        update: { name, adObjectId, ...(role ? { role } : {}) },
        create: { email, name, adObjectId, ...(role ? { role } : {}) },
      });
      results.push(up);
      if (r.managerEmail) managerLinks.push({ email, managerEmail: normalizeEmail(r.managerEmail) });
    }

    // second pass so managers listed later in the file still resolve
    const unresolved: string[] = [];
    for (const link of managerLinks) {
      const manager = await prisma.user.findUnique({ where: { email: link.managerEmail } });
      if (!manager) {
        unresolved.push(link.managerEmail);
        continue;
      }
      await prisma.user.update({ where: { email: link.email }, data: { managerId: manager.id } });
      // anyone with reports can approve their seat requests
      if (manager.role === 'STAFF') await prisma.user.update({ where: { id: manager.id }, data: { role: 'MANAGER' } });
    }
    return res.json({ imported: results.length, managersLinked: managerLinks.length - unresolved.length, unresolvedManagers: Array.from(new Set(unresolved)) });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: String(err) });
  }
}
