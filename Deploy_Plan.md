# Deploy plan: Fly.io

Status as of 2026-11-08. Nothing has been deployed yet.

## 1. Blocker: nobody can sign in on the host

Production has no way to log in today. `lib/auth.ts` enables only two sign-in options: Azure AD, which needs `AZURE_AD_*`, and the dev email login, which is turned off in production builds. Without Azure, the sign-in page shows "No sign-in method is configured" and `/api/auth/providers` returns `{}` (checked with a local production build).

So passwordless sign-in (section 3) has to ship before going live, or the Azure values have to be set.

A second problem shows up as soon as any open sign-in method is added: `upsertSignedInUser` creates a user for **anyone** who signs in. With Azure single-tenant, the tenant was the gate. With magic links or Google, it would let the whole internet in. Sign-in must only accept users who already exist (imported, or registered with an org key). See section 4.

## 2. Hosting fixes already made

| Problem | Fix |
|---|---|
| No container or Fly config | Added `Dockerfile`, `.dockerignore`, `fly.toml` |
| `sqlite3` npm package was unused (Prisma has its own engine) and needs native build tools, so `npm ci` can fail in a slim image | Removed |
| Next 13.5.6 has a middleware auth bypass (CVE-2025-29927, `x-middleware-subrequest`). This app protects every page with `middleware.ts` | Upgraded to Next 14.2.35, the newest 14.x. Build passes |
| next-auth 4.23 / nodemailer 6.9 had known issues | next-auth 4.24.15, nodemailer 7.0.13 |
| Fly `release_command` runs on a temporary machine that does **not** mount the volume, so migrations would hit an empty, throwaway DB | Migrations run in the container `CMD` (`prisma migrate deploy && next start`) |
| Prisma engine needs OpenSSL, which isn't in the slim Debian image | `apt-get install openssl` in both stages |
| `next start` must listen on 0.0.0.0 for Fly's proxy | `-H 0.0.0.0` |
| SQLite file would be lost on every deploy | `DATABASE_URL=file:/data/app.db` on a mounted volume |

I checked that all 8 migrations, including the hand-written `location_approval`, apply to an empty DB and match `schema.prisma` with no drift. I could not run the Docker image because Docker Desktop was not running. Run `docker build .` once before the first deploy.

### Still open (not fixed)
- **`npm audit` still reports issues with Next.** Current advisories cover every Next version below 16.x, so the real fix is a major upgrade (Next 16, React 19). Plan it separately. The remaining nodemailer advisories need attacker-controlled transport, envelope or `List-*` options, which this app never passes. The postcss ones only matter at build time.
- **One machine only.** SQLite on a Fly volume can't be shared, so never run `fly scale count 2`. If you need more than one machine or region, move to Postgres (Fly Postgres, Neon or Supabase). For Postgres, change the Prisma `provider` and regenerate the migrations.
- **Backups.** Fly keeps daily volume snapshots, 5 days by default. For off-site copies, add Litestream to S3 or R2, or a cron job that runs `sqlite3 .backup`.
- **Floorplans are stored in the DB** (`Floor.imageContent`), so the DB grows with uploads. Upload size is capped at 10 MB per request. Start with a 3 GB volume.
- **Emails are sent inside the request.** A booking at a location with no named approver emails every admin before the response returns. This is fine at office scale.
- `APP_TIMEZONE` should be set, because the machine runs in UTC. Buildings with their own timezone are unaffected.

## 3. Login without username and password

| Option | What it takes | Verdict |
|---|---|---|
| **Email magic link** (next-auth `EmailProvider`) | SMTP, which you already need for notifications. `@next-auth/prisma-adapter` is already installed. Add a `VerificationToken` table and keep JWT sessions | **Do this first.** Works for every org, any email, phone or PC, and adds no new vendor |
| **"Sign in with Microsoft", any org** | Register **one** app in your own free Azure account with tenant `common`. Users from any Microsoft 365 org (and personal accounts) can sign in. The existing `AzureADProvider` works with `tenantId: 'common'` | Good second step, and it is real SSO for M365 orgs. Some orgs block third-party apps until their IT admin consents, so keep magic link as the fallback |
| **"Sign in with Google"** | A Google Cloud OAuth client | Add if orgs use Google Workspace |
| Passkeys / WebAuthn | Not supported in next-auth v4. v5 has it as experimental | Later |
| Per-org SAML / OIDC SSO | Per-org config UI or a paid broker (WorkOS, Auth0, Clerk) | Only when an org asks for it |

Magic links need a sending domain with SPF and DKIM (Postmark, Resend, SES, or M365 SMTP) or they land in spam. Fly blocks port 25, but 587 and 465 work.

## 4. Organizations with join keys

Plan (not built yet):

**Schema**
- `Organization { id, name, joinKey @unique, joinKeyExpiresAt?, allowedEmailDomains? }`
- `User.organizationId`: one org per user to start. Use a membership table only if people will belong to several orgs.
- `Building.organizationId`. Floors, locations, reservations and assignments get their org through the building or the user.
- Migration: create a default org and attach all existing users and buildings to it.

**Join flow**
1. An org admin shares a link `/join?key=XXXX` (or the key itself).
2. `POST /api/join { key, email }` checks the key (and its expiry and allowed domains), then creates the user in that org with role STAFF and sends the magic link.
3. The `signIn` callback only accepts existing, active users. That closes the open sign-up from section 1.
4. Users brought in by CSV import already exist, so they don't need a key.

**Key safety**
- Generate keys randomly (`crypto.randomBytes(16).toString('base64url')`), never from the org name. Let admins rotate them. Add an optional expiry or max-uses limit.
- Rate-limit `/api/join` and the magic-link endpoint per IP and email. An in-memory limit is enough on one machine.
- The key works like a shared password. For tighter control, use single-use invite keys per person instead of one key for the whole org.

**Tenant isolation (most of the work)**
Every API route that lists or changes buildings, floors, locations, reservations, assignments, users or imports must filter by `actor.organizationId`. That covers about 20 handlers under `pages/api/`. Add one helper, e.g. `orgScope(actor)`, and use it everywhere. A route that misses it leaks data between orgs. Add a test that signs in as org A and requests org B's ids.

**Roles:** `ADMIN` becomes "org admin". Platform-wide admin stays with `ADMIN_EMAILS`, which also needs an org check so it can't reach every org's data.

## 5. First deploy steps

```sh
fly launch --no-deploy            # keep the generated app name, or edit fly.toml
fly volumes create data --size 3 --region ord
fly secrets set NEXTAUTH_SECRET=$(openssl rand -hex 32) \
  NEXTAUTH_URL=https://<app>.fly.dev \
  ADMIN_EMAILS=you@example.com APP_TIMEZONE=America/Chicago \
  SMTP_HOST=... SMTP_PORT=587 SMTP_USER=... SMTP_PASS=... SMTP_FROM=...
# plus AZURE_AD_* if using Microsoft sign-in
fly deploy
fly scale count 1                 # SQLite: exactly one machine
```

If you add a custom domain, update `NEXTAUTH_URL` to it, and also the Azure redirect URI `<NEXTAUTH_URL>/api/auth/callback/azure-ad`.

## 6. Order of work
1. Magic-link sign-in, and limit sign-in to existing users (blocker).
2. Organizations: schema, join flow and org scoping on every API route, plus a cross-org test.
3. Microsoft `common` / Google sign-in buttons.
4. Off-site backups.
5. Next 16 upgrade.
