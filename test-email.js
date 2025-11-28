require('dotenv').config();
const nodemailer = require('nodemailer');

// Create email transporter
const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.EMAIL_PORT || '587'),
  secure: false,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

// Send test email
async function sendTestEmail() {
  try {
    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: 'test@example.com', // Replace with a real email address you can check
      subject: 'Test Email from Student Ride Sharing',
      html: `
        <div style="font-family: Arial, sans-serif; padding: 20px; background-color: #f5f5f5;">
          <div style="max-width: 600px; margin: 0 auto; background-color: white; padding: 30px; border-radius: 10px;">
            <h2 style="color: #4A90E2;">Test Email</h2>
            <p>This is a test email to verify your email configuration.</p>
            <p style="color: #7B8A8B; font-size: 12px;">If you received this, your email settings are correct.</p>
          </div>
        </div>
      `,
    };

    console.log('Sending test email...');
    await transporter.sendMail(mailOptions);
    console.log('Test email sent successfully!');
  } catch (error) {
    console.error('Error sending test email:', error);
  }
}

sendTestEmail();