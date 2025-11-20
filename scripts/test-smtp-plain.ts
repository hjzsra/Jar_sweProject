import 'dotenv/config'
import nodemailer from 'nodemailer'

async function run() {
  const transporter = nodemailer.createTransport({
    host: process.env.EMAIL_HOST || 'smtp.gmail.com',
    port: Number(process.env.EMAIL_PORT || 587),
    secure: false,
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  })

  try {
    await transporter.verify()
    console.log('SMTP transporter verified OK')
  } catch (err) {
    console.error('SMTP verify failed:')
    console.error(err)
    process.exitCode = 1
  }
}

run()
