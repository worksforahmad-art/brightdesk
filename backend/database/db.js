/**
 * BrightDesk database selection.
 *
 * When DATABASE_URL is configured, queries use Supabase PostgreSQL via `pg`.
 * Otherwise, local development continues to use the existing SQLite database.
 * The PostgreSQL schema is managed by the versioned SQL migration, not by
 * starting the application (so deployment cannot silently change the schema).
 */
const path = require('node:path');
const fs = require('node:fs');

if (process.env.DATABASE_URL) {
    const { Pool } = require('pg');
    const connectionUrl = new URL(process.env.DATABASE_URL);
    if (!['postgres:', 'postgresql:'].includes(connectionUrl.protocol)) {
        throw new Error('DATABASE_URL must be a PostgreSQL connection string.');
    }

    // node-postgres lets sslmode in the URL override the `ssl` object. Remove
    // conflicting URL parameters so certificate verification cannot be bypassed.
    for (const key of ['sslmode', 'sslcert', 'sslkey', 'sslrootcert']) {
        connectionUrl.searchParams.delete(key);
    }

    const sslEnabled = process.env.DATABASE_SSL !== 'false';
    if (process.env.NODE_ENV === 'production' && !sslEnabled) {
        throw new Error('DATABASE_SSL cannot be false in production.');
    }

    const ssl = sslEnabled ? { rejectUnauthorized: true } : false;
    if (sslEnabled && process.env.DATABASE_CA_CERT) {
        // Accept a PEM certificate copied into a Railway variable, with either
        // literal newlines or escaped \n sequences.
        ssl.ca = process.env.DATABASE_CA_CERT.replace(/\\n/g, '\n');
    }

    const pool = new Pool({
        connectionString: connectionUrl.toString(),
        ssl,
        max: 5,
        connectionTimeoutMillis: 10000,
        idleTimeoutMillis: 30000
    });

    pool.on('error', err => {
        console.error('Unexpected PostgreSQL pool error:', err.message);
    });

    module.exports = pool;
} else {
    const { DatabaseSync } = require('node:sqlite');
    const databasePath = process.env.DATABASE_PATH
        ? path.resolve(process.env.DATABASE_PATH)
        : path.join(__dirname, 'brightdesk.db');

    fs.mkdirSync(path.dirname(databasePath), { recursive: true });
    const db = new DatabaseSync(databasePath);
    db.exec('PRAGMA journal_mode = WAL;');
    db.exec(`
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            full_name TEXT NOT NULL,
            username TEXT NOT NULL UNIQUE,
            email TEXT NOT NULL UNIQUE,
            password TEXT NOT NULL,
            created_at TEXT NOT NULL DEFAULT (datetime('now'))
        );
        CREATE TABLE IF NOT EXISTS sessions (
            sid TEXT PRIMARY KEY,
            sess TEXT NOT NULL,
            expired_at INTEGER NOT NULL
        );
    `);
    console.log('  Database ready (SQLite):', databasePath);
    module.exports = db;
}
