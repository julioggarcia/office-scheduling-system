Office Reservation — Floorplan-based Reservation System

Purpose

This project provides a lightweight Next.js + Prisma + SQLite application that lets organizations upload building floorplans (image or SVG), draw clickable polygons over desks, cubicles and offices, and use those polygons as locations that staff can reserve in hourly blocks. The goal is to give places the ability to self-manage their buildings and provide a simple reservation UI tied to floorplan maps.

Key features

- Multi-building support: add buildings with name, address and floor count.
- Floorplan upload: upload an image or SVG for each floor and associate it with the building/floor.
- Polygon editor (Map Editor): draw polygons (desks, cubicles, offices) over a floorplan using pen and selection tools; polygons store normalized coordinates so they scale with the image.
- Parent/child locations: model offices that contain desks/cubicles; link child locations to parents for aggregated availability.
- Hourly reservations: reserve locations in hour blocks (Mon–Fri); supports start/end selection by click or drag in the Day Schedule.
- Default workers and imports: import staff data (Active Directory) and optionally default workers per location so some locations are not open for checkout.
- Admin UI: manage buildings/floors/locations, link parent/children, create/delete/approve reservations on behalf of staff.
- Notifications: best-effort email notifications on approvals/errors (SMTP must be configured in production).
- Concurrency/locking: server-side checks and locking to prevent duplicate reservations for the same timeslot.
- Multi-floor navigation: UI supports floor up/down controls for buildings with multiple floors.
- Dark mode support and responsive map/day-schedule layout.

Work in progress (WIP)

- Authentication: planned Microsoft/Active Directory integration (NextAuth) so staff can sign in with their Microsoft logon and have AD attributes imported.
- UI polish: cleanup and accessibility improvements across the map editor, day schedule, and admin pages.
- Production readiness: add robust email config, authorization checks, and more comprehensive tests.
- Other features to add: optional per-hour occupancy feeds, export of reservations, and tighter AD sync.

Developer quickstart (local dev)

1. Install dependencies
   - npm install

2. Configure environment
   - Copy .env.example to .env and populate database and SMTP settings as needed.

3. Run the dev server
   - npx prisma migrate dev --name init
   - npm run dev

Notes

- This project uses a local SQLite database for development. For production consider Postgres or another managed DB.
- Do not commit node_modules (a .gitignore is included). Large binary blobs were removed from history — please re-clone if you see history divergence after the clean-up.

If you'd like the README expanded with screenshots, API examples, or deployment instructions, tell me which sections to add and I will update it.
