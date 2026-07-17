# IELTS Ace — Setup Requirements

Everything you need to provide / install for the app to run locally. Phase 1
(database + authentication) is built; items below get it running end-to-end.

## 1. Already installed (verified)
- **Node.js** 20.19.6 ✓
- **npm** 10.8.2 ✓
- **PostgreSQL** 17 running locally ✓ (your service is `postgresql-x64-17`)

## 2. Postgres database + role (ACTION NEEDED)

The app expects a dedicated database and role on **port 5432**. Your local
Postgres 17 currently listens on **5434** — either move it to 5432, or create a
fresh instance on 5432. Then create the role + database.

Run these (psql as a superuser, e.g. `postgres`):

```sql
CREATE ROLE ielts WITH LOGIN PASSWORD 'choose-a-strong-password';
CREATE DATABASE ielts OWNER ielts;
GRANT ALL PRIVILEGES ON DATABASE ielts TO ielts;
```

> Tip: you can run this from the terminal with the `!` prefix in this session:
> `! psql -U postgres -p 5432 -c "CREATE ROLE ielts LOGIN PASSWORD '...';"`

## 3. Environment file (ACTION NEEDED)

Edit `ielts/.env.local` and set the password you chose above:

```
DATABASE_URL=postgresql://ielts:choose-a-strong-password@localhost:5432/ielts
DATABASE_SSL=false
```

`.env.local` is git-ignored — secrets never get committed.

## 4. Apply schema + seed (I will run these once step 2–3 are done)

```bash
npm run db:migrate   # or: npm run db:push   (applies the generated schema)
npm run db:seed      # creates admin@ielts.local / Admin@12345
npm run dev          # http://localhost:3000
```

> **Build note:** your shell exports `NODE_ENV=development` globally. That's fine
> for `npm run dev`, but **production builds must run as production** or the
> React renderer errors out:
> `NODE_ENV=production npm run build` (PowerShell: `$env:NODE_ENV='production'; npm run build`).

## 5. Needed for LATER phases (not required for auth)
- **GEMINI_API_KEY** — AI band scoring for Writing (Phase: Writing).
- **SPEECHSUPER_APP_KEY / SPEECHSUPER_SECRET_KEY** — Speaking pronunciation/fluency.
- **AWS_ACCESS_KEY_ID / AWS_SECRET_ACCESS_KEY / AWS_REGION / S3_BUCKET_NAME** —
  audio upload for Speaking.
- **RAZORPAY_KEY_ID / RAZORPAY_KEY_SECRET / RAZORPAY_WEBHOOK_SECRET** — payments.

Add these to `.env.local` when we reach those phases; the app boots fine without them.

## Security posture (Phase 1)
- Sessions: opaque 256-bit token in an `HttpOnly` + `Secure` + `SameSite=Lax`
  `__Host-` cookie; only the SHA-256 hash is stored server-side. Not readable by
  JS/console; revocable; idle (7d) + absolute (30d) expiry.
- Passwords: bcrypt cost 12. Anti-enumeration dummy-hash compare.
- Brute force: DB-backed per-IP + per-email rate limiting + account lockout.
- SQLi: Drizzle parameterized queries only. XSS: nonce-based CSP + React escaping.
- CSRF: Server Actions same-origin check + SameSite cookie. MITM: HSTS + Secure.
- Full hardening header set + audit log of auth events.
