# BrightDesk: Supabase PostgreSQL + Railway setup

This is **the same BrightDesk project** you already have. It keeps its HTML/CSS/JS
frontend and Express login system. Supabase supplies PostgreSQL storage only;
**do not enable Supabase Auth** for these existing accounts.

## Before changing the live site

1. Keep your original SQLite database and Railway volume untouched.
2. If you have real users already, obtain a separate backup of the **Railway**
   SQLite file (`/data/brightdesk.db`). A copy of your laptop's SQLite file
   is not necessarily the same database. Check accounts before switching.
3. Create the Supabase PostgreSQL project. You already copied its **Session
   pooler** connection string (port **5432**). **Do not put this in GitHub,
   ChatGPT, or frontend JavaScript.**
4. Remember: switching databases without importing existing users means old
   accounts will not exist in the new database. Sessions cannot be reused.

## 1. Create the schema in Supabase (required once)

Open Supabase Dashboard > your BrightDesk project > **SQL Editor** > New query.
Paste the contents of:

`backend/database/migrations/001_init_postgres.sql`

Run the SQL. In Table Editor you should now see `public.users` and
`public.sessions`. These tables have Row Level Security enabled and their
`anon` / `authenticated` database privileges revoked. Do not add public RLS
policies or expose these tables through the browser; the Express backend
connects using the private PostgreSQL URL.

## 2. Prepare and test locally (Windows / VS Code)

Unzip this project into a **separate development folder** first, or carefully
copy the changed files over your existing repository after making a backup.
Then in its root:

```powershell
npm install
npm test
npm start
```

`npm install` is **required** because `pg` was added. It regenerates
`package-lock.json` to match `package.json`. Commit the updated lockfile too.
The automated test suite uses its **own temporary SQLite database** and does
not touch your registered users. With no `DATABASE_URL`, local development
continues using SQLite as before.

Optionally, to test directly against a **separate, non-production Supabase
project** set `DATABASE_URL` in a local ignored `.env` file and run `npm start`.
Do not test experimental registrations against your real production database.

## 3. PostgreSQL TLS (important)

BrightDesk enables TLS with **certificate verification** for PostgreSQL.
In Supabase's **Connect** dialog use the **Session pooler** URL, not the
`supabase-js` or Next.js instructions. Replace `[YOUR-PASSWORD]` locally. If
it contains reserved URL characters (such as `@`, `#`, `?`, `%`, `&`),
percent-encode the password in the URL.

Supabase may require its CA certificate. If your connection reports a TLS
certificate validation error, download the Supabase **CA certificate** from
Database Settings > SSL Configuration, and set Railway's `DATABASE_CA_CERT`
secret to the PEM certificate content. Never solve TLS errors by setting
`NODE_TLS_REJECT_UNAUTHORIZED=0` or by using `rejectUnauthorized: false`.

## 4. Optional: import registered users from SQLite

Only do this if you need your existing account records. Use a **read-only
backup copy** of the original SQLite database; do not modify the live file.
The import retains password hashes so users keep their passwords; it does not
copy sessions or delete existing PostgreSQL users. Accounts conflicting on
username/email are skipped. Check counts after importing.

```powershell
$env:SQLITE_SOURCE_PATH="C:\path\to\your\backup-of-brightdesk.db"
node backend/database/migrateSqliteUsers.js
```

For the actual import, provide `DATABASE_URL` securely in your local ignored
`.env` and run:

```powershell
node backend/database/migrateSqliteUsers.js --apply
```

If you don't have the Railway SQLite backup and want to preserve existing
online registrations, **do not switch Railway to PostgreSQL yet**.

## 5. Deploy without breaking Railway

**Important order:**

1. Run `npm install` to update `package-lock.json`; run `npm test` locally.
2. Commit only reviewed source files (`.env`/SQLite DBs/node_modules are ignored)
   and push to your GitHub `main` branch. **Without `DATABASE_URL` Railway
   continues to use the existing SQLite volume.**
3. Apply the schema in Supabase (step 1) and import any needed users (step 4).
4. In Railway > BrightDesk service > Variables add:

   | Name | Value |
   | ---- | ----- |
   | `NODE_ENV` | `production` |
   | `SESSION_SECRET` | Keep the existing long random secret |
   | `DATABASE_URL` | Private Supabase Session pooler URL, port 5432 |
   | `DATABASE_CA_CERT` | Optional Supabase PEM CA when needed |

   Remove `DATABASE_SSL=false` if present. Railway supplies `PORT`.
   **Do not remove the existing `DATABASE_PATH` variable or `/data` volume
   until the new setup is verified and backed up.** `DATABASE_URL` takes
   precedence while present.
5. Apply Railway variable changes/redeploy. View **deployment logs**.
   A healthy startup logs `Database ready: PostgreSQL (Supabase)`.
   If the URL is wrong or tables are missing, BrightDesk **fails startup**
   rather than silently writing new users to an empty SQLite database.
6. Open your Railway URL. Register a **new test account**, verify it appears
   in `public.users`, log in, open dashboard, refresh, log out, and confirm
   the session has disappeared from `public.sessions`.

### Rollback plan

If PostgreSQL deployment fails, remove `DATABASE_URL` from Railway Variables
and redeploy. The app resumes using the **original SQLite database** as long
as its Railway `/data` volume was preserved. Accounts created *only* in
PostgreSQL during the test will not appear on SQLite after rollback. Keep a
backup of both stores before any final cutover.

## What changed in the code?

- `backend/database/db.js`: chooses PostgreSQL with `DATABASE_URL`, otherwise SQLite.
- `backend/models/userModel.js`: async SQL with `$1` placeholders in PostgreSQL.
- `backend/middleware/sessionStore.js`: persistent PostgreSQL sessions and expiry renewal.
- `backend/controllers/authController.js`: awaits database operations and handles duplicate errors.
- `backend/server.js`: checks PostgreSQL connectivity/schema before serving traffic.
- `backend/database/migrations/001_init_postgres.sql`: PostgreSQL tables, indexes, and access controls.
- `backend/database/migrateSqliteUsers.js`: optional read-only SQLite account import.
- `backend/test_suite.js`: tests run on an isolated temporary SQLite database.

No live Supabase queries, Railway variable updates, or GitHub pushes have been
performed by this ZIP preparation. A real end-to-end PostgreSQL test requires
an authorized connection to your Supabase project.
