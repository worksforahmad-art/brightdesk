/**
 * express-session store backed by PostgreSQL when DATABASE_URL is configured,
 * or by local SQLite otherwise. Both preserve sessions across server restarts.
 * `touch` refreshes the stored expiry as users navigate the application.
 */
function createSessionStore(session) {
    class DatabaseSessionStore extends session.Store {
        constructor(db) {
            super();
            this.db = db;
            this.isPostgres = Boolean(process.env.DATABASE_URL);

            const timer = setInterval(() => this._removeExpired(), 15 * 60 * 1000);
            if (timer.unref) timer.unref();
        }

        _expiration(sessionData) {
            const date = sessionData.cookie && sessionData.cookie.expires;
            return date ? new Date(date).getTime() : Date.now() + 24 * 60 * 60 * 1000;
        }

        get(sid, callback) {
            if (this.isPostgres) {
                this.db.query(
                    'SELECT sess FROM public.sessions WHERE sid = $1 AND expired_at > $2',
                    [sid, Date.now()]
                ).then(({ rows }) => callback(null, rows[0] ? JSON.parse(rows[0].sess) : null))
                 .catch(err => callback(err));
                return;
            }

            try {
                const row = this.db.prepare('SELECT sess FROM sessions WHERE sid = ? AND expired_at > ?')
                    .get(sid, Date.now());
                callback(null, row ? JSON.parse(row.sess) : null);
            } catch (err) { callback(err); }
        }

        set(sid, sessionData, callback = () => {}) {
            const expiry = this._expiration(sessionData);
            const json = JSON.stringify(sessionData);

            if (this.isPostgres) {
                this.db.query(`
                    INSERT INTO public.sessions (sid, sess, expired_at)
                    VALUES ($1, $2, $3)
                    ON CONFLICT (sid) DO UPDATE
                    SET sess = EXCLUDED.sess, expired_at = EXCLUDED.expired_at
                `, [sid, json, expiry])
                    .then(() => callback(null)).catch(callback);
                return;
            }

            try {
                this.db.prepare('INSERT OR REPLACE INTO sessions (sid, sess, expired_at) VALUES (?, ?, ?)')
                    .run(sid, json, expiry);
                callback(null);
            } catch (err) { callback(err); }
        }

        touch(sid, sessionData, callback = () => {}) {
            const expiry = this._expiration(sessionData);
            if (this.isPostgres) {
                this.db.query('UPDATE public.sessions SET expired_at = $2 WHERE sid = $1', [sid, expiry])
                    .then(() => callback(null)).catch(callback);
                return;
            }
            try {
                this.db.prepare('UPDATE sessions SET expired_at = ? WHERE sid = ?').run(expiry, sid);
                callback(null);
            } catch (err) { callback(err); }
        }

        destroy(sid, callback = () => {}) {
            if (this.isPostgres) {
                this.db.query('DELETE FROM public.sessions WHERE sid = $1', [sid])
                    .then(() => callback(null)).catch(callback);
                return;
            }
            try {
                this.db.prepare('DELETE FROM sessions WHERE sid = ?').run(sid);
                callback(null);
            } catch (err) { callback(err); }
        }

        _removeExpired() {
            if (this.isPostgres) {
                this.db.query('DELETE FROM public.sessions WHERE expired_at <= $1', [Date.now()])
                    .catch(err => console.error('Session cleanup failed:', err.message));
                return;
            }
            try {
                this.db.prepare('DELETE FROM sessions WHERE expired_at <= ?').run(Date.now());
            } catch (err) {
                console.error('Session cleanup failed:', err.message);
            }
        }
    }
    return DatabaseSessionStore;
}

module.exports = createSessionStore;
