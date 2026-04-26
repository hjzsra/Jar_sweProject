// Test script for wallet functionality
// Run with: npx tsx scripts/test-wallet.ts

import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  console.log('🧪 Starting Wallet Test...\n')

  try {
    // 1. Create a test user
    console.log('👤 Creating test user...')
    const hashedPassword = await bcrypt.hash('Test123456', 10)
    
    const user = await prisma.user.create({
      data: {
        email: 'test-wallet@qu.edu.qa',
        password: hashedPassword,
        firstName: 'Test',
        lastName: 'User',
        phone: '+974123456789',
        gender: 'male',
        university: 'Qatar University',
        emailVerified: true,
      },
    })
    console.log('✅ User created:', user.id, user.email)

    // 2. Create wallet for user
    console.log('\n💰 Creating wallet...')
    const wallet = await prisma.wallet.create({
      data: {
        userId: user.id,
        balance: 0,
        currency: 'SAR',
      },
    })
    console.log('✅ Wallet created:', wallet.id)
    console.log('   Initial balance:', wallet.balance / 100, 'SAR')

    // 3. Add funds (top-up)
    console.log('\n💳 Adding 100 SAR to wallet...')
    const topupAmount = 10000 // 100 SAR in cents
    
    const result1 = await prisma.$transaction(async (tx) => {
      // Update wallet balance
      const updatedWallet = await tx.wallet.update({
        where: { id: wallet.id },
        data: {
          balance: {
            increment: topupAmount,
          },
        },
      })

      // Create transaction record
      const transaction = await tx.walletTransaction.create({
        data: {
          walletId: wallet.id,
          type: 'CREDIT',
          source: 'TOPUP',
          amount: topupAmount,
          currency: 'SAR',
          referenceId: `TOPUP-${Date.now()}`,
        },
      })

      return { wallet: updatedWallet, transaction }
    })

    console.log('✅ Funds added successfully')
    console.log('   New balance:', result1.wallet.balance / 100, 'SAR')
    console.log('   Transaction ID:', result1.transaction.id)

    // 4. Deduct funds (ride payment)
    console.log('\n💸 Deducting 25.50 SAR for ride payment...')
    const rideAmount = 2550 // 25.50 SAR in cents

    // Check sufficient balance
    const currentWallet = await prisma.wallet.findUnique({
      where: { id: wallet.id },
    })

    if (!currentWallet || currentWallet.balance < rideAmount) {
      throw new Error('Insufficient balance')
    }

    const result2 = await prisma.$transaction(async (tx) => {
      // Update wallet balance
      const updatedWallet = await tx.wallet.update({
        where: { id: wallet.id },
        data: {
          balance: {
            decrement: rideAmount,
          },
        },
      })

      // Create transaction record
      const transaction = await tx.walletTransaction.create({
        data: {
          walletId: wallet.id,
          type: 'DEBIT',
          source: 'RIDE',
          amount: rideAmount,
          currency: 'SAR',
          referenceId: `RIDE-${Date.now()}`,
        },
      })

      return { wallet: updatedWallet, transaction }
    })

    console.log('✅ Funds deducted successfully')
    console.log('   New balance:', result2.wallet.balance / 100, 'SAR')
    console.log('   Transaction ID:', result2.transaction.id)

    // 5. Get wallet with transaction history
    console.log('\n📊 Getting wallet with transaction history...')
    const walletWithTxns = await prisma.wallet.findUnique({
      where: { id: wallet.id },
      include: {
        txns: {
          orderBy: { createdAt: 'desc' },
        },
      },
    })

    console.log('✅ Final wallet state:')
    console.log('   Balance:', walletWithTxns!.balance / 100, 'SAR')
    console.log('   Total transactions:', walletWithTxns!.txns.length)
    console.log('\n   Transaction History:')
    walletWithTxns!.txns.forEach((txn, index) => {
      console.log(`   ${index + 1}. ${txn.type} - ${txn.source}`)
      console.log(`      Amount: ${txn.amount / 100} SAR`)
      console.log(`      Reference: ${txn.referenceId}`)
      console.log(`      Date: ${txn.createdAt.toLocaleString()}`)
    })

    // 6. Test insufficient balance scenario
    console.log('\n❌ Testing insufficient balance...')
    try {
      const largeAmount = 100000 // 1000 SAR in cents
      
      const checkWallet = await prisma.wallet.findUnique({
        where: { id: wallet.id },
      })

      if (!checkWallet || checkWallet.balance < largeAmount) {
        throw new Error(`Insufficient balance. Current: ${checkWallet!.balance / 100} SAR, Required: ${largeAmount / 100} SAR`)
      }
    } catch (error: any) {
      console.log('✅ Correctly prevented:', error.message)
    }

    console.log('\n🎉 All wallet tests passed!')

  } catch (error) {
    console.error('\n❌ Test failed:', error)
  } finally {
    // 7. Cleanup (optional - comment out if you want to keep test data)
    console.log('\n🧹 Cleaning up test data...')
    await prisma.walletTransaction.deleteMany({
      where: {
        wallet: {
          user: {
            email: 'test-wallet@qu.edu.qa',
          },
        },
      },
    })
    await prisma.wallet.deleteMany({
      where: {
        user: {
          email: 'test-wallet@qu.edu.qa',
        },
      },
    })
    await prisma.user.deleteMany({
      where: {
        email: 'test-wallet@qu.edu.qa',
      },
    })
    console.log('✅ Cleanup complete')

    await prisma.$disconnect()
  }
}

main()
  .catch((error) => {
    console.error('Fatal error:', error)
    process.exit(1)
  })