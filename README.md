Office Reservation — Floorplan-based Reservation System

Purpose

This project provides a lightweight Next.js + Prisma + SQLite application that lets organizations upload building floorplans (image or SVG), draw clickable polygons over desks, cubicles and offices, and use those polygons as locations that staff can reserve in hourly blocks. The goal is to give places the ability to self-manage their buildings and provide a simple reservation UI tied to floorplan maps.

Key features

- Multi-building support: add buildings with name, address and floor count.
- Floorplan upload: upload an image or SVG for each floor and associate it with the building/floor.
- Polygon editor (Map Editor): draw polygons (desks, cubicles, offices) over a floorplan using pen and selection tools; polygons store normalized coordinates so they scale with the image.
- Parent/child locations: model offices that contain desks/cubicles; link child locations to parents for aggregated availability.
- Hourly reservations: reserve locations in hour blocks (Mon–Fri); supports start/end selection by click or drag in the Day Schedule.
- Assigned seats: staff (or their manager/admin) request a location as their assigned seat for specific weekdays and hours (e.g. Mon/Wed/Fri 8:00–17:00). Once approved, nobody else can reserve it during those hours; the day schedule shows those hours as "Assigned". Staff requests are approved by their manager or an admin; assignments made by a manager for a direct report, or by an admin, take effect immediately. Approving over existing reservations asks before cancelling them (owners are emailed).
- Roles: STAFF, MANAGER, ADMIN, with a manager → direct-report relationship. Set them on the Staff & roles page or via CSV import (`role`, `managerEmail` columns).
- Staff import: CSV with email, name, adObjectId (Active Directory object id), optional role and managerEmail.
- Admin UI: manage buildings/floors/locations, link parent/children, create/delete/approve reservations on behalf of staff.
- Notifications: best-effort email notifications on approvals/errors (SMTP must be configured in production).
- Concurrency/locking: server-side checks and locking to prevent duplicate reservations for the same timeslot.
- Multi-floor navigation: UI supports floor up/down controls for buildings with multiple floors.
- Dark mode support and responsive map/day-schedule layout.

Work in progress (WIP)

- Authentication: Microsoft Entra ID (Azure AD) sign-in via NextAuth is implemented; it needs an app registration (see .env.example). Users are matched to imported staff by AD object id, then email.
- UI polish: cleanup and accessibility improvements across the map editor, day schedule, and admin pages.
- Production readiness: add robust email config, authorization checks, and more comprehensive tests.
- Other features to add: optional per-hour occupancy feeds, export of reservations, and tighter AD sync.

Developer quickstart (local dev)

1. Install dependencies
   - npm install

2. Configure environment
   - Copy .env.example to .env. Set NEXTAUTH_SECRET, and either the AZURE_AD_* values or AUTH_DEV_LOGIN=true (local only: sign in with any email).
   - Put your email in ADMIN_EMAILS so you become an admin on first sign-in.

3. Run the dev server
   - npx prisma migrate deploy
   - npm run dev

Sign-in on Windows PCs and phones

Sign-in uses Microsoft Entra ID rather than NTLM. On Entra-joined or hybrid-joined Windows PCs, Edge (or Chrome with the Windows accounts extension / CloudAPAuthEnabled policy) signs users in silently with their Windows logon, and the sign-in page redirects automatically when Microsoft is the only option. The same login works on phones (Microsoft Authenticator / company portal), off the corporate network, and behind proxies, none of which NTLM handles. Sessions last 30 days.

Notes

- This project uses a local SQLite database for development. For production consider Postgres or another managed DB.
- Do not commit node_modules (a .gitignore is included). Large binary blobs were removed from history — please re-clone if you see history divergence after the clean-up.

If you'd like the README expanded with screenshots, API examples, or deployment instructions, tell me which sections to add and I will update it.
