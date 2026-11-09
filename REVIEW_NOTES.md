# Review notes

Read this before changing reservations, assignments, approvals or notifications.
Add a section at the top for each change worth remembering.

## 2026-11-08: Fly.io prep
- Added Dockerfile, fly.toml, .dockerignore. Removed unused `sqlite3`. Next 13.5.6 → 14.2.35, next-auth 4.24.15, nodemailer 7.0.13.
- Migrations run at container start (Fly release machines don't mount the SQLite volume). Keep the app at 1 machine.
- Open items and the auth/organizations plan: `Deploy_Plan.md`.

## 2026-11-08: location approval, in-app notifications, partial cancel

### What changed
- `Location.requiresApproval` + optional `Location.approverId`. New bookings at such a location are created `approved: false` unless the booker is an admin or the named approver. No named approver = any admin approves.
- `Notification` table + `User.emailNotifications`. All user-facing messages go through `lib/notify.ts` `notify()`, which writes the in-app row and emails users who did not opt out. Bell UI: `components/NotificationBell.tsx`, API: `pages/api/notifications.ts`.
- `POST /api/reservations/release` gives back part of a booking: whole, one hour, or "from here on" (leave early). Splits a row in two when the middle is freed.
- `GET /api/reservations?pendingForMe=true` lists pending bookings the caller can approve.
- The location approver can `PUT { approved }` or `DELETE` reservations at their location, nothing else.
- Behavior change: an approved seat assignment now blocks its own owner from also reserving those hours (`findBlockingAssignment` lost the `reservingUserId` exception; UI matches).
- `ADMIN_EMAIL` env is no longer the fallback recipient for assignment requests; approvers are the staff member's manager, else all active admin users in the DB.

### Rules to keep
- `notify()` never throws; a failed notice must not fail the action. Pass the actor as `exceptUserId` so people are not notified of their own actions (exception: "awaiting approval" to the booker).
- Approval is decided server-side in `create.ts`; never trust `approved` from the client on create.
- "Include children" bookings are several rows with the same user, start and end. Release treats rows with that same user+start+end as one booking.

### Known gaps / follow-ups
- Release matches siblings by user+start+end only, so two separate bookings by the same user at the same times (different desks, not "include children") are released together. Fix: store a booking group id.
- Release does not clamp `from` to now: cancelling a reservation that already started deletes the past part too (lost history of who used the seat). Consider clamping `from` to `max(from, now)`.
- `notify()` sends emails one by one inside the request; a location with no named approver emails every admin before the response returns.
- `approverId` is not checked to be an active user; a bad id fails with a FK error (500).
- No tests cover approval, release splitting or notifications.
