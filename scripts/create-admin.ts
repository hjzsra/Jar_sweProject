import 'dotenv/config'
import bcrypt from 'bcryptjs'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  const email = 'admin@studentrides.com'   // change if desired
  const plainPassword = 'admin123'         // change immediately after creation

  const existing = await prisma.user.findUnique({ where: { email } })
  let hashed = ''
  if (existing) {
    console.log('User already exists. Will ensure admin record exists as well.')
    hashed = existing.password
  } else {
    hashed = await bcrypt.hash(plainPassword, 10)

    const user = await prisma.user.create({
      data: {
        email,
        password: hashed,
        firstName: 'Admin',
        lastName: 'User',
        phone: '0000000000',
        gender: 'other',
        university: 'local',
        emailVerified: true,
      },
    })

    console.log('User created with id:', user.id)
  }
  
  // Also create an Admin record for the admin dashboard (separate model)
  const existingAdmin = await prisma.admin.findUnique({ where: { email } })
  if (!existingAdmin) {
    const adminRecord = await prisma.admin.create({
      data: {
        email,
        password: hashed,
        name: 'Site Admin',
      },
    })
    console.log('Admin record created (admins table) id:', adminRecord.id)
  } else {
    console.log('Admin record already exists in admins table.')
  }
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
