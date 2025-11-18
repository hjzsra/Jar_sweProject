// Driver reject ride API
// Allows driver to reject a ride request
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
    const { rideId, reason } = body

    if (!rideId) {
      return NextResponse.json(
        { error: 'Ride ID is required' },
        { status: 400 }
      )
    }

    // Get ride
    const ride = await prisma.ride.findUnique({
      where: { id: rideId },
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

    // Update ride status
    const updatedRide = await prisma.ride.update({
      where: { id: rideId },
      data: {
        status: 'rejected',
        rejectionReason: reason || 'Driver rejected the ride',
      },
    })

    return NextResponse.json({
      message: 'Ride rejected',
      ride: updatedRide,
    })
  } catch (error) {
    console.error('Reject ride error:', error)
    return NextResponse.json(
      { error: 'Failed to reject ride' },
      { status: 500 }
    )
  }
}

