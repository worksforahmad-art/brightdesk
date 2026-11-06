/**
 * authRoutes.js — Authentication API Routes
 *
 * Defines the URL endpoints for all auth actions and
 * attaches validation rules to each one.
 *
 * express-validator runs the validation checks BEFORE the controller.
 * If validation fails, the controller reads the errors with validationResult().
 *
 * Routes defined here:
 *   POST /api/auth/signup
 *   POST /api/auth/login
 *   POST /api/auth/logout
 *   GET  /api/auth/me
 */

const express = require('express');
const { body } = require('express-validator');
const authController = require('../controllers/authController');
const { requireAuthApi } = require('../middleware/authMiddleware');

const router = express.Router();

// ── Signup Validation Rules ────────────────────────────────────────────────────
const signupValidation = [
    body('fullName')
        .trim()
        .notEmpty().withMessage('Full name is required.')
        .isLength({ min: 2, max: 60 }).withMessage('Full name must be between 2 and 60 characters.'),

    body('username')
        .trim()
        .notEmpty().withMessage('Username is required.')
        .isLength({ min: 3, max: 30 }).withMessage('Username must be between 3 and 30 characters.')
        .matches(/^[a-zA-Z0-9_]+$/).withMessage('Username can only contain letters, numbers, and underscores.'),

    body('email')
        .trim()
        .notEmpty().withMessage('Email address is required.')
        .isEmail().withMessage('Please enter a valid email address.')
        .normalizeEmail(),

    body('password')
        .notEmpty().withMessage('Password is required.')
        .isLength({ min: 8 }).withMessage('Password must be at least 8 characters.')
        .matches(/[A-Z]/).withMessage('Password must include at least one uppercase letter.')
        .matches(/[0-9]/).withMessage('Password must include at least one number.'),

    body('confirmPassword')
        .notEmpty().withMessage('Please confirm your password.')
        .custom((value, { req }) => {
            if (value !== req.body.password) {
                throw new Error('Passwords do not match.');
            }
            return true;
        })
];

// ── Login Validation Rules ─────────────────────────────────────────────────────
const loginValidation = [
    body('email')
        .trim()
        .notEmpty().withMessage('Email address is required.')
        .isEmail().withMessage('Please enter a valid email address.')
        .normalizeEmail(),

    body('password')
        .notEmpty().withMessage('Password is required.')
];

// ── Route Definitions ──────────────────────────────────────────────────────────
// signupValidation runs first, then authController.signup handles the request
router.post('/signup', signupValidation, authController.signup);

// loginValidation runs first, then authController.login handles the request
router.post('/login', loginValidation, authController.login);

// No validation needed — just destroy whatever session exists
router.post('/logout', authController.logout);

// requireAuthApi blocks this route if not logged in
router.get('/me', requireAuthApi, authController.getMe);

module.exports = router;
