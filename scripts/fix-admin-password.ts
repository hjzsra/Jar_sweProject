import 'dotenv/config'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  const email = 'admin@studentrides.com'
  const user = await prisma.user.findUnique({ where: { email } })
  const admin = await prisma.admin.findUnique({ where: { email } })
  if (!user) {
    console.log('No user with that email; cannot sync password')
    return
  }
  if (!admin) {
    console.log('No admin with that email; creating admin record')
    const created = await prisma.admin.create({ data: { email, password: user.password, name: 'Site Admin' } })
    console.log('Created admin id:', created.id)
    return
  }

  if (admin.password === user.password) {
    console.log('Admin password already matches user password')
    return
  }

  const updated = await prisma.admin.update({ where: { id: admin.id }, data: { password: user.password } })
  console.log('Updated admin password for id:', updated.id)
}

main()
  .catch((e) => console.error(e))
  .finally(async () => {
    await prisma.$disconnect()
  })
