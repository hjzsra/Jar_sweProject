// Admin API to cleanup expired ride requests
// Cancels rides that have been pending for more than 5 minutes
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyToken } from '@/lib/auth'

export async function POST(request: NextRequest) {
  try {
    // Verify admin authentication
    const token = request.headers.get('authorization')?.replace('Bearer ', '')
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const payload = verifyToken(token)
    if (!payload || payload.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized - Admin access required' }, { status: 401 })
    }

    // Calculate cutoff time (5 minutes ago)
    const cutoffTime = new Date(Date.now() - 5 * 60 * 1000)

    console.log(`Cleaning up rides created before ${cutoffTime.toISOString()}`)

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
            in: expiredRides.map((ride: { id: string }) => ride.id)
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
            in: expiredRides.map((ride: { id: string }) => ride.id)
          },
          status: 'PENDING'
        },
        data: {
          status: 'EXPIRED'
        }
      })

      console.log(`Cancelled ${updateResult.count} rides and marked their requests as expired`)

      return NextResponse.json({
        message: `Successfully cancelled ${updateResult.count} expired rides`,
        cancelledRides: expiredRides.length,
        cutoffTime: cutoffTime.toISOString()
      })
    } else {
      return NextResponse.json({
        message: 'No expired rides found',
        cancelledRides: 0,
        cutoffTime: cutoffTime.toISOString()
      })
    }

  } catch (error) {
    console.error('Cleanup expired rides error:', error)
    return NextResponse.json(
      { error: 'Failed to cleanup expired rides' },
      { status: 500 }
    )
  }
}

// Also allow GET for easier testing/manual execution
export async function GET(request: NextRequest) {
  return POST(request)
}