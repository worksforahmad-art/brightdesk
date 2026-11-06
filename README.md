# BrightDesk — Complete Authentication Website

A modern, responsive web application featuring real database-backed user registration, credential verification, secure session management, and a protected dashboard.

Built with **HTML5**, **CSS3**, **Vanilla JavaScript**, **Node.js**, **Express.js**, and **SQLite**.

---

## Table of Contents

1. [Quick Start & Windows Terminal Commands](#quick-start--windows-terminal-commands)
2. [Project Status](#project-status)
3. [Complete Folder Structure](#complete-folder-structure)
4. [File-by-File Explanation](#file-by-file-explanation)
5. [How Frontend Connects to CSS and JavaScript](#how-frontend-connects-to-css-and-javascript)
6. [How Frontend JavaScript Communicates with the Backend](#how-frontend-javascript-communicates-with-the-backend)
7. [How the SQLite Database Stores User Registrations](#how-the-sqlite-database-stores-user-registrations)
8. [How Passwords Are Securely Verified](#how-passwords-are-securely-verified)
9. [How Login Sessions Work](#how-login-sessions-work)
10. [How the Dashboard Protects Access](#how-the-dashboard-protects-access)
11. [How Logout Works](#how-logout-works)
12. [How You Can Modify and Expand the Application](#how-you-can-modify-and-expand-the-application)
13. [Security Architecture](#security-architecture)

---

## Quick Start & Windows Terminal Commands

Open a PowerShell or Command Prompt terminal in VS Code (`Ctrl + ~`) in the project directory:

### 1. Install Dependencies
```powershell
npm install
```

### 2. Configure Environment Variables
A configured `.env` file with a cryptographically generated session secret has already been created for you.
If you ever want to re-generate it from the template:
```powershell
Copy-Item .env.example .env
```

### 3. Run Automated Verification Tests
We included a complete test suite covering all 16 specification requirements:
```powershell
npm test
```

### 4. Start the Application Server
```powershell
npm start
```

### 5. Open in Your Web Browser
Open your browser and navigate to:
```
http://localhost:3000
```

### 6. Stop and Restart the Application
- **To stop the server**: Click inside the terminal and press `Ctrl + C` (type `Y` and Enter if prompted).
- **To restart**: Run `npm start` again.
- All registered accounts and active sessions remain saved in the SQLite database across restarts!

---

## Project Status

- ✅ **Backup**: Fully preserved at `Desktop/brightdesk-backup-old-project` (includes old Git repo and changes).
- ✅ **Clean Root**: `New folder (2)` is the clean project root with zero unnecessary nesting.
- ✅ **Fresh Git**: Initialized with independent history; no remote connected or pushed.
- ✅ **Database**: Uses Node.js native `node:sqlite` (DatabaseSync) — zero external C++ build tool dependencies.
- ✅ **Frontend**: Signup, Login, and Dashboard pages with responsive modern design and CSS variables.
- ✅ **Backend**: Express server with session cookies, rate-limiting, Helmet security headers, and MVC layout.
- ✅ **Testing**: 26/26 automated unit & integration tests passing.

---

## Complete Folder Structure

```text
New folder (2)/
│
├── frontend/                     # Frontend HTML pages
│   ├── login.html                # Login form page
│   ├── signup.html               # Registration form page
│   └── dashboard.html            # Protected user dashboard
│
├── css/                          # Stylesheets
│   ├── style.css                 # Base resets, variables, and shared buttons
│   ├── auth.css                  # Styling for auth cards, inputs, and floating blobs
│   └── dashboard.css             # Layout, sidebar, profile cards, and responsiveness
│
├── js/                           # Client-side JavaScript
│   ├── main.js                   # Shared utilities (alerts, password toggles, formatting)
│   ├── signup.js                 # Signup form validation and API call
│   ├── login.js                  # Login form validation and API call
│   └── dashboard.js              # Dashboard data fetching, sections, and logout
│
├── backend/                      # Server-side architecture
│   ├── server.js                 # Main Express application entry point
│   │
│   ├── routes/
│   │   └── authRoutes.js         # API endpoints and express-validator rules
│   │
│   ├── controllers/
│   │   └── authController.js     # Auth logic (signup, login, logout, me)
│   │
│   ├── middleware/
│   │   ├── authMiddleware.js     # Route guards (requireAuth, requireAuthApi)
│   │   └── sessionStore.js       # SQLite-backed persistent session store
│   │
│   ├── models/
│   │   └── userModel.js          # Parameterized SQLite queries for users
│   │
│   ├── database/
│   │   └── db.js                 # SQLite connection & table initialization
│   │
│   └── test_suite.js             # Automated 26-test verification runner
│
├── .env                          # Local secrets (ignored by Git)
├── .env.example                  # Safe environment template
├── .gitignore                    # Excludes node_modules, database files, and .env
├── package.json                  # Dependencies and npm scripts
└── README.md                     # Documentation and learning guide
```

---

## File-by-File Explanation

### Frontend Files
- **`frontend/signup.html`**: Contains the semantic form for user registration: Full Name, Username, Email, Password, and Confirm Password with accessible labels, error slots, and toggle buttons.
- **`frontend/login.html`**: Clean login interface with Email and Password inputs, show/hide password buttons, and inline alert banners.
- **`frontend/dashboard.html`**: A two-column dashboard interface. Served strictly through server-side authenticated routes (never exposed as a static file).
- **`css/style.css`**: Defines CSS design tokens (`--clr-primary`, `--radius-md`, etc.), global typography (Google Fonts 'DM Sans'), reset rules, and shared button styles.
- **`css/auth.css`**: Styles the glassmorphism authentication card, floating gradient blobs, form fields, and animations.
- **`css/dashboard.css`**: Provides desktop grid/sidebar layout and mobile drawer navigation with `@media` breakpoints for tablets and phones.
- **`js/main.js`**: Reusable frontend utilities: `showAlert()`, `setFieldError()`, `clearAllFieldErrors()`, `setButtonLoading()`, `formatDate()`, and `initPasswordToggles()`.
- **`js/signup.js`**: Validates user inputs client-side, submits JSON to `/api/auth/signup`, and redirects to login with a success notice.
- **`js/login.js`**: Handles login submissions, displays server error messages, and navigates to `/dashboard` upon success.
- **`js/dashboard.js`**: Fetches authenticated user info via `/api/auth/me`, switches between "Home" and "Profile" sections, and manages sidebar toggles and logout.

### Backend Files
- **`backend/server.js`**: Express server setup. Applies Helmet headers, parses JSON request bodies, sets up session cookies, registers static assets, and mounts route handlers.
- **`backend/database/db.js`**: Initializes SQLite database `brightdesk.db` and ensures the `users` and `sessions` tables exist.
- **`backend/models/userModel.js`**: Data Access Object. Encapsulates `INSERT` and `SELECT` queries using prepared statements to prevent SQL injection.
- **`backend/middleware/authMiddleware.js`**: Route guards. `requireAuth` intercepts unauthenticated page requests and redirects to `/login`. `requireAuthApi` sends HTTP 401 JSON responses for API routes.
- **`backend/middleware/sessionStore.js`**: Implements a persistent SQLite session store for `express-session`, ensuring logins persist across server restarts.
- **`backend/controllers/authController.js`**: Handles incoming requests, hashes passwords with bcrypt, verifies credentials, manages session regeneration, and clears cookies.
- **`backend/routes/authRoutes.js`**: Maps URLs to controller methods and applies `express-validator` sanitation and validation chains.

---

## How Frontend Connects to CSS and JavaScript

In your HTML files (e.g. `frontend/signup.html`), stylesheets are linked inside the `<head>`:
```html
<link rel="stylesheet" href="/css/style.css">
<link rel="stylesheet" href="/css/auth.css">
```
And JavaScript files are included at the bottom of `<body>`:
```html
<script src="/js/main.js"></script>
<script src="/js/signup.js"></script>
```
In `backend/server.js`, Express serves these folders statically:
```javascript
app.use('/css', express.static(path.join(__dirname, '../css')));
app.use('/js',  express.static(path.join(__dirname, '../js')));
```
When a browser asks for `/css/auth.css`, Express automatically finds the file on disk and delivers it.

---

## How Frontend JavaScript Communicates with the Backend

Communication between the client browser and the server uses the modern **Fetch API** (`fetch`):

1. **User action**: The user fills in the form and clicks "Create Account".
2. **Prevent page reload**: `event.preventDefault()` stops traditional HTML form submission.
3. **Send asynchronous request**:
   ```javascript
   const response = await fetch('/api/auth/signup', {
       method: 'POST',
       headers: { 'Content-Type': 'application/json' },
       body: JSON.stringify({ fullName, username, email, password, confirmPassword })
   });
   ```
4. **Parse response**:
   ```javascript
   const data = await response.json();
   ```
5. **Handle outcome**: If `response.ok` is true, redirect the user. If false, display the validation error messages returned by the server.

---

## How the SQLite Database Stores User Registrations

The database lives in `backend/database/brightdesk.db`.

When a user signs up, the application runs:
```sql
INSERT INTO users (full_name, username, email, password)
VALUES (?, ?, ?, ?);
```
- The `?` symbols are **parameterized placeholders**. Values are passed separately from the SQL statement so input can never be interpreted as SQL commands, completely eliminating **SQL Injection**.
- The `password` stored is a **bcrypt hash** (e.g. `$2a$12$e8...`), never plain text.

---

## How Passwords Are Securely Verified

1. **During Registration**:
   `bcrypt.hash(password, 12)` generates a unique salt and hashes the password 4,096 times. Even identical passwords yield completely different hashes.
2. **During Login**:
   `bcrypt.compare(enteredPassword, storedHash)` hashes the entered password using the embedded salt and checks if it matches.
3. **Protection against Timing Attacks**:
   If an email does not exist, the server compares the password against a dummy hash anyway. This ensures requests take the same amount of time regardless of whether an email exists, preventing attackers from harvesting valid emails.

---

## How Login Sessions Work

1. Upon successful password verification, Express runs:
   ```javascript
   req.session.userId = user.id;
   ```
2. The session store writes the session data into the `sessions` table in SQLite.
3. Express issues an encrypted cookie named `brightdesk.sid` to the browser with the flags:
   - `HttpOnly`: JavaScript cannot read this cookie (prevents theft via XSS).
   - `SameSite=Strict`: Protects against Cross-Site Request Forgery (CSRF).
   - `maxAge`: 24 hours.
4. On future requests, the browser automatically sends this cookie. Express checks the database and restores `req.session.userId`.

---

## How the Dashboard Protects Access

Access to `/dashboard` is protected **on the server**:
```javascript
app.get('/dashboard', requireAuth, (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/dashboard.html'));
});
```
- If an unauthenticated user enters `http://localhost:3000/dashboard`, `requireAuth` detects that `req.session.userId` is absent and immediately redirects to `/login`.
- The dashboard HTML file is never served publicly through `express.static`.

---

## How Logout Works

1. Clicking "Logout" triggers a `fetch('/api/auth/logout', { method: 'POST' })` request.
2. The backend controller deletes the session record from the SQLite `sessions` table:
   ```javascript
   req.session.destroy();
   ```
3. The server instructs the browser to erase the cookie:
   ```javascript
   res.clearCookie('brightdesk.sid');
   ```
4. The client redirects to `/login`.
5. Pressing the browser's "Back" button cannot access the dashboard because `Cache-Control: no-store` prevents the browser from caching the page.

---

## How You Can Modify and Expand the Application

As you learn JavaScript, here are great beginner exercises to practice:

1. **Add a "Bio" or "Phone Number" field**:
   - Add a column to the `users` table in `backend/database/db.js`.
   - Add an input to `frontend/signup.html`.
   - Update validation in `backend/routes/authRoutes.js`.
   - Display the new field in `frontend/dashboard.html` and `js/dashboard.js`.
2. **Add "Change Password" functionality**:
   - Create a new POST endpoint `/api/auth/change-password`.
   - Verify the old password with `bcrypt.compare`.
   - Hash and save the new password using `userModel.js`.
3. **Add Dark Mode toggle**:
   - Define dark theme variables under `[data-theme="dark"]` in `css/style.css`.
   - Add a toggle button in `frontend/dashboard.html`.
   - Use `localStorage` in `js/main.js` to remember the user's theme preference.

---

## Security Architecture Summary

- **Password Storage**: bcrypt (cost factor 12) with unique salts.
- **Session Security**: Server-side SQLite persistence, session regeneration on login, HttpOnly cookies, SameSite=Strict.
- **SQL Injection Prevention**: Parameterized prepared statements on all SQLite queries.
- **Brute Force Protection**: IP rate limiting via `express-rate-limit` (20 attempts per 15 min).
- **HTTP Hardening**: Helmet.js security headers (Content Security Policy, X-Frame-Options, DNS prefetch control).
- **Information Leakage Prevention**: Generic error messages on login failures ("Incorrect email or password").
