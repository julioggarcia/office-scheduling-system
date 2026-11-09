import prisma from './prisma';
import { sendMail } from './nodemailer';

export type NotifyInput = { title: string; body?: string; link?: string };

/**
 * Adds an in-app notification for each user (skipping `exceptUserId`, the person who caused the event)
 * and emails those who have not turned email off. Never throws: a failed notice must not fail the action.
 */
export async function notify(userIds: string | string[], input: NotifyInput, exceptUserId?: string) {
  try {
    const ids = Array.from(new Set(Array.isArray(userIds) ? userIds : [userIds])).filter((id) => id && id !== exceptUserId);
    if (!ids.length) return;
    const users = await prisma.user.findMany({ where: { id: { in: ids }, active: true }, select: { id: true, email: true, emailNotifications: true } });
    // SQLite has no createMany in this Prisma version
    await Promise.all(users.map((u) => prisma.notification.create({ data: { userId: u.id, title: input.title, body: input.body ?? null, link: input.link ?? null } })));
    for (const u of users) {
      if (u.emailNotifications) await sendMail({ to: u.email, subject: input.title, text: input.body || input.title }).catch((err) => console.error('Failed sending notification email', err));
    }
  } catch (err) {
    console.error('Failed creating notification', err);
  }
}

/** Ids of the people who approve requests for a location: its named approver, else every active admin. */
export async function approverIds(approverId: string | null | undefined) {
  if (approverId) return [approverId];
  return (await prisma.user.findMany({ where: { role: 'ADMIN', active: true }, select: { id: true } })).map((u) => u.id);
}

/** "Mon, Nov 3, 9:00 AM - 11:00 AM" in the building's timezone. */
export function fmtRange(start: Date, end: Date, timeZone: string) {
  const day = start.toLocaleString('en-US', { timeZone, weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
  const to = end.toLocaleString('en-US', { timeZone, hour: 'numeric', minute: '2-digit' });
  return `${day} - ${to}`;
}
