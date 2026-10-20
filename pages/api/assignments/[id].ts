import type { NextApiRequest, NextApiResponse } from 'next';
import prisma from '../../../lib/prisma';
import { canActFor, requireUser } from '../../../lib/auth';
import { ApprovalConflict, approveAssignment, canReview } from '../../../lib/assignmentApproval';
import { describeSchedule } from '../../../lib/assignments';
import { sendMail } from '../../../lib/nodemailer';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const actor = await requireUser(req, res);
  if (!actor) return;
  const { id } = req.query as { id: string };

  if (req.method !== 'PUT') {
    res.setHeader('Allow', ['PUT']);
    return res.status(405).end();
  }

  const assignment = await prisma.seatAssignment.findUnique({ where: { id }, include: { user: true, location: true } });
  if (!assignment) return res.status(404).json({ error: 'Not found' });
  const { action, reviewNote, cancelConflicts } = req.body || {};

  if (action === 'approve' || action === 'reject') {
    if (assignment.status !== 'PENDING') return res.status(400).json({ error: `Request is already ${assignment.status.toLowerCase()}` });
    if (!(await canReview(actor, assignment))) return res.status(403).json({ error: "Only an admin or the staff member's manager can review this request" });

    if (action === 'reject') {
      const updated = await prisma.seatAssignment.update({ where: { id }, data: { status: 'REJECTED', reviewedById: actor.id, reviewedAt: new Date(), reviewNote: reviewNote || null } });
      sendMail({ to: assignment.user.email, subject: 'Seat assignment request declined', text: `Your request for ${assignment.location.label} (${describeSchedule(assignment)}) was declined.${reviewNote ? ' Note: ' + reviewNote : ''}` }).catch((err) => console.error(err));
      return res.json(updated);
    }

    try {
      const result = await approveAssignment(assignment, actor, { cancelConflicts: !!cancelConflicts, reviewNote });
      return res.json(result);
    } catch (err) {
      if (err instanceof ApprovalConflict) return res.status(409).json({ error: err.message, code: err.code, details: err.details });
      throw err;
    }
  }

  if (action === 'cancel') {
    if (!['PENDING', 'APPROVED'].includes(assignment.status)) return res.status(400).json({ error: `Request is already ${assignment.status.toLowerCase()}` });
    const allowed = assignment.requestedById === actor.id || (await canActFor(actor, assignment.userId));
    if (!allowed) return res.status(403).json({ error: 'Not allowed' });
    const updated = await prisma.seatAssignment.update({ where: { id }, data: { status: 'CANCELLED', reviewedById: actor.id, reviewedAt: new Date() } });
    return res.json(updated);
  }

  return res.status(400).json({ error: 'action must be approve, reject or cancel' });
}
