/**
 * signup.js — Sign Up Page Logic
 *
 * Handles everything on the signup page:
 *   1. Client-side validation (runs before sending to the server)
 *   2. Submitting the form to POST /api/auth/signup
 *   3. Showing success or error messages
 *   4. Redirecting to the login page after a successful signup
 *
 * Client-side validation gives instant feedback to the user.
 * Server-side validation (in authRoutes.js) is the real security check —
 * never rely on frontend-only validation for security.
 */

'use strict';

document.addEventListener('DOMContentLoaded', () => {

    const form      = document.getElementById('signup-form');
    const submitBtn = document.getElementById('signup-btn');

    // Wire up show/hide password toggle buttons (defined in main.js)
    initPasswordToggles();

    // ── Form Submit Handler ─────────────────────────────────────────────────
    form.addEventListener('submit', async (event) => {
        // Prevent the browser's default form submission (which would reload the page)
        event.preventDefault();

        // Clear any previous errors before re-validating
        clearAllFieldErrors();
        hideAlert('alert');

        // Read form values
        const fullName        = form.fullName.value.trim();
        const username        = form.username.value.trim();
        const email           = form.email.value.trim();
        const password        = form.password.value;
        const confirmPassword = form.confirmPassword.value;

        // ── Client-side Validation ──────────────────────────────────────────
        let hasError = false;

        if (!fullName) {
            setFieldError('fullName', 'Full name is required.');
            hasError = true;
        } else if (fullName.length < 2) {
            setFieldError('fullName', 'Full name must be at least 2 characters.');
            hasError = true;
        } else if (fullName.length > 60) {
            setFieldError('fullName', 'Full name must be under 60 characters.');
            hasError = true;
        } else if (!/\p{L}/u.test(fullName)) {
            setFieldError('fullName', 'Full name must contain letters.');
            hasError = true;
        } else if (!/^[\p{L}\s'\-.]+$/u.test(fullName)) {
            setFieldError('fullName', 'Full name can only contain letters, spaces, hyphens, and apostrophes.');
            hasError = true;
        }

        if (!username) {
            setFieldError('username', 'Username is required.');
            hasError = true;
        } else if (username.length < 3) {
            setFieldError('username', 'Username must be at least 3 characters.');
            hasError = true;
        } else if (!/^[a-zA-Z0-9_]+$/.test(username)) {
            setFieldError('username', 'Username can only contain letters, numbers, and underscores.');
            hasError = true;
        }

        if (!email) {
            setFieldError('email', 'Email address is required.');
            hasError = true;
        } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            setFieldError('email', 'Please enter a valid email address.');
            hasError = true;
        }

        if (!password) {
            setFieldError('password', 'Password is required.');
            hasError = true;
        } else if (password.length < 8) {
            setFieldError('password', 'Password must be at least 8 characters.');
            hasError = true;
        } else if (!/[A-Z]/.test(password)) {
            setFieldError('password', 'Password must include at least one uppercase letter.');
            hasError = true;
        } else if (!/[0-9]/.test(password)) {
            setFieldError('password', 'Password must include at least one number.');
            hasError = true;
        }

        if (!confirmPassword) {
            setFieldError('confirmPassword', 'Please confirm your password.');
            hasError = true;
        } else if (confirmPassword !== password) {
            setFieldError('confirmPassword', 'Passwords do not match.');
            hasError = true;
        }

        // If any client-side validation failed, stop here
        if (hasError) return;

        // ── Send to Server ──────────────────────────────────────────────────
        setButtonLoading(submitBtn, true);

        try {
            // fetch() sends an HTTP request to our Express API
            const response = await fetch('/api/auth/signup', {
                method:  'POST',
                headers: { 'Content-Type': 'application/json' },
                // JSON.stringify converts the JS object into a JSON string for the request body
                body: JSON.stringify({ fullName, username, email, password, confirmPassword })
            });

            // response.json() parses the JSON string the server sent back
            const data = await response.json();

            if (response.ok) {
                // ── Success ─────────────────────────────────────────────────
                // Store the success message so the login page can display it
                sessionStorage.setItem('signup_success', data.message);
                // Redirect to the login page
                window.location.href = '/login';

            } else {
                // ── Server-returned Errors ───────────────────────────────────
                // The server sent back an array of { field, message } objects
                if (data.errors && data.errors.length > 0) {
                    // If the error is for a specific field, show it inline
                    const fieldError = data.errors.find(e => e.field);
                    if (fieldError) {
                        setFieldError(fieldError.field, fieldError.message);
                    }
                    // Always show the first message in the alert box too
                    showAlert('alert', data.errors[0].message, 'error');
                } else {
                    showAlert('alert', 'Something went wrong. Please try again.', 'error');
                }
            }

        } catch (networkError) {
            // This runs if the server is unreachable (e.g. server not started)
            console.error('Network error:', networkError);
            showAlert('alert', 'Could not connect to the server. Is it running?', 'error');

        } finally {
            // Always re-enable the button, whether the request succeeded or failed
            setButtonLoading(submitBtn, false);
        }
    });
});
