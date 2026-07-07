const express = require('express');
const router = express.Router();
const passport = require('passport');
const { register, login, verifyOtpController, resendOtp, googleCallback } = require('../controllers/authController');
const protect = require('../middleware/authMiddleware');
const { otpLimiter, loginLimiter } = require('../middleware/rateLimiter');

router.post('/register', otpLimiter, register);
router.post('/login', loginLimiter, login);
router.post('/verify-otp', verifyOtpController);
router.post('/resend-otp', otpLimiter, resendOtp);
router.post('/logout', protect, (req, res) => {
  res.json({ message: 'Logged out successfully' });
});

router.get('/google', passport.authenticate('google', { scope: ['profile', 'email'], session: false }));
router.get('/google/callback',
  passport.authenticate('google', { session: false, failureRedirect: `${process.env.FRONTEND_URL}/?error=google_failed` }),
  googleCallback
);

module.exports = router;