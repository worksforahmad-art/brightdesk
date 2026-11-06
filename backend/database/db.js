/**
 * db.js — Database Connection
 *
 * Opens (or creates) the SQLite database file and sets up all tables.
 * Uses Node.js's built-in node:sqlite (DatabaseSync) which is natively supported
 * in Node.js 22+ without requiring native C++ compilers (like node-gyp or Visual Studio).
 *
 * Tables created here:
 *   - users    : stores registered accounts
 *   - sessions : stores login sessions (used by our custom session store)
 */

const { DatabaseSync } = require('node:sqlite');
const path = require('path');

const DB_PATH = path.join(__dirname, 'brightdesk.db');

// Open the database (creates the file if it doesn't exist yet)
const db = new DatabaseSync(DB_PATH);

// WAL mode makes reads and writes faster and concurrent
db.exec('PRAGMA journal_mode = WAL;');

// Create tables if they don't exist yet
// Using IF NOT EXISTS means this is safe to run every time the server starts
db.exec(`
    CREATE TABLE IF NOT EXISTS users (
        id          INTEGER PRIMARY KEY AUTOINCREMENT,
        full_name   TEXT    NOT NULL,
        username    TEXT    NOT NULL UNIQUE,
        email       TEXT    NOT NULL UNIQUE,
        password    TEXT    NOT NULL,
        created_at  TEXT    NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS sessions (
        sid         TEXT    PRIMARY KEY,
        sess        TEXT    NOT NULL,
        expired_at  INTEGER NOT NULL
    );
`);

console.log('  📦 Database ready:', DB_PATH);

module.exports = db;
