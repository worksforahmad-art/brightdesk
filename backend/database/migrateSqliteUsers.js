/**
 * Optional, one-way account import from a COPY of your existing SQLite DB.
 * Sessions are intentionally not migrated: everyone logs in again.
 *
 * Preview (no DB writes):
 *   $env:SQLITE_SOURCE_PATH='C:\\path\\to\\backup.db'
 *   node backend/database/migrateSqliteUsers.js
 *
 * Import (requires DATABASE_URL, after the SQL schema migration):
 *   node backend/database/migrateSqliteUsers.js --apply
 *
 * The source database is opened read-only. Existing PostgreSQL accounts are
 * never overwritten; conflicts are skipped and reported by count.
 */
require('dotenv').config();
const fs = require('node:fs');
const path = require('node:path');
const { DatabaseSync } = require('node:sqlite');

const sourcePath = process.env.SQLITE_SOURCE_PATH;
const apply = process.argv.includes('--apply');
if (!sourcePath || !fs.existsSync(sourcePath)) {
    console.error('Set SQLITE_SOURCE_PATH to a readable BACKUP copy of the old SQLite database.');
    process.exit(1);
}

const db = new DatabaseSync(path.resolve(sourcePath), { readOnly: true });
const users = db.prepare(`
    SELECT full_name, username, email, password, created_at FROM users
`).all();
db.close();

console.log(`Found ${users.length} users in the read-only SQLite backup.`);
if (!apply) {
    console.log('Dry run only: no changes made. Add --apply to import into PostgreSQL.');
    process.exit(0);
}
if (!process.env.DATABASE_URL) {
    console.error('DATABASE_URL is required to import into PostgreSQL.');
    process.exit(1);
}

const pool = require('./db');
async function main() {
    let imported = 0;
    let conflicts = 0;
    for (const user of users) {
        // SQLite datetime strings have no timezone; datetime('now') is UTC.
        const createdAt = /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(user.created_at)
            ? user.created_at.replace(' ', 'T') + 'Z'
            : user.created_at;
        const result = await pool.query(`
            INSERT INTO public.users (full_name, username, email, password, created_at)
            VALUES ($1, $2, $3, $4, $5)
            ON CONFLICT DO NOTHING
            RETURNING id
        `, [user.full_name, user.username, user.email, user.password, createdAt]);
        if (result.rowCount === 1) imported++;
        else conflicts++;
    }
    console.log(`Imported ${imported} accounts. Skipped ${conflicts} duplicate email/username conflicts.`);
    console.log('Existing sessions were not copied. Imported users can log in with their existing passwords.');
}

main().catch(err => {
    console.error('Import failed:', err.message);
    process.exitCode = 1;
}).finally(() => pool.end());
