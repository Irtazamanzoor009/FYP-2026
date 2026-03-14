const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const auth = require('../middleware/auth');

// router.use(auth);

// POST /api/auth/login
router.post('/login', authController.login);

// POST /api/auth/verify-otp
router.post('/verify-otp', authController.verifyOTP);

// POST /api/auth/resend-otp
router.post('/resend-otp', authController.resendOTP);

// GET /api/auth/check
router.get('/check', authController.checkAuth);

// POST /api/auth/logout
router.post('/logout', authController.logout);

// POST /api/auth/signup
router.post('/signup', authController.signup);

// POST /api/auth/google
router.post('/google', authController.googleSignup);

// POST /api/auth/set-password
router.post('/set-password', auth, authController.setPassword);

// POST /api/auth/reset-password
router.post('/reset-password', auth, authController.resetPassword);

// POST /api/auth/forgot-password
router.post('/forgot-password', authController.forgotPassword);

// POST /api/auth/forgot-password/:token
router.post('/forgot-password/:token', authController.nonAuthResetPassword);

router.post('/jira-credentials', auth, authController.saveJiraCredentials);

module.exports = router;
