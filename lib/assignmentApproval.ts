import type { SeatAssignment, User } from '@prisma/client';
import prisma from './prisma';
import { sendMail } from './nodemailer';
import { describeSchedule, findConflictingReservations, findOverlappingAssignments } from './assignments';

export class ApprovalConflict extends Error {
  constructor(public code: 'ASSIGNMENT_OVERLAP' | 'RESERVATION_CONFLICTS', message: string, public details: any[]) {
    super(message);
  }
}

/** Admins can review anyone's request; managers only their direct reports' (never their own). */
export async function canReview(actor: User, assignment: Pick<SeatAssignment, 'userId'>) {
  if (actor.role === 'ADMIN') return true;
  if (actor.role !== 'MANAGER' || actor.id === assignment.userId) return false;
  const target = await prisma.user.findUnique({ where: { id: assignment.userId }, select: { managerId: true } });
  return target?.managerId === actor.id;
}

/**
 * Approves an assignment. Fails if another approved assignment overlaps it; if other people already hold
 * reservations inside the schedule it fails too, unless `cancelConflicts` is set, in which case those
 * reservations are removed and their owners emailed.
 */
export async function approveAssignment(assignment: SeatAssignment, reviewer: User, opts: { cancelConflicts?: boolean; reviewNote?: string } = {}) {
  const overlapping = await findOverlappingAssignments(prisma, assignment);
  if (overlapping.length) {
    throw new ApprovalConflict('ASSIGNMENT_OVERLAP', 'This seat is already assigned to someone else during those hours', overlapping.map((o) => ({
      id: o.id, user: o.user.name || o.user.email, location: o.location.label, schedule: describeSchedule(o),
    })));
  }

  const reservations = await findConflictingReservations(prisma, assignment);
  if (reservations.length && !opts.cancelConflicts) {
    throw new ApprovalConflict('RESERVATION_CONFLICTS', `${reservations.length} upcoming reservation(s) fall inside this schedule`, reservations.map((r) => ({
      id: r.id, user: r.user.name || r.user.email, location: r.location.label, start: r.start, end: r.end,
    })));
  }

  const updated = await prisma.$transaction(async (tx) => {
    if (reservations.length) await tx.reservation.deleteMany({ where: { id: { in: reservations.map((r) => r.id) } } });
    return tx.seatAssignment.update({
      where: { id: assignment.id },
      data: { status: 'APPROVED', reviewedById: reviewer.id, reviewedAt: new Date(), reviewNote: opts.reviewNote ?? null },
      include: { user: true, location: true },
    });
  });

  // best-effort notifications
  try {
    for (const r of reservations) {
      if (r.user.email) {
        await sendMail({ to: r.user.email, subject: 'Reservation cancelled', text: `Your reservation for ${r.location.label} (${r.start.toISOString()} – ${r.end.toISOString()}) was cancelled because the seat has been assigned to a staff member for that time.` });
      }
    }
    await sendMail({ to: updated.user.email, subject: 'Seat assignment approved', text: `${updated.location.label} is now your assigned seat: ${describeSchedule(updated)}, from ${updated.startDate}${updated.endDate ? ' to ' + updated.endDate : ''}.` });
  } catch (err) {
    console.error('Failed sending assignment emails', err);
  }

  return { assignment: updated, cancelledReservations: reservations.length };
}
