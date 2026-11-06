/**
 * dashboard.js — Dashboard Page Logic
 *
 * This runs after dashboard.html is loaded.
 *
 * What it does:
 *   1. Calls GET /api/auth/me to verify the session and fetch user data
 *      - If the server returns 401 (not authenticated), redirect to /login
 *      - If successful, populate all the user data fields in the HTML
 *   2. Handles navigation between the Home and Profile sections
 *   3. Handles the mobile sidebar (hamburger menu)
 *   4. Handles the Logout button (calls POST /api/auth/logout)
 *
 * IMPORTANT:
 *   The server already checked authentication before serving this HTML page.
 *   This JS check is a secondary safeguard — it also fetches real user data
 *   and handles the case where a session expires while the page is open.
 */

'use strict';

document.addEventListener('DOMContentLoaded', async () => {

    // ── 1. Verify Session & Load User Data ──────────────────────────────────
    const loadingState = document.getElementById('loading-state');

    try {
        // Ask the server: "who is the currently logged-in user?"
        const response = await fetch('/api/auth/me', {
            method:  'GET',
            // 'same-origin' means only send cookies if the request is to the same server
            credentials: 'same-origin'
        });

        if (!response.ok) {
            // 401 = not authenticated — redirect to login
            window.location.href = '/login';
            return;
        }

        const data = await response.json();
        const user = data.user;

        // Hide the loading spinner and show the actual content
        if (loadingState) loadingState.hidden = true;
        showSection('home');

        // ── Populate Home Section ───────────────────────────────────────────
        // Get the user's first name for the welcome message
        const firstName = user.fullName.split(' ')[0];
        setText('welcome-name',  firstName);
        setText('home-username', '@' + user.username);
        setText('home-email',    user.email);
        setText('home-joined',   formatDate(user.createdAt));

        // ── Populate Profile Section ────────────────────────────────────────
        const initials = getInitials(user.fullName);
        setText('avatar-initials',       initials);
        setText('profile-fullname',      user.fullName);
        setText('profile-username-display', '@' + user.username);

        setText('profile-fullname-detail',  user.fullName);
        setText('profile-username-detail',  '@' + user.username);
        setText('profile-email-detail',     user.email);
        setText('profile-joined-detail',    formatDate(user.createdAt));

    } catch (err) {
        // Network error — could not reach the server
        console.error('Failed to load user data:', err);
        window.location.href = '/login';
    }

    // ── 2. Navigation ────────────────────────────────────────────────────────
    // When a nav button is clicked, switch to its corresponding section
    document.querySelectorAll('.nav-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const sectionName = btn.dataset.section;

            // Update active state on all nav buttons
            document.querySelectorAll('.nav-btn').forEach(b => {
                b.classList.remove('active');
                b.removeAttribute('aria-current');
            });
            btn.classList.add('active');
            btn.setAttribute('aria-current', 'page');

            // Show the selected section, hide others
            showSection(sectionName);

            // On mobile, close the sidebar after navigating
            closeSidebar();
        });
    });

    // ── 3. Mobile Sidebar ───────────────────────────────────────────────────
    const sidebar        = document.getElementById('sidebar');
    const overlay        = document.getElementById('sidebar-overlay');
    const menuToggle     = document.getElementById('menu-toggle');

    if (menuToggle) {
        menuToggle.addEventListener('click', () => {
            const isOpen = sidebar.classList.contains('is-open');
            if (isOpen) {
                closeSidebar();
            } else {
                openSidebar();
            }
        });
    }

    // Tap the overlay to close the sidebar
    if (overlay) {
        overlay.addEventListener('click', closeSidebar);
    }

    // ── 4. Logout ────────────────────────────────────────────────────────────
    // Both the sidebar logout button and the mobile logout button do the same thing
    const logoutBtns = [
        document.getElementById('logout-btn'),
        document.getElementById('mobile-logout-btn')
    ];

    logoutBtns.forEach(btn => {
        if (!btn) return;
        btn.addEventListener('click', handleLogout);
    });

    // ── Helper: Logout ───────────────────────────────────────────────────────
    async function handleLogout() {
        try {
            // Tell the server to destroy the session
            await fetch('/api/auth/logout', {
                method:      'POST',
                credentials: 'same-origin'
            });
        } catch (_) {
            // Even if the request fails, redirect to login
        } finally {
            // Always redirect — this clears the page from memory too
            window.location.href = '/login';
        }
    }

    // ── Helper: Show a content section ──────────────────────────────────────
    function showSection(name) {
        // Hide all sections
        document.querySelectorAll('.content-section').forEach(section => {
            section.hidden = true;
        });
        // Show the requested one
        const target = document.getElementById(`section-${name}`);
        if (target) {
            target.hidden = false;
            // Re-trigger the CSS animation by removing and re-adding the class
            target.classList.remove('content-section');
            void target.offsetWidth; // force browser reflow
            target.classList.add('content-section');
        }
    }

    // ── Helper: Open mobile sidebar ──────────────────────────────────────────
    function openSidebar() {
        sidebar.classList.add('is-open');
        overlay.classList.add('is-visible');
        menuToggle.setAttribute('aria-expanded', 'true');
        document.body.style.overflow = 'hidden'; // prevent background scroll
    }

    // ── Helper: Close mobile sidebar ─────────────────────────────────────────
    function closeSidebar() {
        if (!sidebar) return;
        sidebar.classList.remove('is-open');
        overlay.classList.remove('is-visible');
        if (menuToggle) menuToggle.setAttribute('aria-expanded', 'false');
        document.body.style.overflow = '';
    }

    // ── Helper: Set text content of an element safely ────────────────────────
    function setText(id, value) {
        const el = document.getElementById(id);
        if (el) el.textContent = value || '—';
    }

    // ── Helper: Get initials from a full name (e.g. "Jane Doe" → "JD") ──────
    function getInitials(fullName) {
        if (!fullName) return '?';
        return fullName
            .split(' ')
            .filter(Boolean)
            .slice(0, 2)
            .map(word => word[0].toUpperCase())
            .join('');
    }
});
