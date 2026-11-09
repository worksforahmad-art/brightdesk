/**
 * authController.js — Authentication Business Logic
 *
 * This file contains the actual logic for each auth action:
 *   - signup  : create a new user account
 *   - login   : verify credentials and start a session
 *   - logout  : end the session
 *   - getMe   : return the current user's data to the Dashboard
 *
 * Controllers receive a request (req) and send a response (res).
 * They talk to the userModel for database operations.
 */

const bcrypt = require('bcryptjs');
const { validationResult } = require('express-validator');
const userModel = require('../models/userModel');

const authController = {
    /**
     * POST /api/auth/signup
     *
     * Registers a new user:
     *   1. Check for validation errors (from authRoutes.js)
     *   2. Check email and username aren't already taken
     *   3. Hash the password with bcrypt
     *   4. Save the user to the database
     *   5. Return success — the client will redirect to /login
     */
    async signup(req, res) {
        // express-validator ran checks before this controller was called
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            // Map errors to a consistent {field, message} shape
            const formatted = errors.array().map(e => ({
                field: e.path,
                message: e.msg
            }));
            return res.status(400).json({ errors: formatted });
        }

        const { fullName, username, email, password } = req.body;

        try {
            // Check for duplicate email
            if (await userModel.findByEmail(email)) {
                return res.status(409).json({
                    errors: [{ field: 'email', message: 'An account with this email already exists.' }]
                });
            }

            // Check for duplicate username
            if (await userModel.findByUsername(username)) {
                return res.status(409).json({
                    errors: [{ field: 'username', message: 'This username is already taken.' }]
                });
            }

            // Hash the password.
            // bcrypt.hash(password, 12) — the "12" is the cost factor (work factor).
            // Higher = slower to crack, but also slower to hash. 12 is a good balance.
            // This is an async operation — we await it.
            const hashedPassword = await bcrypt.hash(password, 12);

            // Save the user (password is now a hash, never plain text)
            await userModel.create({ fullName, username, email, hashedPassword });

            return res.status(201).json({
                success: true,
                message: 'Account created successfully! Please log in.'
            });

        } catch (err) {
            // Unique constraints also protect against concurrent duplicate signups.
            if (err.code === '23505' || err.code === 'SQLITE_CONSTRAINT_UNIQUE' ||
                /UNIQUE constraint failed/i.test(err.message || '')) {
                const detail = `${err.constraint || ''} ${err.message || ''}`.toLowerCase();
                const field = detail.includes('email') ? 'email' :
                    detail.includes('username') ? 'username' : null;
                return res.status(409).json({
                    errors: [{
                        ...(field && { field }),
                        message: field === 'email' ? 'An account with this email already exists.' :
                            field === 'username' ? 'This username is already taken.' :
                            'An account with these details already exists.'
                    }]
                });
            }
            console.error('Signup error:', err);
            return res.status(500).json({
                errors: [{ message: 'Something went wrong. Please try again.' }]
            });
        }
    },

    /**
     * POST /api/auth/login
     *
     * Authenticates a user:
     *   1. Validate input fields
     *   2. Find user by email
     *   3. Compare submitted password against the stored hash
     *   4. If correct → regenerate session ID → save userId → return success
     *   5. If wrong → return a generic error (don't reveal which field was wrong)
     */
    async login(req, res) {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            const formatted = errors.array().map(e => ({
                field: e.path,
                message: e.msg
            }));
            return res.status(400).json({ errors: formatted });
        }

        const { email, password } = req.body;

        try {
            // Look up the user by email
            const user = await userModel.findByEmail(email);

            // SECURITY NOTE — Constant-time comparison:
            // Even if the user doesn't exist, we still run bcrypt.compare().
            // This prevents "timing attacks" where an attacker could detect
            // whether an email is registered based on how fast the server responds.
            const dummyHash = '$2a$12$aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa';
            const passwordMatch = await bcrypt.compare(
                password,
                user ? user.password : dummyHash
            );

            if (!user || !passwordMatch) {
                return res.status(401).json({
                    errors: [{ message: 'Incorrect email or password. Please try again.' }]
                });
            }

            // Regenerate the session ID after login.
            // This prevents "session fixation" attacks — a security best practice.
            req.session.regenerate((err) => {
                if (err) {
                    console.error('Session regenerate error:', err);
                    return res.status(500).json({
                        errors: [{ message: 'Login failed. Please try again.' }]
                    });
                }

                // Store the user's ID in their session cookie
                req.session.userId = user.id;

                // Save session before responding
                req.session.save((saveErr) => {
                    if (saveErr) {
                        console.error('Session save error:', saveErr);
                        return res.status(500).json({
                            errors: [{ message: 'Login failed. Please try again.' }]
                        });
                    }

                    return res.status(200).json({
                        success: true,
                        message: 'Login successful.',
                        redirectTo: '/dashboard'
                    });
                });
            });

        } catch (err) {
            console.error('Login error:', err);
            return res.status(500).json({
                errors: [{ message: 'Something went wrong. Please try again.' }]
            });
        }
    },

    /**
     * POST /api/auth/logout
     *
     * Ends the user's session:
     *   1. Destroy the session in the database
     *   2. Clear the session cookie from the browser
     *   3. Return success — the client will redirect to /login
     */
    logout(req, res) {
        req.session.destroy((err) => {
            if (err) {
                console.error('Logout error:', err);
                return res.status(500).json({
                    errors: [{ message: 'Logout failed. Please try again.' }]
                });
            }
            // Tell the browser to delete its session cookie
            res.clearCookie('brightdesk.sid');
            return res.status(200).json({ success: true });
        });
    },

    /**
     * GET /api/auth/me
     *
     * Returns the currently logged-in user's data.
     * Called by the Dashboard page on load to display user info.
     * Protected by requireAuthApi — only works if the session is valid.
     */
    async getMe(req, res) {
        if (!req.session || !req.session.userId) {
            return res.status(401).json({ error: 'Not authenticated. Please log in.' });
        }

        try {
            const user = await userModel.findById(Number(req.session.userId));
            if (!user) {
                // Session references an account that no longer exists.
                req.session.destroy(() => {});
                res.clearCookie('brightdesk.sid');
                return res.status(401).json({ error: 'Session invalid. Please log in again.' });
            }

            return res.status(200).json({
                user: {
                    id: user.id,
                    fullName: user.full_name,
                    username: user.username,
                    email: user.email,
                    createdAt: user.created_at,
                    status: 'Active'
                }
            });
        } catch (err) {
            console.error('Dashboard account lookup failed:', err.message);
            return res.status(503).json({ error: 'Unable to load your account. Please try again.' });
        }
    }
};

module.exports = authController;
