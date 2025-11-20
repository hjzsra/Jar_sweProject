import 'dotenv/config'
import { verifyTransporter } from '../lib/email.ts'

;(async () => {
  const res = await verifyTransporter()
  if (res.ok) {
    console.log('SMTP transporter verified OK')
  } else {
    console.error('SMTP verify failed:')
    console.error(res.error)
  }
  process.exit(res.ok ? 0 : 1)
})()
