/**
 * authMiddleware.js — Route Protection
 *
 * These middleware functions check whether a user is logged in
 * before allowing them to access a protected route.
 *
 * How it works:
 *   - When a user logs in, their user ID is saved in req.session.userId
 *   - On every protected request, we check if that value exists
 *   - If it does → they're authenticated → continue (next())
 *   - If not → they're not logged in → block access
 *
 * Two versions:
 *   - requireAuth    : for page routes — redirects to /login
 *   - requireAuthApi : for API routes — returns a JSON error
 */

/**
 * Protects HTML page routes.
 * If the user is not logged in, redirects them to the Login page.
 */
function requireAuth(req, res, next) {
    // Prevent browser caching of protected pages
    res.set('Cache-Control', 'no-store, no-cache, must-revalidate, private');

    if (req.session && req.session.userId) {
        return next(); // User is logged in — allow access
    }
    // Not logged in — send them to the login page
    res.redirect('/login');
}

/**
 * Protects API routes (called by frontend JavaScript fetch()).
 * Returns a JSON error instead of an HTML redirect.
 */
function requireAuthApi(req, res, next) {
    if (req.session && req.session.userId) {
        return next();
    }
    res.status(401).json({ error: 'Not authenticated. Please log in.' });
}

module.exports = { requireAuth, requireAuthApi };
