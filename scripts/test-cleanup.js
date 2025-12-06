// Test script to verify cleanup functionality
const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function testCleanup() {
  try {
    console.log('🧪 Testing cleanup functionality...')

    // Create a test ride that's older than 5 minutes
    const oldDate = new Date(Date.now() - 6 * 60 * 1000) // 6 minutes ago

    const testRide = await prisma.ride.create({
      data: {
        pickupLatitude: 24.7136,
        pickupLongitude: 46.6753,
        dropoffLatitude: 24.7136,
        dropoffLongitude: 46.6753,
        pickupAddress: 'Test Pickup',
        dropoffAddress: 'Test Dropoff',
        scheduledTime: null,
        isPreBooked: false,
        paymentMethod: 'CASH',
        cost: 10,
        costPerPassenger: 10,
        status: 'PENDING',
        passengers: {
          connect: [] // No passengers for this test
        }
      }
    })

    // Manually set the createdAt to be old
    await prisma.ride.update({
      where: { id: testRide.id },
      data: { createdAt: oldDate }
    })

    console.log(`✅ Created test ride ${testRide.id} with old timestamp`)

    // Now run the cleanup
    const { execSync } = require('child_process')
    console.log('🧹 Running cleanup...')
    execSync('node scripts/cleanup-cron.js --run-once', { stdio: 'inherit' })

    // Check if the ride was cancelled
    const updatedRide = await prisma.ride.findUnique({
      where: { id: testRide.id }
    })

    if (updatedRide && updatedRide.status === 'CANCELLED') {
      console.log('✅ Test PASSED: Ride was successfully cancelled')
    } else {
      console.log('❌ Test FAILED: Ride was not cancelled')
      console.log('Ride status:', updatedRide?.status)
    }

    // Clean up test data
    await prisma.ride.delete({
      where: { id: testRide.id }
    })

    console.log('🧹 Cleaned up test data')

  } catch (error) {
    console.error('❌ Test error:', error)
  } finally {
    await prisma.$disconnect()
  }
}

testCleanup()