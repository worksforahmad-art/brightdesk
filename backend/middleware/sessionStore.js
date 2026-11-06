/**
 * sessionStore.js — Custom SQLite Session Store
 *
 * express-session needs somewhere to save session data between requests.
 * By default it uses memory (RAM), which gets wiped every server restart.
 *
 * This store saves sessions in the SQLite database instead, so logins
 * survive server restarts.
 *
 * How it works:
 *   - When you log in, express-session calls store.set() to save your session.
 *   - On the next request, it calls store.get() to load your session.
 *   - On logout, it calls store.destroy() to delete your session.
 */

function createSessionStore(session) {
    class SQLiteStore extends session.Store {
        /**
         * @param {import('better-sqlite3').Database} db - the shared database connection
         */
        constructor(db) {
            super();
            this.db = db;

            // Every 15 minutes, delete any sessions that have expired
            const cleanupTimer = setInterval(() => this._removeExpired(), 15 * 60 * 1000);
            // .unref() lets Node.js exit even if this timer is still ticking
            if (cleanupTimer.unref) cleanupTimer.unref();
        }

        /** Load a session by its ID */
        get(sid, callback) {
            try {
                const row = this.db
                    .prepare('SELECT sess FROM sessions WHERE sid = ? AND expired_at > ?')
                    .get(sid, Date.now());
                // JSON.parse converts the stored string back into a JavaScript object
                callback(null, row ? JSON.parse(row.sess) : null);
            } catch (err) {
                callback(err);
            }
        }

        /** Save or update a session */
        set(sid, sessionData, callback) {
            // Calculate when this session should expire
            const expires = sessionData.cookie && sessionData.cookie.expires
                ? new Date(sessionData.cookie.expires).getTime()
                : Date.now() + 24 * 60 * 60 * 1000; // default: 24 hours

            try {
                this.db
                    .prepare('INSERT OR REPLACE INTO sessions (sid, sess, expired_at) VALUES (?, ?, ?)')
                    // JSON.stringify converts the session object to a string for storage
                    .run(sid, JSON.stringify(sessionData), expires);
                callback(null);
            } catch (err) {
                callback(err);
            }
        }

        /** Delete a session (called on logout) */
        destroy(sid, callback) {
            try {
                this.db.prepare('DELETE FROM sessions WHERE sid = ?').run(sid);
                callback(null);
            } catch (err) {
                callback(err);
            }
        }

        /** Remove expired sessions from the database */
        _removeExpired() {
            try {
                this.db.prepare('DELETE FROM sessions WHERE expired_at <= ?').run(Date.now());
            } catch (_) {
                // Silently ignore cleanup errors — they're not critical
            }
        }
    }

    return SQLiteStore;
}

module.exports = createSessionStore;
