/**
 * User persistence. Every function is async so the Express controller works
 * with both PostgreSQL (async) and local SQLite (synchronous underneath).
 * Password hashes are returned only when explicitly looking up an account
 * for authentication, never in a public dashboard response.
 */
const db = require('../database/db');
const isPostgres = Boolean(process.env.DATABASE_URL);

const userModel = {
    async create({ fullName, username, email, hashedPassword }) {
        if (isPostgres) {
            const { rows } = await db.query(`
                INSERT INTO public.users (full_name, username, email, password)
                VALUES ($1, $2, $3, $4)
                RETURNING id, full_name, username, email, created_at
            `, [fullName, username, email, hashedPassword]);
            return rows[0];
        }

        const result = db.prepare(`
            INSERT INTO users (full_name, username, email, password)
            VALUES (?, ?, ?, ?)
        `).run(fullName, username, email, hashedPassword);
        return this.findById(Number(result.lastInsertRowid));
    },

    async findByEmail(email) {
        if (isPostgres) {
            const { rows } = await db.query('SELECT * FROM public.users WHERE email = $1', [email]);
            return rows[0];
        }
        return db.prepare('SELECT * FROM users WHERE email = ?').get(email);
    },

    async findByUsername(username) {
        if (isPostgres) {
            const { rows } = await db.query('SELECT * FROM public.users WHERE username = $1', [username]);
            return rows[0];
        }
        return db.prepare('SELECT * FROM users WHERE username = ?').get(username);
    },

    async findById(id) {
        if (isPostgres) {
            const { rows } = await db.query(`
                SELECT id, full_name, username, email, created_at
                FROM public.users WHERE id = $1
            `, [id]);
            return rows[0];
        }
        return db.prepare(`
            SELECT id, full_name, username, email, created_at
            FROM users WHERE id = ?
        `).get(id);
    }
};

module.exports = userModel;
