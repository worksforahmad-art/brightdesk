/**
 * userModel.js — User Database Operations
 *
 * This file contains all the functions that read from and write to
 * the "users" table in SQLite.
 *
 * Keeping database logic here (separate from the controller) means:
 *   - Each function has one job
 *   - Business logic stays in the controller
 *   - If you switch databases later, you only change this file
 *
 * All queries use parameterised placeholders (?) which prevents
 * SQL injection attacks — user input is NEVER inserted directly into SQL strings.
 */

const db = require('../database/db');

const userModel = {
    /**
     * Save a new user to the database.
     *
     * @param {object} param0
     * @param {string} param0.fullName       - e.g. "Jane Doe"
     * @param {string} param0.username       - e.g. "janedoe"
     * @param {string} param0.email          - e.g. "jane@example.com"
     * @param {string} param0.hashedPassword - the bcrypt hash (never plain text)
     * @returns {object} The newly created user record (without password)
     */
    create({ fullName, username, email, hashedPassword }) {
        const result = db
            .prepare(`
                INSERT INTO users (full_name, username, email, password)
                VALUES (?, ?, ?, ?)
            `)
            .run(fullName, username, email, hashedPassword);

        // Return the new user's safe fields (no password)
        return this.findById(Number(result.lastInsertRowid));
    },

    /**
     * Find a user by email address.
     * Used during login to look up the account.
     *
     * @param {string} email
     * @returns {object|undefined} Full user row (including hashed password) or undefined
     */
    findByEmail(email) {
        return db
            .prepare('SELECT * FROM users WHERE email = ?')
            .get(email);
    },

    /**
     * Find a user by username.
     * Used during signup to check if a username is already taken.
     *
     * @param {string} username
     * @returns {object|undefined}
     */
    findByUsername(username) {
        return db
            .prepare('SELECT * FROM users WHERE username = ?')
            .get(username);
    },

    /**
     * Find a user by their ID, returning only safe fields (no password).
     * Used to load user data for the Dashboard.
     *
     * @param {number} id
     * @returns {object|undefined}
     */
    findById(id) {
        return db
            .prepare(`
                SELECT id, full_name, username, email, created_at
                FROM users
                WHERE id = ?
            `)
            .get(id);
    }
};

module.exports = userModel;
