// Email utility for sending OTP codes
// Uses nodemailer to send verification emails
import nodemailer from 'nodemailer'
import twilio from 'twilio';

const twilioClient = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
);

// Create email transporter
// In production, configure with real SMTP credentials
const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.EMAIL_PORT || '587'),
  secure: false,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
})

// Helper to test SMTP connectivity; useful in logs and manual checks
export async function verifyTransporter(): Promise<{ ok: boolean; error?: any }> {
  try {
    console.log('Verifying SMTP transporter...');
    await transporter.verify()
    console.log('SMTP transporter verified successfully.');
    return { ok: true }
  } catch (err) {
    console.error('SMTP transporter verification failed:', err);
    return { ok: false, error: err }
  }
}

// Generate random 6-digit OTP code
export function generateOTP(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// Send OTP code to email
export async function sendOTP(email: string, otp: string): Promise<boolean> {
  try {
    console.log(`Attempting to send OTP to ${email}`);
    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: email,
      subject: 'Student Ride Sharing - Email Verification Code',
      html: `
        <div style="font-family: Arial, sans-serif; padding: 20px; background-color: #f5f5f5;">
          <div style="max-width: 600px; margin: 0 auto; background-color: white; padding: 30px; border-radius: 10px;">
            <h2 style="color: #4A90E2;">Email Verification</h2>
            <p>Your verification code is:</p>
            <h1 style="color: #4A90E2; font-size: 32px; letter-spacing: 5px;">${otp}</h1>
            <p>This code will expire in 10 minutes.</p>
            <p style="color: #7B8A8B; font-size: 12px;">If you didn't request this code, please ignore this email.</p>
          </div>
        </div>
      `,
    }
    console.log('Sending email with subject:', mailOptions.subject);
    await transporter.sendMail(mailOptions)
    console.log(`Email sent successfully to ${email}`);
    return true
  } catch (error) {
    console.error('Error sending email:', error)
    return false
  }
}

/**
 * Generates a 6-digit numeric OTP for SMS.
 * @returns {string} The generated OTP.
 */
export function generateSmsOTP(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

/**
 * Sends an OTP to a specified phone number using Twilio.
 * @param {string} phone - The recipient's phone number in E.164 format.
 * @param {string} otp - The OTP to send.
 */
export async function sendSmsOTP(phone: string, otp: string): Promise<void> {
  try {
    if (!process.env.TWILIO_PHONE_NUMBER) {
      throw new Error('Twilio phone number is not configured.');
    }

    await twilioClient.messages.create({
      body: `Your verification code is: ${otp}`,
      from: process.env.TWILIO_PHONE_NUMBER,
      to: phone,
    });
    console.log(`OTP SMS sent to ${phone}`);
  } catch (error) {
    console.error('Failed to send OTP SMS via Twilio:', error);
    // Depending on requirements, you might want to re-throw or handle this error
    throw new Error('Failed to send SMS.');
  }
}