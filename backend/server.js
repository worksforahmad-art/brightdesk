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
const path       = require('path');

// Our own modules
const db                 = require('./database/db');
const authRoutes         = require('./routes/authRoutes');
const { requireAuth }    = require('./middleware/authMiddleware');
const createSessionStore = require('./middleware/sessionStore');

const app  = express();
const PORT = process.env.PORT || 3000;
const HOST = process.env.HOST || '0.0.0.0';
const isProduction = process.env.NODE_ENV === 'production';

// Trust Railway / reverse proxy headers (X-Forwarded-Proto, X-Forwarded-For)
// Essential for secure cookies over HTTPS and correct client IP rate limiting
app.set('trust proxy', 1);

if (isProduction && !process.env.SESSION_SECRET) {
    console.warn('⚠️  WARNING: SESSION_SECRET is not set in environment variables! Please configure it in Railway.');
}

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
        proxy:             true, // respect reverse-proxy HTTPS status for cookies
        cookie: {
            httpOnly: true,  // JavaScript cannot read this cookie — prevents XSS theft
            secure:   isProduction, // HTTPS-only in production (uses X-Forwarded-Proto via proxy)
            sameSite: 'lax', // allows smooth redirection back into the app while protecting against CSRF
            maxAge:   24 * 60 * 60 * 1000 // 24 hours in milliseconds
        }
    })
);

// ── 4. Static File Serving ────────────────────────────────────────────────────
// Serve CSS, frontend JS, and images as static files.
// HTML pages are served through routes (not static), so we control access.
app.use('/css',    express.static(path.join(__dirname, '../css')));
app.use('/js',     express.static(path.join(__dirname, '../js')));
app.use('/assets', express.static(path.join(__dirname, '../frontend/assets')));

// ── 5. Page Routes ────────────────────────────────────────────────────────────

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

// ── 6. API Routes ─────────────────────────────────────────────────────────────
// Authentication API endpoints (/signup and /login are rate-limited in authRoutes.js)
app.use('/api/auth', authRoutes);

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
app.listen(PORT, HOST, () => {
    console.log('');
    console.log('  ✨  BrightDesk is running!');
    console.log(`  🌐  Listening on http://${HOST === '0.0.0.0' ? 'localhost' : HOST}:${PORT}`);
    console.log('  ⏹   Press Ctrl + C to stop.');
    console.log('');
});
