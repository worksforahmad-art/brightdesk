/**
 * main.js — Shared JavaScript Utilities
 *
 * This file is loaded on every page BEFORE the page-specific JS file.
 * It provides small helper functions that signup.js, login.js,
 * and dashboard.js all use, so we don't repeat the same code.
 *
 * Functions exported to the global window object (since we're not
 * using a module bundler — just plain <script> tags):
 *
 *   showAlert(elementId, message, type)  - display an alert box
 *   hideAlert(elementId)                 - hide an alert box
 *   setFieldError(fieldName, message)    - mark a field invalid
 *   clearFieldError(fieldName)           - clear field error state
 *   setButtonLoading(btn, isLoading)     - toggle button spinner
 *   formatDate(dateString)               - e.g. "7 November 2026"
 *   initPasswordToggles()                - wire up show/hide password buttons
 */

'use strict';

/* ── Alert Box ────────────────────────────────────────────────────────────── */

/**
 * Show the alert box with a message.
 *
 * @param {string} elementId - the id of the alert <div>
 * @param {string} message   - text to display
 * @param {'success'|'error'} type - controls the colour
 */
function showAlert(elementId, message, type) {
    const el = document.getElementById(elementId);
    if (!el) return;

    el.textContent = message;
    el.className   = `alert alert--${type}`;
    el.hidden      = false;

    // Scroll the alert into view if it's off-screen
    el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

/**
 * Hide the alert box.
 *
 * @param {string} elementId
 */
function hideAlert(elementId) {
    const el = document.getElementById(elementId);
    if (el) el.hidden = true;
}

/* ── Per-field Error Messages ─────────────────────────────────────────────── */

/**
 * Mark a form field as having an error and show a message below it.
 *
 * @param {string} fieldName - matches the input's name attribute
 * @param {string} message   - error text to show
 */
function setFieldError(fieldName, message) {
    const group = document.getElementById(`group-${fieldName}`);
    const error = document.getElementById(`error-${fieldName}`);

    if (group) group.classList.add('has-error');
    if (error) error.textContent = message;
}

/**
 * Clear a field's error state.
 *
 * @param {string} fieldName
 */
function clearFieldError(fieldName) {
    const group = document.getElementById(`group-${fieldName}`);
    const error = document.getElementById(`error-${fieldName}`);

    if (group) {
        group.classList.remove('has-error');
        group.classList.remove('is-valid');
    }
    if (error) error.textContent = '';
}

/**
 * Clear all field errors on the page.
 */
function clearAllFieldErrors() {
    document.querySelectorAll('.field-group').forEach(group => {
        group.classList.remove('has-error', 'is-valid');
    });
    document.querySelectorAll('.field-error').forEach(el => {
        el.textContent = '';
    });
}

/* ── Button Loading State ─────────────────────────────────────────────────── */

/**
 * Switch a submit button between its normal state and a loading spinner.
 *
 * @param {HTMLButtonElement} btn
 * @param {boolean} isLoading
 */
function setButtonLoading(btn, isLoading) {
    if (!btn) return;

    const textSpan    = btn.querySelector('.btn-text');
    const spinnerSpan = btn.querySelector('.btn-spinner');

    btn.disabled = isLoading;

    if (textSpan)    textSpan.hidden    = isLoading;
    if (spinnerSpan) spinnerSpan.hidden = !isLoading;
}

/* ── Date Formatter ───────────────────────────────────────────────────────── */

/**
 * Format a date string from the database (e.g. "2026-11-07 00:30:00")
 * into a human-readable string (e.g. "7 November 2026").
 *
 * @param {string} dateString
 * @returns {string}
 */
function formatDate(dateString) {
    if (!dateString) return '—';
    // SQLite stores dates as "YYYY-MM-DD HH:MM:SS" (no T separator)
    // Replacing the space with 'T' makes it a valid ISO string for new Date()
    const d = new Date(dateString.replace(' ', 'T') + 'Z');
    if (isNaN(d.getTime())) return dateString; // fall back to raw string if invalid
    return d.toLocaleDateString('en-GB', {
        day: 'numeric', month: 'long', year: 'numeric'
    });
}

/* ── Password Show/Hide Toggle ────────────────────────────────────────────── */

/**
 * Wire up all .toggle-password buttons on the current page.
 * Each button has a data-target attribute with the ID of the input to toggle.
 */
function initPasswordToggles() {
    document.querySelectorAll('.toggle-password').forEach(btn => {
        btn.addEventListener('click', () => {
            const targetId = btn.dataset.target;
            const input    = document.getElementById(targetId);
            if (!input) return;

            const isPassword = input.type === 'password';
            input.type = isPassword ? 'text' : 'password';

            // Swap the eye icons
            const showIcon = btn.querySelector('.icon-eye-show');
            const hideIcon = btn.querySelector('.icon-eye-hide');
            if (showIcon) showIcon.hidden = isPassword;
            if (hideIcon) hideIcon.hidden = !isPassword;

            // Update the accessible label
            btn.setAttribute('aria-label', isPassword ? 'Hide password' : 'Show password');
        });
    });
}
