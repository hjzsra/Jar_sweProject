import 'dotenv/config'
import bcrypt from 'bcryptjs'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  const email = 'admin@studentrides.com'
  const admin = await prisma.admin.findUnique({ where: { email } })
  console.log('Admin row:', admin ? { id: admin.id, email: admin.email } : null)
  if (admin) {
    const ok = await bcrypt.compare('admin123', admin.password)
    console.log('Password matches admin.password:', ok)
  }

  const user = await prisma.user.findUnique({ where: { email } })
  console.log('User row:', user ? { id: user.id, email: user.email, emailVerified: user.emailVerified } : null)
  if (user) {
    const ok2 = await bcrypt.compare('admin123', user.password)
    console.log('Password matches user.password:', ok2)
  }
}

main()
  .catch((e) => console.error(e))
  .finally(async () => {
    await prisma.$disconnect()
  })
