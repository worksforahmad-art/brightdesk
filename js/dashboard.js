/**
 * dashboard.js — Dashboard Page Logic
 *
 * Handles:
 *   1. Fetching authenticated user data from GET /api/auth/me
 *   2. Resilient loading: 10s timeout, error state card, retry without full page reload
 *   3. Populating Home and Profile sections with real account details
 *   4. Tab navigation between Home and Profile
 *   5. Mobile sidebar drawer toggling with overlay and Escape key support
 *   6. Secure session termination via POST /api/auth/logout
 */

'use strict';

document.addEventListener('DOMContentLoaded', () => {

    const loadingState   = document.getElementById('loading-state');
    const errorState     = document.getElementById('dashboard-error-state');
    const errorMessageEl = document.getElementById('dashboard-error-message');
    const retryBtn       = document.getElementById('retry-dashboard-btn');
    const errorLogoutBtn = document.getElementById('error-logout-btn');

    let currentSection = 'home';
    let fetchController = null;

    // ── 1. Fetch & Display User Data ────────────────────────────────────────
    async function loadUserData() {
        showLoadingState();

        // Cancel any pending fetch before starting a new one
        if (fetchController) {
            fetchController.abort();
        }
        fetchController = new AbortController();

        // 10-second timeout prevents infinite spinning screens
        const timeoutId = setTimeout(() => {
            if (fetchController) fetchController.abort();
        }, 10000);

        try {
            const response = await fetch('/api/auth/me', {
                method:      'GET',
                credentials: 'same-origin',
                headers: {
                    'Accept':        'application/json',
                    'Cache-Control': 'no-cache'
                },
                signal: fetchController.signal
            });

            clearTimeout(timeoutId);

            // 401 Unauthorized -> session is dead, redirect to login
            if (response.status === 401) {
                window.location.href = '/login';
                return;
            }

            // Other HTTP error (e.g. 500, 503, 429) -> show retryable error, do NOT loop redirect
            if (!response.ok) {
                let message = 'Unable to load your account information (Server responded with status ' + response.status + ').';
                try {
                    const errData = await response.json();
                    if (errData && errData.error) message = errData.error;
                } catch (_) {}
                showErrorState(message);
                return;
            }

            const data = await response.json();
            if (!data || !data.user) {
                showErrorState('Invalid account data received from server. Please try again.');
                return;
            }

            // Populate all fields with the authenticated user's actual data
            renderUserData(data.user);

            // Hide loading/error and reveal the active section
            hideLoadingState();
            hideErrorState();
            showSection(currentSection);

        } catch (err) {
            clearTimeout(timeoutId);
            if (err.name === 'AbortError') {
                showErrorState('Request timed out while connecting to the server. Please check your connection.');
            } else {
                console.error('Failed to load user data:', err);
                showErrorState('Could not reach the server. Please check your internet connection and try again.');
            }
        }
    }

    // ── 2. Render User Data ─────────────────────────────────────────────────
    function renderUserData(user) {
        const rawName   = (user.fullName || '').trim();
        const firstName = rawName ? rawName.split(/\s+/)[0] : 'there';
        const username  = user.username || 'user';
        const email     = user.email || '—';
        const joinedDate = formatDate(user.createdAt);
        const status    = user.status || 'Active';

        // Home Section
        setText('welcome-name',  firstName);
        setText('home-username', '@' + username);
        setText('home-email',    email);
        setText('home-joined',   joinedDate);
        setText('home-status',   status);

        // Profile Section
        const initials = getInitials(rawName);
        setText('avatar-initials',           initials);
        setText('profile-fullname',          rawName || '—');
        setText('profile-username-display',  '@' + username);

        setText('profile-fullname-detail',   rawName || '—');
        setText('profile-username-detail',   '@' + username);
        setText('profile-email-detail',      email);
        setText('profile-joined-detail',     joinedDate);
        setText('profile-status',            status);
    }

    // ── 3. State Management UI Helpers ──────────────────────────────────────
    function showLoadingState() {
        if (loadingState) loadingState.hidden = false;
        if (errorState)   errorState.hidden   = true;
        hideAllSections();
    }

    function hideLoadingState() {
        if (loadingState) loadingState.hidden = true;
    }

    function showErrorState(message) {
        hideLoadingState();
        hideAllSections();
        if (errorMessageEl) {
            errorMessageEl.textContent = message || 'Something went wrong while retrieving your account.';
        }
        if (errorState) {
            errorState.hidden = false;
        }
    }

    function hideErrorState() {
        if (errorState) errorState.hidden = true;
    }

    function hideAllSections() {
        document.querySelectorAll('.content-section').forEach(section => {
            section.hidden = true;
        });
    }

    function showSection(name) {
        currentSection = name;
        hideAllSections();

        const target = document.getElementById(`section-${name}`);
        if (target) {
            target.hidden = false;
            // Re-trigger subtle CSS enter animation
            target.classList.remove('content-section');
            void target.offsetWidth;
            target.classList.add('content-section');
        }
    }

    // ── 4. Navigation Menu ──────────────────────────────────────────────────
    document.querySelectorAll('.nav-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const sectionName = btn.dataset.section;
            if (!sectionName) return;

            document.querySelectorAll('.nav-btn').forEach(b => {
                b.classList.remove('active');
                b.removeAttribute('aria-current');
            });
            btn.classList.add('active');
            btn.setAttribute('aria-current', 'page');

            showSection(sectionName);
            closeSidebar();
        });
    });

    // ── 5. Mobile Sidebar Drawer ────────────────────────────────────────────
    const sidebar    = document.getElementById('sidebar');
    const overlay    = document.getElementById('sidebar-overlay');
    const menuToggle = document.getElementById('menu-toggle');

    if (menuToggle) {
        menuToggle.addEventListener('click', () => {
            const isOpen = sidebar && sidebar.classList.contains('is-open');
            if (isOpen) {
                closeSidebar();
            } else {
                openSidebar();
            }
        });
    }

    if (overlay) {
        overlay.addEventListener('click', closeSidebar);
    }

    // Close mobile drawer when pressing Escape
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && sidebar && sidebar.classList.contains('is-open')) {
            closeSidebar();
        }
    });

    function openSidebar() {
        if (!sidebar) return;
        sidebar.classList.add('is-open');
        if (overlay) overlay.classList.add('is-visible');
        if (menuToggle) menuToggle.setAttribute('aria-expanded', 'true');
        document.body.style.overflow = 'hidden';
    }

    function closeSidebar() {
        if (!sidebar) return;
        sidebar.classList.remove('is-open');
        if (overlay) overlay.classList.remove('is-visible');
        if (menuToggle) menuToggle.setAttribute('aria-expanded', 'false');
        document.body.style.overflow = '';
    }

    // ── 6. Retry & Logout Handlers ──────────────────────────────────────────
    if (retryBtn) {
        retryBtn.addEventListener('click', () => {
            loadUserData();
        });
    }

    if (errorLogoutBtn) {
        errorLogoutBtn.addEventListener('click', handleLogout);
    }

    const logoutBtns = [
        document.getElementById('logout-btn'),
        document.getElementById('mobile-logout-btn')
    ];

    logoutBtns.forEach(btn => {
        if (!btn) return;
        btn.addEventListener('click', handleLogout);
    });

    async function handleLogout() {
        try {
            await fetch('/api/auth/logout', {
                method:      'POST',
                credentials: 'same-origin'
            });
        } catch (_) {
        } finally {
            window.location.href = '/login';
        }
    }

    // ── 7. Utility Helpers ──────────────────────────────────────────────────
    function setText(id, value) {
        const el = document.getElementById(id);
        if (el) el.textContent = value || '—';
    }

    function getInitials(fullName) {
        if (!fullName) return '?';
        const parts = fullName.trim().split(/\s+/).filter(Boolean);
        if (parts.length === 0) return '?';
        if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
        return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }

    // Initial load
    loadUserData();
});
