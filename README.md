# BrightDesk

BrightDesk is a responsive Sign Up, Login, and Dashboard learning project built
with HTML, CSS, vanilla JavaScript, Express, and server-side login sessions.

**Databases:** It uses SQLite for local development. It can use **Supabase
PostgreSQL** when the server has a `DATABASE_URL` environment variable.
The app still handles registration and login itself; it does **not** use
Supabase Auth.

**Read [SUPABASE_SETUP.md](SUPABASE_SETUP.md) before changing your live Railway
configuration.** Do not switch databases until you have checked existing user
accounts and created the PostgreSQL tables. Your real `.env`, database files,
Git history, and `node_modules` are **not included** in this ZIP.

## Project layout

```text
frontend/               HTML pages: signup.html, login.html, dashboard.html
css/                    Shared, auth, and dashboard styles
js/                     Browser-side form, dashboard, and UI logic
backend/server.js       Express routes, secure cookies, application startup
backend/routes/         API routes and input validation
backend/controllers/    Signup, login, logout, and profile handlers
backend/models/         User database queries
backend/middleware/     Page/API guards and database-backed session store
backend/database/db.js  SQLite fallback or PostgreSQL connection
backend/database/migrations/001_init_postgres.sql    Supabase SQL schema
backend/database/migrateSqliteUsers.js               Optional account import
backend/test_suite.js                 Local authentication integration tests
backend/test_database_adapters.js     SQLite + mocked PostgreSQL data tests
.env.example            Sample settings without real secrets
.gitignore              Prevents secrets, DB files, and dependencies being committed
SUPABASE_SETUP.md        Step-by-step Railway + Supabase migration instructions
```

## Get started on Windows (VS Code)

Open a terminal in the **BrightDesk project root**:

```powershell
npm install
npm test
npm run test:adapters
npm start
```

Open `http://localhost:3000`. Press `Ctrl + C` to stop the server.

**Important:** `npm install` must run before `npm test`, because this edition
adds the PostgreSQL driver `pg`. It also updates `package-lock.json` to match
the updated `package.json`. **Commit the updated package-lock.json together
with your changes.** Do not push a mismatched lockfile to Railway.

Without `DATABASE_URL`, BrightDesk continues using the local SQLite database,
so existing local accounts are not changed by the integration.

### Environment configuration

For local development, your existing ignored `.env` can remain unchanged. If
you don't have one, copy `.env.example` and set a **new random** secret:

```powershell
Copy-Item .env.example .env
node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))"
```

Paste the output into your **local** `.env` as `SESSION_SECRET`. Never share it.

For Railway + Supabase, configure variables privately in Railway's **Variables**
tab **after completing the SQL schema and any user migration**:

| Variable | Value |
| --- | --- |
| `NODE_ENV` | `production` |
| `SESSION_SECRET` | Your existing random production secret (32+ chars) |
| `DATABASE_URL` | Supabase **Session pooler** PostgreSQL connection string |
| `DATABASE_CA_CERT` | Optional trusted Supabase CA certificate, if required |

Railway supplies `PORT`. The app listens on `0.0.0.0` and uses secure cookies
behind the Railway HTTPS proxy.

If `DATABASE_URL` is **not** set, the existing `DATABASE_PATH` option remains
available, such as `/data/brightdesk.db` on the Railway volume. If it **is** set,
BrightDesk uses PostgreSQL for **both users and login sessions**; it will fail
startup if the database or schema is unavailable rather than create empty users
somewhere else.

## How the website works

1. **HTML and CSS** draw the pages; `/js/*.js` scripts handle browser actions.
2. **Sign Up:** `js/signup.js` sends a `POST /api/auth/signup` request. The
   backend validates name, email, username, and password, hashes the password
   with bcrypt, and inserts the account in the database.
3. **Log In:** `js/login.js` sends `POST /api/auth/login`. Express compares the
   password with the saved hash, regenerates the session ID, and saves a session.
4. **Session cookie:** The browser receives an `HttpOnly` **signed** cookie
   (`brightdesk.sid`); the actual login session is stored in SQLite or
   PostgreSQL. In production the cookie uses HTTPS (`Secure`) and
   `SameSite=Lax`. It is **not** an encrypted cookie.
5. **Dashboard:** Server-side `requireAuth` prevents unauthenticated visits to
   `/dashboard`. `js/dashboard.js` reads `/api/auth/me` to show account details.
6. **Logout:** `POST /api/auth/logout` deletes the server-side session and
   clears the cookie.

All SQL values are sent as separate parameters, rather than interpolating
untrusted user inputs directly into queries.

## Testing

`npm test` uses an **isolated temporary SQLite database** and does not read or
delete your real BrightDesk users or sessions. It covers form validation,
correct/incorrect passwords, authentication, dashboard protection, logout,
static assets, and more. `npm run test:adapters` checks user queries and session
operations against SQLite and a **mocked** PostgreSQL driver.

Passing these tests is **not** proof that your actual Supabase credentials,
certificate, schema, Railway networking, or production sessions work. The
[deployment checklist](SUPABASE_SETUP.md) describes the required live checks.

## GitHub workflow

You already have a GitHub repository:
`https://github.com/worksforahmad-art/brightdesk`.
This ZIP does **not** push to GitHub or change your Railway service.

After carefully applying the modified files, installing dependencies and
running tests:

```powershell
git status --short
git add .
git diff --cached --name-only
git commit -m "Add optional Supabase PostgreSQL backend"
git push origin main
```

Check that `.env`, local databases, `node_modules`, backups, and credentials are
not staged. A GitHub push may trigger an automatic Railway deployment, so
review the configuration and preserve your SQLite volume before switching
`DATABASE_URL` on.

## Learning ideas

- Add a profile-editing form and server-side update validation.
- Add a change-password route that checks the old password first.
- Add a server-side account deletion flow with confirmation.
- Add optional email verification with a trusted mail provider.
- Add automated PostgreSQL integration tests using a separate test database.

**Security note:** This is a learning project. Public deployment also warrants
a thorough production security review (such as CSRF protections, account
abuse protection, dependency updates, backup/restore testing, and monitoring).
