// Driver accept ride API
// Allows driver to accept a ride request
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyToken } from '@/lib/auth'

export async function POST(request: NextRequest) {
  try {
    // Verify authentication
    const token = request.headers.get('authorization')?.replace('Bearer ', '')
    if (!token) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const payload = verifyToken(token)
    if (!payload || payload.role !== 'driver') {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { rideId } = body

    if (!rideId) {
      return NextResponse.json(
        { error: 'Ride ID is required' },
        { status: 400 }
      )
    }

    // Get ride
    const ride = await prisma.ride.findUnique({
      where: { id: rideId },
      include: { driver: true, passenger: true },
    })

    if (!ride) {
      return NextResponse.json(
        { error: 'Ride not found' },
        { status: 404 }
      )
    }

    // Check if driver owns this ride
    if (ride.driverId !== payload.userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 403 }
      )
    }

    // Check if ride is in pending status
    if (ride.status !== 'pending') {
      return NextResponse.json(
        { error: 'Ride is not in pending status' },
        { status: 400 }
      )
    }

    // Check if ride is pre-booked and if it's time
    if (ride.isPreBooked && ride.scheduledTime) {
      const now = new Date()
      const scheduledTime = new Date(ride.scheduledTime)
      // Allow acceptance 30 minutes before scheduled time
      const timeDiff = scheduledTime.getTime() - now.getTime()
      if (timeDiff < -30 * 60 * 1000) {
        return NextResponse.json(
          { error: 'Cannot accept ride. Scheduled time has passed.' },
          { status: 400 }
        )
      }
    }

    // Update ride status
    const updatedRide = await prisma.ride.update({
      where: { id: rideId },
      data: {
        status: 'accepted',
      },
    })

    return NextResponse.json({
      message: 'Ride accepted successfully',
      ride: updatedRide,
    })
  } catch (error) {
    console.error('Accept ride error:', error)
    return NextResponse.json(
      { error: 'Failed to accept ride' },
      { status: 500 }
    )
  }
}

