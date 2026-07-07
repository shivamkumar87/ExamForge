const bcrypt = require('bcrypt');
const prisma = require('../utils/prismaClient');
const { generateToken } = require('../utils/jwt');
const { generateOtp, verifyOtp } = require('../services/otpService');
const { sendOtpEmail } = require('../services/emailService');

// Register
const register = async (req, res) => {
  try {
    const { name, email, password } = req.body;
    const role = email.endsWith('nitk.edu.in') ? 'admin' : 'student';

    const existing = await prisma.user.findUnique({ where: { email } });

    if (existing) {
      // ✅ If user exists via Google, allow them to add a password
      if (existing.authProvider === 'google') {
        const passwordHash = await bcrypt.hash(password, 10);
        await prisma.user.update({
          where: { email },
          data: {
            passwordHash,
            authProvider: 'both', // can now login via both
          }
        });
        const otp = await generateOtp(existing.id);
        
        // 🛑 AWAIT: Confirms email is sent before giving success to frontend
        await sendOtpEmail(email, otp);
        
        return res.status(200).json({ message: 'OTP sent to email', userId: existing.id, role: existing.role });
      } else {
        return res.status(400).json({ message: 'Email already registered. Please login.' });
      }
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({
      data: { name, email, passwordHash, role, authProvider: 'email' }
    });

    const otp = await generateOtp(user.id);
    
    // 🛑 AWAIT: Confirms email is sent before giving success to frontend
    await sendOtpEmail(email, otp);

    res.status(200).json({ message: 'OTP sent to email', userId: user.id, role });
  } catch (err) {
    console.error("🚨 Register Error:", err.message);
    res.status(500).json({ message: err.message || 'Failed to send registration OTP.' });
  }
};

// Login
const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) return res.status(404).json({ message: 'User not found' });

    // ✅ Allow login if authProvider is 'email' or 'both'
    if (user.authProvider === 'google') {
      return res.status(400).json({ message: 'This account uses Google login. Please use Google to sign in.' });
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) return res.status(401).json({ message: 'Invalid password' });

    const otp = await generateOtp(user.id);
    
    // 🛑 AWAIT: If Resend fails, it jumps down to the catch block instantly
    await sendOtpEmail(email, otp);

    res.status(200).json({ message: 'OTP sent to email', userId: user.id, role: user.role });
  } catch (err) {
    console.error("🚨 Login Error:", err.message);
    res.status(500).json({ message: err.message || 'Failed to send login OTP.' });
  }
};

// Verify OTP
const verifyOtpController = async (req, res) => {
  try {
    const { userId, otp } = req.body;

    // 1. Safety Net: Ensure both fields actually exist before hitting the database
    if (!userId || !otp) {
      return res.status(400).json({ message: 'User ID and OTP are strictly required.' });
    }

    console.log(`Attempting OTP verification for user: ${userId}`);

    // 2. Fetch user
    const user = await prisma.user.findUnique({ 
      where: { id: userId } 
    });
    
    if (!user) {
      console.log(`OTP Failed: User ${userId} not found in database.`);
      return res.status(404).json({ message: 'User not found.' });
    }

    // 3. Verify the OTP
    const result = await verifyOtp(userId, otp);
    if (!result.success) {
      console.log(`OTP Failed: Invalid OTP for user ${userId}.`);
      return res.status(400).json({ message: result.message || 'Invalid or expired OTP.' });
    }

    // 4. Generate Token & Send Success Response
    const token = generateToken(user.id, user.role, user.email);
    
    console.log(`OTP Success: User ${user.email} verified and logged in.`);
    
    res.status(200).json({ 
      message: 'OTP verified successfully.',
      token, 
      role: user.role, 
      name: user.name, 
      email: user.email 
    });

  } catch (err) {
    // 5. Explicit logging for your Render dashboard
    console.error("🚨 CRASH IN VERIFY OTP CONTROLLER:", err);
    res.status(500).json({ message: 'Internal server error during verification.' });
  }
};

// Resend OTP
const resendOtp = async (req, res) => {
  try {
    const { userId } = req.body;
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) return res.status(404).json({ message: 'User not found' });

    const otp = await generateOtp(user.id);
    
    // 🛑 AWAIT: Confirms resent email is accepted before telling the frontend
    await sendOtpEmail(user.email, otp);

    res.status(200).json({ message: 'OTP resent' });
  } catch (err) {
    console.error("🚨 Resend OTP Error:", err.message);
    res.status(500).json({ message: err.message || 'Failed to resend OTP.' });
  }
};

const googleCallback = (req, res) => {
  try {
    const user = req.user;
    const token = generateToken(user.id, user.role, user.email);
    // Redirect to frontend with token and role in URL
    res.redirect(`${process.env.FRONTEND_URL}/auth/google/success?token=${token}&role=${user.role}&name=${encodeURIComponent(user.name)}&email=${encodeURIComponent(user.email)}`);
  } catch (err) {
    res.redirect(`${process.env.FRONTEND_URL}/?error=google_failed`);
  }
};

module.exports = { register, login, verifyOtpController, resendOtp, googleCallback };