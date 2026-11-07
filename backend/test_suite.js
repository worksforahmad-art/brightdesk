/**
 * test_suite.js — Comprehensive Automated Verification for BrightDesk
 *
 * Tests all 16 requirements specified in Section 8 of the prompt.
 */

const http = require('http');
const path = require('path');
const fs = require('fs');

// Ensure database file directory exists
const dbPath = path.join(__dirname, 'database', 'brightdesk.db');
if (fs.existsSync(dbPath)) {
    // We can keep it or clean test records
}

const express = require('express');
const session = require('express-session');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');

const db = require('./database/db');
const authRoutes = require('./routes/authRoutes');
const { requireAuth, requireAuthApi } = require('./middleware/authMiddleware');
const createSessionStore = require('./middleware/sessionStore');

// Clean up any test users from previous runs
db.prepare("DELETE FROM users WHERE email IN ('testuser@example.com', 'persist@example.com')").run();

const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: false }));

const SQLiteStore = createSessionStore(session);

app.use(
    session({
        store: new SQLiteStore(db),
        name: 'brightdesk.sid',
        secret: 'test-suite-secret',
        resave: false,
        saveUninitialized: false,
        cookie: {
            httpOnly: true,
            secure: false, // false for localhost testing
            sameSite: 'strict',
            maxAge: 24 * 60 * 60 * 1000
        }
    })
);

app.use('/css', express.static(path.join(__dirname, '../css')));
app.use('/js', express.static(path.join(__dirname, '../js')));
app.use('/assets', express.static(path.join(__dirname, '../frontend/assets')));

app.get('/', (req, res) => {
    res.redirect(req.session.userId ? '/dashboard' : '/login');
});

app.get('/login', (req, res) => {
    if (req.session.userId) return res.redirect('/dashboard');
    res.sendFile(path.join(__dirname, '../frontend/login.html'));
});

app.get('/signup', (req, res) => {
    if (req.session.userId) return res.redirect('/dashboard');
    res.sendFile(path.join(__dirname, '../frontend/signup.html'));
});

app.get('/dashboard', requireAuth, (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/dashboard.html'));
});

app.use('/api/auth', authRoutes);

// Helper for HTTP requests
function request(server, options, bodyData = null) {
    return new Promise((resolve, reject) => {
        const addr = server.address();
        const reqOptions = {
            hostname: '127.0.0.1',
            port: addr.port,
            path: options.path,
            method: options.method || 'GET',
            headers: options.headers || {}
        };

        if (bodyData) {
            const json = JSON.stringify(bodyData);
            reqOptions.headers['Content-Type'] = 'application/json';
            reqOptions.headers['Content-Length'] = Buffer.byteLength(json);
        }

        const req = http.request(reqOptions, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                let parsed = null;
                try {
                    parsed = JSON.parse(data);
                } catch (_) {
                    parsed = data;
                }
                resolve({
                    status: res.statusCode,
                    headers: res.headers,
                    body: parsed
                });
            });
        });

        req.on('error', reject);

        if (bodyData) {
            req.write(JSON.stringify(bodyData));
        }
        req.end();
    });
}

async function runTests() {
    console.log('🧪 Starting BrightDesk Verification Test Suite...\n');

    const server = http.createServer(app);
    await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
    const port = server.address().port;
    console.log(`Server running on test port ${port}\n`);

    let passed = 0;
    let failed = 0;

    function assert(condition, testName) {
        if (condition) {
            console.log(`  ✅ PASS: ${testName}`);
            passed++;
        } else {
            console.error(`  ❌ FAIL: ${testName}`);
            failed++;
        }
    }

    let sessionCookie = '';

    try {
        // Test 15: Loading of HTML, CSS, JS
        const rLogin = await request(server, { path: '/login' });
        assert(rLogin.status === 200 && rLogin.body.includes('Log In — BrightDesk'), 'Test 15a: GET /login loads HTML');
        assert(rLogin.body.includes('icon-eye-closed') && rLogin.body.includes('icon-eye-open'), 'Test 15a-2: Login has independent icon-eye-closed and icon-eye-open SVGs');

        const rSignup = await request(server, { path: '/signup' });
        assert(rSignup.status === 200 && rSignup.body.includes('Sign Up — BrightDesk'), 'Test 15b: GET /signup loads HTML');
        assert(rSignup.body.includes('data-target="password"') && rSignup.body.includes('data-target="confirmPassword"'), 'Test 15b-2: Signup has independent password and confirmPassword toggles');

        const rDash = await request(server, { path: '/dashboard' });
        // unauth redirects, but let's check dashboard.html directly
        const dashHtml = fs.readFileSync(path.join(__dirname, '../frontend/dashboard.html'), 'utf8');
        assert(dashHtml.includes('id="dashboard-error-state"') && dashHtml.includes('id="retry-dashboard-btn"'), 'Test 15e-2: Dashboard HTML contains error state card and Retry button');
        assert(dashHtml.includes('id="home-status"') && dashHtml.includes('id="profile-status"'), 'Test 15e-3: Dashboard HTML contains Account Status displays');

        const rCss = await request(server, { path: '/css/style.css' });
        assert(rCss.status === 200 && rCss.body.includes('--clr-primary') && rCss.body.includes('[hidden]'), 'Test 15c: GET /css/style.css loads with [hidden] fix');

        const rAuthCss = await request(server, { path: '/css/auth.css' });
        assert(rAuthCss.status === 200 && rAuthCss.body.includes('.auth-card'), 'Test 15d: GET /css/auth.css loads');

        const rDashCss = await request(server, { path: '/css/dashboard.css' });
        assert(rDashCss.status === 200 && rDashCss.body.includes('.dashboard-layout') && rDashCss.body.includes('.status-badge'), 'Test 15e: GET /css/dashboard.css loads with status badge');

        const rMainJs = await request(server, { path: '/js/main.js' });
        assert(rMainJs.status === 200 && rMainJs.body.includes('showAlert'), 'Test 15f: GET /js/main.js loads');

        const rSignupJs = await request(server, { path: '/js/signup.js' });
        assert(rSignupJs.status === 200 && rSignupJs.body.includes('signup-form'), 'Test 15g: GET /js/signup.js loads');

        const rLoginJs = await request(server, { path: '/js/login.js' });
        assert(rLoginJs.status === 200 && rLoginJs.body.includes('login-form'), 'Test 15h: GET /js/login.js loads');

        const rDashJs = await request(server, { path: '/js/dashboard.js' });
        assert(rDashJs.status === 200 && rDashJs.body.includes('/api/auth/me') && rDashJs.body.includes('retryBtn'), 'Test 15i: GET /js/dashboard.js loads with retry handler');

        // Test 10: Direct unauthenticated access to /dashboard
        const rUnauthDash = await request(server, { path: '/dashboard' });
        assert(rUnauthDash.status === 302 && rUnauthDash.headers.location === '/login', 'Test 10: Direct unauthenticated access to Dashboard redirects to /login');

        // Test 2: Registration with empty fields
        const rEmptyReg = await request(server, { path: '/api/auth/signup', method: 'POST' }, {});
        assert(rEmptyReg.status === 400 && rEmptyReg.body.errors && rEmptyReg.body.errors.length > 0, 'Test 2: Registration with empty fields returns 400 validation error');

        // Test Full Name Validation: Numeric-only name reject
        const rNumericName = await request(server, { path: '/api/auth/signup', method: 'POST' }, {
            fullName: '2573486',
            username: 'numericuser',
            email: 'numeric@example.com',
            password: 'Password123',
            confirmPassword: 'Password123'
        });
        assert(rNumericName.status === 400 && rNumericName.body.errors.some(e => e.message.includes('Full name must contain letters')), 'Test Full Name: Numeric-only name 2573486 is rejected with 400');

        // Test Full Name Validation: Invalid symbols reject
        const rSymbolName = await request(server, { path: '/api/auth/signup', method: 'POST' }, {
            fullName: 'User#123$',
            username: 'symboluser',
            email: 'symbol@example.com',
            password: 'Password123',
            confirmPassword: 'Password123'
        });
        assert(rSymbolName.status === 400, 'Test Full Name: Invalid symbols rejected with 400');

        // Test 3: Registration with mismatched passwords
        const rMismatch = await request(server, { path: '/api/auth/signup', method: 'POST' }, {
            fullName: 'Test User',
            username: 'testuser',
            email: 'testuser@example.com',
            password: 'Password123',
            confirmPassword: 'Password999'
        });
        assert(rMismatch.status === 400 && rMismatch.body.errors.some(e => e.message === 'Passwords do not match.'), 'Test 3: Registration with mismatched passwords returns 400');

        // Test 1: Registration with valid information
        const rValidReg = await request(server, { path: '/api/auth/signup', method: 'POST' }, {
            fullName: 'Test User',
            username: 'testuser',
            email: 'testuser@example.com',
            password: 'Password123',
            confirmPassword: 'Password123'
        });
        assert(rValidReg.status === 201 && rValidReg.body.message === 'Account created successfully! Please log in.', 'Test 1: Registration with valid info returns 201 and success message');

        // Test 4: Registration with existing email
        const rDupEmail = await request(server, { path: '/api/auth/signup', method: 'POST' }, {
            fullName: 'Another User',
            username: 'anotheruser',
            email: 'testuser@example.com',
            password: 'Password123',
            confirmPassword: 'Password123'
        });
        assert(rDupEmail.status === 409 && rDupEmail.body.errors[0].message.includes('already exists'), 'Test 4: Registration with existing email returns 409 conflict');

        // Test 8: Login with empty fields
        const rEmptyLogin = await request(server, { path: '/api/auth/login', method: 'POST' }, {});
        assert(rEmptyLogin.status === 400 && rEmptyLogin.body.errors.length > 0, 'Test 8: Login with empty fields returns 400');

        // Test 7: Login with unregistered email
        const rUnregLogin = await request(server, { path: '/api/auth/login', method: 'POST' }, {
            email: 'notregistered@example.com',
            password: 'Password123'
        });
        assert(rUnregLogin.status === 401 && rUnregLogin.body.errors[0].message === 'Incorrect email or password. Please try again.', 'Test 7: Login with unregistered email returns 401');

        // Test 6: Login with incorrect password
        const rWrongPass = await request(server, { path: '/api/auth/login', method: 'POST' }, {
            email: 'testuser@example.com',
            password: 'WrongPassword999'
        });
        assert(rWrongPass.status === 401 && rWrongPass.body.errors[0].message === 'Incorrect email or password. Please try again.', 'Test 6: Login with incorrect password returns 401');

        // Test 5 & 9: Login with valid credentials & redirect to dashboard
        const rValidLogin = await request(server, { path: '/api/auth/login', method: 'POST' }, {
            email: 'testuser@example.com',
            password: 'Password123'
        });
        assert(rValidLogin.status === 200 && rValidLogin.body.redirectTo === '/dashboard', 'Test 5 & 9: Login with valid credentials succeeds and provides redirectTo: /dashboard');

        // Extract session cookie
        const rawCookie = rValidLogin.headers['set-cookie'];
        if (rawCookie && rawCookie[0]) {
            sessionCookie = rawCookie[0].split(';')[0];
        }
        assert(sessionCookie.startsWith('brightdesk.sid='), 'Test 5b: Session cookie brightdesk.sid issued');

        // Test 11: Dashboard refresh while logged in & verify user data
        const rDashAuth = await request(server, {
            path: '/dashboard',
            headers: { Cookie: sessionCookie }
        });
        assert(rDashAuth.status === 200 && rDashAuth.body.includes('Dashboard — BrightDesk'), 'Test 11a: Authenticated user can access /dashboard');

        const rMe = await request(server, {
            path: '/api/auth/me',
            headers: { Cookie: sessionCookie }
        });
        assert(rMe.status === 200 && rMe.body.user.email === 'testuser@example.com' && rMe.body.user.fullName === 'Test User', 'Test 11b: /api/auth/me returns authenticated user details');
        assert(rMe.body.user.status === 'Active', 'Test 11c: /api/auth/me returns Account status: Active');

        // Test 12: Logout functionality
        const rLogout = await request(server, {
            path: '/api/auth/logout',
            method: 'POST',
            headers: { Cookie: sessionCookie }
        });
        assert(rLogout.status === 200 && rLogout.body.success === true, 'Test 12: Logout succeeds with 200');

        // Test 13: Protected access after logout
        const rPostLogoutDash = await request(server, {
            path: '/dashboard',
            headers: { Cookie: sessionCookie }
        });
        assert(rPostLogoutDash.status === 302 && rPostLogoutDash.headers.location === '/login', 'Test 13a: Accessing /dashboard after logout redirects to /login');

        const rPostLogoutMe = await request(server, {
            path: '/api/auth/me',
            headers: { Cookie: sessionCookie }
        });
        assert(rPostLogoutMe.status === 401, 'Test 13b: /api/auth/me returns 401 after logout');

        // Test 14: User data persistence across server restarts
        // Create user 'persist@example.com'
        await request(server, { path: '/api/auth/signup', method: 'POST' }, {
            fullName: 'Persistent User',
            username: 'persistuser',
            email: 'persist@example.com',
            password: 'Password123',
            confirmPassword: 'Password123'
        });

        // Close this server instance
        await new Promise(resolve => server.close(resolve));

        // Start a brand-new server instance to simulate a restart
        const server2 = http.createServer(app);
        await new Promise(resolve => server2.listen(0, '127.0.0.1', resolve));

        // Attempt login on the new server instance with the created user
        const rPersistLogin = await request(server2, { path: '/api/auth/login', method: 'POST' }, {
            email: 'persist@example.com',
            password: 'Password123'
        });
        assert(rPersistLogin.status === 200 && rPersistLogin.body.redirectTo === '/dashboard', 'Test 14: User persists and can log in after simulated server restart');

        // Clean up
        db.prepare("DELETE FROM users WHERE email IN ('testuser@example.com', 'persist@example.com')").run();
        await new Promise(resolve => server2.close(resolve));

        // Test 16: Responsive layout verification in CSS
        const cssContent = fs.readFileSync(path.join(__dirname, '../css/dashboard.css'), 'utf8');
        const authCssContent = fs.readFileSync(path.join(__dirname, '../css/auth.css'), 'utf8');
        const hasMobileQueries = cssContent.includes('@media (max-width: 768px)') &&
                                 cssContent.includes('@media (max-width: 480px)') &&
                                 authCssContent.includes('@media (max-width: 480px)');
        assert(hasMobileQueries, 'Test 16: Responsive media queries for desktop, tablet, and mobile present in CSS');

    } catch (err) {
        console.error('Test run error:', err);
        failed++;
    }

    console.log(`\n================================`);
    console.log(`Total tests: ${passed + failed}`);
    console.log(`Passed:      ${passed}`);
    console.log(`Failed:      ${failed}`);
    console.log(`================================\n`);

    if (failed > 0) {
        process.exit(1);
    } else {
        process.exit(0);
    }
}

runTests();
