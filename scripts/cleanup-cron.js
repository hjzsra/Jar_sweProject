// Cron job script to cleanup expired ride requests
// Run this script periodically (e.g., every minute) to cancel rides older than 5 minutes

const cron = require('node-cron')
const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function cleanupExpiredRides() {
  try {
    console.log('🧹 Running cleanup of expired ride requests...')

    // Calculate cutoff time (5 minutes ago)
    const cutoffTime = new Date(Date.now() - 5 * 60 * 1000)

    console.log(`Looking for rides created before ${cutoffTime.toISOString()}`)

    // Find rides that are still pending and older than 5 minutes
    const expiredRides = await prisma.ride.findMany({
      where: {
        status: 'PENDING',
        createdAt: {
          lt: cutoffTime
        }
      },
      select: {
        id: true,
        createdAt: true
      }
    })

    console.log(`Found ${expiredRides.length} expired rides to cancel`)

    if (expiredRides.length > 0) {
      // Update rides to CANCELLED status
      const updateResult = await prisma.ride.updateMany({
        where: {
          id: {
            in: expiredRides.map(ride => ride.id)
          },
          status: 'PENDING' // Double-check status hasn't changed
        },
        data: {
          status: 'CANCELLED'
        }
      })

      // Update all pending ride requests to EXPIRED
      await prisma.rideRequest.updateMany({
        where: {
          rideId: {
            in: expiredRides.map(ride => ride.id)
          },
          status: 'PENDING'
        },
        data: {
          status: 'EXPIRED'
        }
      })

      console.log(`✅ Successfully cancelled ${updateResult.count} expired rides`)
    } else {
      console.log('✅ No expired rides found')
    }

  } catch (error) {
    console.error('❌ Error during cleanup:', error)
  } finally {
    await prisma.$disconnect()
  }
}

// Check if --run-once flag is provided
const runOnce = process.argv.includes('--run-once')

if (runOnce) {
  console.log('🚀 Running cleanup once...')
  cleanupExpiredRides()
    .then(() => {
      console.log('✅ Cleanup completed')
      process.exit(0)
    })
    .catch((error) => {
      console.error('❌ Cleanup failed:', error)
      process.exit(1)
    })
} else {
  // Run cleanup immediately, then schedule to run every minute
  console.log('🚀 Starting ride cleanup cron job...')

  // Run once immediately
  cleanupExpiredRides()

  // Schedule to run every minute
  cron.schedule('* * * * *', () => {
    cleanupExpiredRides()
  })

  console.log('⏰ Cron job scheduled to run every minute')
}