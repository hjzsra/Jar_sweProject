// Note: These tests demonstrate database integration test structure
// To run these tests, you need:
// 1. A test database (PostgreSQL)
// 2. Set DATABASE_URL environment variable to test database
// 3. Run: npx prisma migrate deploy
//
// For now, these tests are skipped in CI/mock environment

import { prisma } from '../prisma'

describe('Database Integration Tests', () => {
  // Skip these tests in mock environment - they require a real database
  const isMockEnvironment = process.env.NODE_ENV === 'test' || !process.env.DATABASE_URL
  if (isMockEnvironment) {
    it.skip('Database tests skipped in mock environment', () => {})
    return
  }
  // Clean up test data before each test
  beforeEach(async () => {
    // Clean up in reverse order of dependencies
    await prisma.walletTransaction.deleteMany({
      where: {
        wallet: {
          user: {
            email: {
              startsWith: 'test-database-'
            }
          }
        }
      }
    })
    await prisma.wallet.deleteMany({
      where: {
        user: {
          email: {
            startsWith: 'test-database-'
          }
        }
      }
    })
    await prisma.user.deleteMany({
      where: {
        email: {
          startsWith: 'test-database-'
        }
      }
    })
  })

  afterAll(async () => {
    await prisma.$disconnect()
  })

  describe('User and Wallet Creation', () => {
    it('should create a user with wallet', async () => {
      const testEmail = 'test-database-user@example.com'

      // Create user
      const user = await prisma.user.create({
        data: {
          email: testEmail,
          password: 'hashedpassword123',
          firstName: 'Test',
          lastName: 'User',
          phone: '+966123456789',
          gender: 'male',
          university: 'Test University',
          emailVerified: true,
        },
        include: {
          wallet: true,
        },
      })

      expect(user.email).toBe(testEmail)
      expect(user.wallet).toBeTruthy()
      expect(user.wallet?.balance).toBe(0)
    })

    it('should handle wallet transactions', async () => {
      const testEmail = 'test-database-wallet@example.com'

      // Create user with wallet
      const user = await prisma.user.create({
        data: {
          email: testEmail,
          password: 'hashedpassword123',
          firstName: 'Test',
          lastName: 'Wallet',
          phone: '+966123456789',
          gender: 'male',
          university: 'Test University',
          emailVerified: true,
        },
        include: {
          wallet: true,
        },
      })

      const walletId = user.wallet!.id

      // Add credit transaction
      const creditTransaction = await prisma.walletTransaction.create({
        data: {
          walletId,
          type: 'CREDIT',
          source: 'TOPUP',
          amount: 10000, // 100 SAR in cents
          currency: 'SAR',
          referenceId: 'TEST-TOPUP-123',
        },
      })

      expect(creditTransaction.amount).toBe(10000)
      expect(creditTransaction.type).toBe('CREDIT')

      // Update wallet balance
      await prisma.wallet.update({
        where: { id: walletId },
        data: {
          balance: {
            increment: 10000,
          },
        },
      })

      // Check updated balance
      const updatedWallet = await prisma.wallet.findUnique({
        where: { id: walletId },
      })

      expect(updatedWallet?.balance).toBe(10000)

      // Add debit transaction
      const debitTransaction = await prisma.walletTransaction.create({
        data: {
          walletId,
          type: 'DEBIT',
          source: 'RIDE',
          amount: 2500, // 25 SAR in cents
          currency: 'SAR',
          referenceId: 'TEST-RIDE-456',
        },
      })

      expect(debitTransaction.amount).toBe(2500)
      expect(debitTransaction.type).toBe('DEBIT')

      // Update balance again
      await prisma.wallet.update({
        where: { id: walletId },
        data: {
          balance: {
            decrement: 2500,
          },
        },
      })

      // Check final balance
      const finalWallet = await prisma.wallet.findUnique({
        where: { id: walletId },
        include: {
          txns: {
            orderBy: { createdAt: 'desc' },
          },
        },
      })

      expect(finalWallet?.balance).toBe(7500) // 10000 - 2500
      expect(finalWallet?.txns).toHaveLength(2)
    })
  })

  describe('Ride Operations', () => {
    it('should create and update ride status', async () => {
      const testEmail = 'test-database-ride@example.com'

      // Create user and driver
      const user = await prisma.user.create({
        data: {
          email: testEmail,
          password: 'hashedpassword123',
          firstName: 'Test',
          lastName: 'Ride',
          phone: '+966123456789',
          gender: 'male',
          university: 'Test University',
          emailVerified: true,
        },
      })

      const driver = await prisma.driver.create({
        data: {
          email: 'test-driver@example.com',
          password: 'hashedpassword123',
          firstName: 'Test',
          lastName: 'Driver',
          gender: 'male',
          licenseNumber: 'TEST123456',
          carModel: 'Toyota Camry',
          carColor: 'White',
          carPlateNumber: 'ABC123',
          isStudent: true,
          university: 'Test University',
        },
      })

      // Create ride
      const ride = await prisma.ride.create({
        data: {
          driverId: driver.id,
          passengers: {
            connect: { id: user.id },
          },
          pickupLatitude: 24.7136,
          pickupLongitude: 46.6753,
          dropoffLatitude: 24.7743,
          dropoffLongitude: 46.7386,
          pickupAddress: 'Test Pickup',
          dropoffAddress: 'Test Dropoff',
          cost: 50.00,
          costPerPassenger: 50.00,
          paymentMethod: 'CASH',
        },
      })

      expect(ride.status).toBe('PENDING')

      // Update ride status
      const updatedRide = await prisma.ride.update({
        where: { id: ride.id },
        data: {
          status: 'COMPLETED',
          tripEndedAt: new Date(),
          paymentStatus: 'PAID',
        },
      })

      expect(updatedRide.status).toBe('COMPLETED')
      expect(updatedRide.paymentStatus).toBe('PAID')
      expect(updatedRide.tripEndedAt).toBeTruthy()

      // Clean up
      await prisma.ride.delete({ where: { id: ride.id } })
      await prisma.driver.delete({ where: { id: driver.id } })
    })
  })
})