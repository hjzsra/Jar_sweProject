// Database seed script
// Bootstraps an admin, a user, a driver, wallets, a ride, and a chat thread
import { PrismaClient, PaymentMethod, PaymentStatus, RideStatus, TransactionSource, TransactionType, UserRole } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  // Create default admin user
  const adminEmail = 'admin@studentrides.com'
  const adminPassword = 'admin123' // Change this in production!
  const hashedAdmin = await bcrypt.hash(adminPassword, 10)

  const admin = await prisma.admin.upsert({
    where: { email: adminEmail },
    update: {},
    create: {
      email: adminEmail,
      password: hashedAdmin,
      name: 'Admin User',
    },
  })

  // Create a sample user
  const userPassword = await bcrypt.hash('user12345', 10)
  const user = await prisma.user.upsert({
    where: { email: 'student1@university.edu' },
    update: {},
    create: {
      role: UserRole.USER,
      email: 'student1@university.edu',
      password: userPassword,
      firstName: 'Alice',
      lastName: 'Student',
      phone: '+10000000001',
      gender: 'female',
      university: 'Sample University',
    },
  })

  // Ensure wallet for user
  const wallet = await prisma.wallet.upsert({
    where: { userId: user.id },
    update: {},
    create: {
      userId: user.id,
      balance: 0,
      currency: 'USD',
    },
  })

  // Seed a topup transaction
  await prisma.walletTransaction.create({
    data: {
      walletId: wallet.id,
      type: TransactionType.CREDIT,
      source: TransactionSource.TOPUP,
      amount: 1000,
      currency: 'USD',
      referenceId: 'seed-topup-1',
    },
  })

  // Create a sample driver
  const driverPassword = await bcrypt.hash('driver12345', 10)
  const driver = await prisma.driver.upsert({
    where: { licenseNumber: 'LIC-12345' },
    update: {},
    create: {
      email: 'driver1@example.com',
      phone: '+10000000002',
      password: driverPassword,
      firstName: 'Bob',
      lastName: 'Driver',
      gender: 'male',
      licenseNumber: 'LIC-12345',
      licenseVerified: true,
      isStudent: false,
      carModel: 'Toyota Corolla',
      carColor: 'White',
      carPlateNumber: 'ABC-123',
      isAvailable: true,
    },
  })

  // Driver location
  await prisma.driverLocation.upsert({
    where: { driverId: driver.id },
    update: { lat: 24.7136, lng: 46.6753 },
    create: { driverId: driver.id, lat: 24.7136, lng: 46.6753 },
  })

  // Create a ride
  const ride = await prisma.ride.create({
    data: {
      driverId: driver.id,
      passengerId: user.id,
      pickupLatitude: 24.7136,
      pickupLongitude: 46.6753,
      dropoffLatitude: 24.7743,
      dropoffLongitude: 46.7386,
      pickupAddress: 'Gate A, Sample University',
      dropoffAddress: 'Dormitory 5',
      status: RideStatus.PENDING,
      cost: 30.0,
      costPerPassenger: 30.0,
      paymentMethod: PaymentMethod.CASH,
      paymentStatus: PaymentStatus.PENDING,
    },
  })

  // Offer ride to driver
  await prisma.rideRequest.create({
    data: {
      rideId: ride.id,
      driverId: driver.id,
    },
  })

  // Create chat thread and messages
  const thread = await prisma.chatThread.create({
    data: {
      rideId: ride.id,
      participantAId: user.id,
      participantBId: user.id, // single-user thread for seed simplicity
    },
  })

  await prisma.chatMessage.create({
    data: {
      threadId: thread.id,
      rideId: ride.id,
      userId: user.id,
      message: 'Hello, I am waiting at Gate A.',
    },
  })

  console.log('Seed completed:')
  console.log({ admin: admin.email, user: user.email, driver: driver.email, ride: ride.id })
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })

