// Email utility for sending OTP codes
// Uses nodemailer to send verification emails
import nodemailer from 'nodemailer'

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
    await transporter.verify()
    return { ok: true }
  } catch (err) {
    return { ok: false, error: err }
  }
}

// Generate random 6-digit OTP code
export function generateOTP(): string {
  return Math.floor(100000 + Math.random() * 900000).toString()
}

// Send OTP code to email
export async function sendOTP(email: string, otp: string): Promise<boolean> {
  try {
    // verify connection so we get a clear error early
    const verify = await verifyTransporter()
    if (!verify.ok) {
      console.error('SMTP verify failed:', verify.error)
      return false
    }

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

    await transporter.sendMail(mailOptions)
    return true
  } catch (error) {
    console.error('Error sending email:', error)
    return false
  }
}

