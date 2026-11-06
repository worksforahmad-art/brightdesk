/**
 * login.js — Login Page Logic
 *
 * Handles everything on the login page:
 *   1. Display a success message if the user just registered
 *   2. Client-side validation of the email and password fields
 *   3. Submit credentials to POST /api/auth/login
 *   4. On success → redirect to /dashboard
 *   5. On error → show the error message, stay on the page
 */

'use strict';

document.addEventListener('DOMContentLoaded', () => {

    const form      = document.getElementById('login-form');
    const submitBtn = document.getElementById('login-btn');

    // Wire up show/hide password toggle (defined in main.js)
    initPasswordToggles();

    // ── Show signup success message if redirected from signup ───────────────
    // signup.js stores a message in sessionStorage before redirecting here
    const signupMessage = sessionStorage.getItem('signup_success');
    if (signupMessage) {
        showAlert('alert', signupMessage, 'success');
        // Remove it so it doesn't appear again on page refresh
        sessionStorage.removeItem('signup_success');
    }

    // ── Form Submit Handler ─────────────────────────────────────────────────
    form.addEventListener('submit', async (event) => {
        event.preventDefault();

        clearAllFieldErrors();
        hideAlert('alert');

        const email    = form.email.value.trim();
        const password = form.password.value;

        // ── Client-side Validation ──────────────────────────────────────────
        let hasError = false;

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
        }

        if (hasError) return;

        // ── Send to Server ──────────────────────────────────────────────────
        setButtonLoading(submitBtn, true);

        try {
            const response = await fetch('/api/auth/login', {
                method:  'POST',
                headers: { 'Content-Type': 'application/json' },
                body:    JSON.stringify({ email, password })
            });

            const data = await response.json();

            if (response.ok) {
                // ── Login successful ─────────────────────────────────────────
                // The server set a session cookie in the browser automatically.
                // Now redirect to the dashboard.
                window.location.href = data.redirectTo || '/dashboard';

            } else {
                // ── Login failed ─────────────────────────────────────────────
                // Show the error message. Do NOT clear the email field —
                // the user should be able to correct their password only.
                if (data.errors && data.errors.length > 0) {
                    // Show field-level errors if present
                    data.errors.forEach(err => {
                        if (err.field) setFieldError(err.field, err.message);
                    });
                    showAlert('alert', data.errors[0].message, 'error');
                } else {
                    showAlert('alert', 'Incorrect email or password. Please try again.', 'error');
                }
            }

        } catch (networkError) {
            console.error('Network error:', networkError);
            showAlert('alert', 'Could not connect to the server. Is it running?', 'error');

        } finally {
            setButtonLoading(submitBtn, false);
        }
    });
});
