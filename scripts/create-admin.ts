import 'dotenv/config'
import bcrypt from 'bcryptjs'
import { PrismaClient } from '@prisma/client'
import readline from 'readline'

const prisma = new PrismaClient()

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
})

async function main() {
  rl.question('Enter admin name: ', (name) => {
    rl.question('Enter admin email: ', (email) => {
      rl.question('Enter admin password: ', async (password) => {
        if (!name || !email || !password) {
          console.error('Name, email, and password are required.')
          rl.close()
          return
        }

        const hashedPassword = await bcrypt.hash(password, 10)

        try {
          const admin = await prisma.admin.create({
            data: {
              name,
              email,
              password: hashedPassword,
            },
          })
          console.log('Admin created successfully:', admin)
        } catch (error) {
          console.error('Error creating admin:', error)
        } finally {
          await prisma.$disconnect()
          rl.close()
        }
      })
    })
  })
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })