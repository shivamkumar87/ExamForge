const bcrypt = require('bcrypt');
const prisma = require('../utils/prismaClient');

const generateOtp = async (userId) => {
  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  const otpHash = await bcrypt.hash(otp, 10);
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

  // Delete any existing OTPs for this user
  await prisma.otp.deleteMany({ where: { userId } });

  // Save new OTP
  await prisma.otp.create({
    data: { userId, otpHash, expiresAt, used: false }
  });

  return otp;
};

const verifyOtp = async (userId, submittedOtp) => {
  const otpRecord = await prisma.otp.findFirst({
  where: { userId, used: false },
  orderBy: { expiresAt: 'desc' } 
});

  if (!otpRecord) return { success: false, message: 'OTP not found' };
  if (new Date() > otpRecord.expiresAt) return { success: false, message: 'OTP expired' };

  const isMatch = await bcrypt.compare(submittedOtp, otpRecord.otpHash);
  if (!isMatch) return { success: false, message: 'Invalid OTP' };

  await prisma.otp.update({
    where: { id: otpRecord.id },
    data: { used: true }
  });

  return { success: true };
};

module.exports = { generateOtp, verifyOtp };