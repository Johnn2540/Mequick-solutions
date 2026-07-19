# Mequick Solutions — Medical Equipment E-commerce & Admin Platform

A Node.js/Express + Handlebars storefront and admin panel for a medical equipment supplier, built for deployment on Vercel with PostgreSQL (via Prisma), Cloudinary image storage, and Passport-based authentication.

## Tech Stack

- **Runtime**: Node.js, Express 5
- **Views**: Handlebars (`hbs`) with a hand-rolled two-layout system (`layouts/main` public site, `layouts/admin` dashboard)
- **Database**: PostgreSQL via Prisma ORM
- **Sessions**: `connect-pg-simple` (Postgres-backed, survives serverless cold starts) — scoped to `/admin` only
- **Auth**: Passport (Local Strategy) + bcrypt
- **CSRF**: `csrf-csrf` (double-submit cookie)
- **Images**: Cloudinary (via Multer memory storage — no local disk writes, required for Vercel)
- **Styling**: Bootstrap 5 (CDN)

## Project Structure

```
config/       Prisma client, Passport strategy, session store, Cloudinary config
controllers/  Route handlers (public + controllers/admin/*)
middleware/   auth, csrf, flash, rate limiters, upload (Multer), validation, error handling
routes/       Route definitions, mirrors controllers/ (routes/admin/* is the protected tree)
services/     Business logic / Prisma queries, one per domain entity
validators/   express-validator chains
utils/        Small stateless helpers (slugify, pagination, hbs helpers, audit action constants)
views/        Handlebars templates — layouts/, partials/, pages/, products/, categories/, admin/
prisma/       schema.prisma, migrations/, seed.js
api/          Vercel serverless entry point (exports the Express app)
app.js        Express app definition (no .listen() — shared by server.js and api/index.js)
server.js     Local dev entry point only
```

## Local Development Setup

### 1. Install dependencies

```bash
npm install
```

### 2. Configure environment variables

Copy `.env.example` to `.env` and fill in real values:

```bash
cp .env.example .env
```

Required for local dev at minimum:
- `DATABASE_URL` / `DIRECT_URL` — a real PostgreSQL connection (see below for options)
- `SESSION_SECRET`, `CSRF_SECRET` — any long random strings for local dev
- `CLOUDINARY_*` — needed for any image upload to actually work; the site runs fine without them, uploads just fail

**Getting a local Postgres quickly** (no local install needed):
```bash
docker run -d --name qs-postgres -e POSTGRES_USER=postgres -e POSTGRES_PASSWORD=postgres -e POSTGRES_DB=quick_solutions -p 5432:5432 postgres:16-alpine
```
Then set both `DATABASE_URL` and `DIRECT_URL` to `postgresql://postgres:postgres@localhost:5432/quick_solutions?schema=public`.

### 3. Run migrations and seed data

```bash
npx prisma migrate deploy   # applies existing migrations — see the warning below about migrate dev
npm run seed                # 13 categories, 17 brands, 39 products, 3 seed admin users
```

⚠️ **Do not run `npx prisma migrate dev` once the app has been used** — see [Known Issues](#known-issues) below. Use `migrate dev` only when *creating a new migration* for a schema change you're actively authoring, and only against a database you're OK re-seeding.

### 4. Run the app

```bash
npm run dev      # nodemon, auto-restart
# or
npm start        # plain node
```

Visit `http://localhost:3000`. Admin panel: `http://localhost:3000/admin/login`.

### Seed admin accounts

`npm run seed` creates one account per role with these placeholder credentials:

| Role | Email | Password |
|---|---|---|
| Super Admin | `superadmin@mequicksolutions.co.ke` | `SuperAdmin123!` |
| Admin | `admin@mequicksolutions.co.ke` | `ChangeMe123!` |
| Editor | `editor@mequicksolutions.co.ke` | `Editor123!` |

**Change or disable these before any real deployment.** There is no password-reset flow yet (see Known Limitations) — if you lose access, reset a password directly via `npx prisma studio` or a one-off script using `bcryptjs`.

⚠️ **The live Super Admin account's email/password were customized after seeding** (not the placeholder above) — deliberately not documented here since this file could end up committed/shared. If you need to change it again, update `role: SUPER_ADMIN`'s `email`/`passwordHash` directly (a one-off `bcryptjs.hash()` + `prisma.user.update()` script, same pattern as changing any other password) rather than re-running `npm run seed`, which upserts by email and won't touch a row whose email has since changed — it would create a second, unused Super Admin account under the old placeholder email instead.

Also note: the password used for the live account (`superadmin123`) does **not** meet this app's own complexity policy (needs upper+lower+digit+special, enforced on `/admin/profile/password`) — it works for login since only the change-password form validates complexity, but should be strengthened before real deployment.

## Environment Variables

See `.env.example` for the full list with inline explanations. Highlights:

| Variable | Purpose |
|---|---|
| `DATABASE_URL` | Pooled Postgres connection — used at runtime by every request |
| `DIRECT_URL` | Unpooled Postgres connection — used only for migrations |
| `SESSION_SECRET` | Signs the session cookie |
| `CSRF_SECRET` | Signs CSRF tokens — **must differ from `SESSION_SECRET`** |
| `SESSION_MAX_AGE_MS` / `REMEMBER_ME_MAX_AGE_MS` | Session cookie lifetime (default 1 day / 30 days) |
| `CLOUDINARY_CLOUD_NAME/API_KEY/API_SECRET` | Image uploads (products, categories, brands, avatars) |
| `COMPANY_*` | Business info shown in the navbar/footer/contact |

## Roles & Authorization

Three roles: `SUPER_ADMIN`, `ADMIN`, `EDITOR`. All three can log in and manage products/categories/brands/quotes/enquiries/messages. **Deleting** a product, category, or brand is restricted to `SUPER_ADMIN`/`ADMIN` (see `requireRole` usage in `routes/admin/*.routes.js`). The **Activity Logs** page (`/admin/audit-logs`) is `SUPER_ADMIN`-only.

## Security Notes

- Sessions and CSRF protection are scoped to `/admin` only — the public storefront has no forms yet and stays fully stateless (cheaper on Vercel, no session row per anonymous visitor).
- CSRF validation is split into two middleware instances (`attachCsrfToken` / `csrfProtection` in `middleware/csrf.js`) specifically so it can run **after** Multer on multipart forms — Multer is what populates `req.body` for file-upload forms, and validating before that always fails. If you add a new admin POST route, remember to mount `csrfProtection` explicitly (after any `upload.*` middleware) — it is not applied globally.
- Login attempts are rate-limited (`middleware/rateLimiters.js`) and every attempt against a real account is recorded in `LoginHistory` (visible on the admin's own Profile page) and `AuditLog` (visible to Super Admins).
- Password complexity is enforced server-side (`validators/auth.validator.js`) on password change: 8+ chars, upper, lower, digit, special character.

## Known Issues

- **Prisma's migration engine does not reliably execute the hand-written `session` table migration** (`prisma/migrations/*_add_session_table`), against either a local Postgres or Neon. Confirmed twice: the table silently fails to persist even though the CLI reports the migration as successfully applied, and `prisma migrate dev`'s drift detection treats the table as unexpected "drift" and offers to **reset the entire database** to reconcile — which would destroy real data. The exact engine-internal cause wasn't identified, but the workaround is proven reliable: apply that one migration's DDL directly with a plain `pg` client (not through Prisma), then insert the matching row into `_prisma_migrations` by hand so Prisma's own bookkeeping stays consistent. See `prisma/migrations/20260718221500_add_image_public_ids` region of git history for a worked example.
  **Practical rule: never run `prisma migrate dev` or `prisma migrate reset` against a database once the `session` table exists in it** — both can trigger the reset prompt. Use `prisma migrate diff` (read-only) or hand-write DDL for schema changes, apply via `psql`/a `pg.Client` script, and register the migration row manually. `prisma migrate deploy` is lower-risk (never does drift detection) but still could not make the session table stick in testing — always verify with a fresh connection after running it: `SELECT table_name FROM information_schema.tables WHERE table_name = 'session';`.
- **Neon connection strings**: `DIRECT_URL` must be the *unpooled* endpoint — take the pooled `DATABASE_URL` Neon gives you and strip `-pooler` from the hostname (e.g. `ep-xxx-pooler.region.aws.neon.tech` → `ep-xxx.region.aws.neon.tech`), same credentials/db/params otherwise.
- No self-service password reset (deliberately deferred — see Milestone 3 notes; would require picking an email provider).
- `express-rate-limit`'s default store is in-memory and per-instance, so on Vercel it isn't globally authoritative across concurrent invocations — it's a baseline deterrent, not a hard guarantee. Swap for Upstash Redis / Vercel KV if you need it enforced exactly.
- Quotes/Enquiries/Messages admin screens are read + status-update only — there's no public-facing submission form yet (Contact Us / Request a Quote pages aren't built), so these lists will be empty until that milestone ships.

## Deployment (Vercel)

1. Push to a Git repo connected to Vercel.
2. Set all variables from `.env.example` in the Vercel project's Environment Variables — use a **pooled** connection string (e.g. Neon/Supabase pgbouncer endpoint) for `DATABASE_URL` and the **unpooled** one for `DIRECT_URL`.
3. Vercel runs `npm run vercel-build` (→ `prisma generate`) automatically as part of its build.
4. Run migrations against production **once**, from your machine or CI, before/after the first deploy: `DATABASE_URL=... DIRECT_URL=... npx prisma migrate deploy`. Vercel's build step does not run migrations for you.
5. `vercel.json` routes everything through `api/index.js` (the Express app) except static assets in `public/`, which Vercel serves directly. `functions.includeFiles` ships the `views/` directory with the function — without it, HBS templates 404/500 in production despite working locally.
6. Run `npm run seed` once against production if you want the starter catalog (or skip it and populate via the admin panel).
#   M e q u i c k - s o l u t i o n s  
 