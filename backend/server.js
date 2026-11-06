/**
 * server.js — Express Application Entry Point
 *
 * This is where everything comes together.
 * It sets up the Express server, applies middleware, and defines routes.
 *
 * To start the server: node backend/server.js
 */

// Load environment variables from .env file first
require('dotenv').config();

const express    = require('express');
const session    = require('express-session');
const helmet     = require('helmet');
const rateLimit  = require('express-rate-limit');
const path       = require('path');

// Our own modules
const db                 = require('./database/db');
const authRoutes         = require('./routes/authRoutes');
const { requireAuth }    = require('./middleware/authMiddleware');
const createSessionStore = require('./middleware/sessionStore');

const app  = express();
const PORT = process.env.PORT || 3000;

// ── 1. Security Headers (helmet) ──────────────────────────────────────────────
// helmet sets sensible HTTP headers to protect against common attacks
app.use(
    helmet({
        contentSecurityPolicy: {
            directives: {
                defaultSrc: ["'self'"],
                // Allow Google Fonts stylesheet
                styleSrc:   ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
                // Allow Google Fonts font files
                fontSrc:    ["'self'", 'https://fonts.gstatic.com'],
                scriptSrc:  ["'self'"],
                imgSrc:     ["'self'", 'data:'],
            }
        }
    })
);

// ── 2. Body Parsing ───────────────────────────────────────────────────────────
// These let Express read the JSON data sent by the frontend
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// ── 3. Session Setup ──────────────────────────────────────────────────────────
// Sessions keep users logged in between requests.
// We store sessions in SQLite so they survive server restarts.
const SQLiteStore = createSessionStore(session);

app.use(
    session({
        store:             new SQLiteStore(db), // save sessions in SQLite
        name:              'brightdesk.sid',    // name of the cookie in the browser
        secret:            process.env.SESSION_SECRET || 'dev-fallback-secret-change-me',
        resave:            false,
        saveUninitialized: false,
        cookie: {
            httpOnly: true,  // JavaScript cannot read this cookie — prevents XSS theft
            secure:   process.env.NODE_ENV === 'production', // HTTPS-only in production
            sameSite: 'strict', // blocks cross-site requests — basic CSRF protection
            maxAge:   24 * 60 * 60 * 1000 // 24 hours in milliseconds
        }
    })
);

// ── 4. Rate Limiting ──────────────────────────────────────────────────────────
// Limits how many login/signup attempts can come from one IP address.
// Helps prevent brute-force password attacks.
const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15-minute window
    max:      20,              // max 20 requests per window per IP
    message:  {
        errors: [{ message: 'Too many attempts from this IP. Please wait 15 minutes.' }]
    },
    standardHeaders: true,
    legacyHeaders:   false
});

// ── 5. Static File Serving ────────────────────────────────────────────────────
// Serve CSS, frontend JS, and images as static files.
// HTML pages are served through routes (not static), so we control access.
app.use('/css',    express.static(path.join(__dirname, '../css')));
app.use('/js',     express.static(path.join(__dirname, '../js')));
app.use('/assets', express.static(path.join(__dirname, '../frontend/assets')));

// ── 6. Page Routes ────────────────────────────────────────────────────────────

// Home — redirect to dashboard if logged in, otherwise to login
app.get('/', (req, res) => {
    res.redirect(req.session.userId ? '/dashboard' : '/login');
});

// Login page — if already logged in, skip to dashboard
app.get('/login', (req, res) => {
    if (req.session.userId) return res.redirect('/dashboard');
    res.sendFile(path.join(__dirname, '../frontend/login.html'));
});

// Signup page — if already logged in, skip to dashboard
app.get('/signup', (req, res) => {
    if (req.session.userId) return res.redirect('/dashboard');
    res.sendFile(path.join(__dirname, '../frontend/signup.html'));
});

// Dashboard — PROTECTED. requireAuth checks the session before serving the page.
// If not logged in, requireAuth redirects to /login automatically.
// Navigating directly to /dashboard without being logged in will NOT work.
app.get('/dashboard', requireAuth, (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/dashboard.html'));
});

// ── 7. API Routes ─────────────────────────────────────────────────────────────
// All auth API endpoints — rate limited
app.use('/api/auth', authLimiter, authRoutes);

// ── 8. 404 Handler ────────────────────────────────────────────────────────────
app.use((req, res) => {
    res.status(404).send(`
        <style>body{font-family:sans-serif;display:flex;align-items:center;justify-content:center;height:100vh;margin:0;background:#edf2f7}</style>
        <div style="text-align:center">
            <h2 style="color:#1e293b">404 — Page Not Found</h2>
            <p style="color:#64748b">The page you're looking for doesn't exist.</p>
            <a href="/" style="color:#1a73e8">← Go Home</a>
        </div>
    `);
});

// ── 9. Global Error Handler ───────────────────────────────────────────────────
// Catches any unhandled errors and returns a clean response
app.use((err, req, res, next) => { // eslint-disable-line no-unused-vars
    console.error('Unhandled error:', err.message);
    res.status(500).json({ errors: [{ message: 'An unexpected error occurred.' }] });
});

// ── 10. Start Server ──────────────────────────────────────────────────────────
app.listen(PORT, () => {
    console.log('');
    console.log('  ✨  BrightDesk is running!');
    console.log(`  🌐  Open: http://localhost:${PORT}`);
    console.log('  ⏹   Press Ctrl + C to stop.');
    console.log('');
});
