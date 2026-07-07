const { Resend } = require('resend');

const resend = new Resend(process.env.RESEND_API_KEY);

const sendOtpEmail = async (email, otp) => {
  try {
    const response = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: {
        'accept': 'application/json',
        'api-key': process.env.BREVO_API_KEY,
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        sender: { 
          name: 'ExamForge', 
          email: process.env.SENDER_EMAIL // Must be your verified personal Gmail
        },
        to: [{ email: email }], // The user trying to log in
        subject: 'Your ExamForge OTP Code',
        htmlContent: `
          <div style="font-family: Arial, sans-serif; max-width: 400px; margin: auto; padding: 24px; border: 1px solid #eaeaea; border-radius: 8px; background-color: #ffffff;">
            <h2 style="color: #1F3864; text-align: center; margin-bottom: 24px;">ExamForge</h2>
            <p style="color: #333333; font-size: 16px;">Hello,</p>
            <p style="color: #333333; font-size: 16px;">Your One-Time Password (OTP) for login is:</p>
            
            <div style="text-align: center; margin: 24px 0;">
              <h1 style="letter-spacing: 8px; color: #2E75B6; background-color: #f4f7fa; padding: 12px 20px; border-radius: 6px; display: inline-block; margin: 0;">
                ${otp}
              </h1>
            </div>
            
            <p style="color: #666666; font-size: 14px;">This code is valid for <strong>10 minutes</strong>. Please do not share it with anyone.</p>
            <hr style="border: none; border-top: 1px solid #eaeaea; margin: 24px 0;" />
            <p style="color: #999999; font-size: 12px; text-align: center;">If you did not request this code, you can safely ignore this email.</p>
          </div>
        `
      })
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || 'Brevo API rejected the request');
    }

    console.log(`✅ OTP Email successfully sent via Brevo to: ${email}`);
  } catch (error) {
    console.error("🚨 CRASH in sendOtpEmail:", error.message);
    throw error; // Correctly throws error back to your authController await blocks
  }
};

module.exports = { sendOtpEmail };