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
      include: { passengers: true },
    })

    if (!ride) {
      return NextResponse.json(
        { error: 'Ride not found' },
        { status: 404 }
      )
    }

    // Check if ride is pending
    if (ride.status !== 'PENDING') {
      return NextResponse.json(
        { error: 'Ride is not available for acceptance' },
        { status: 400 }
      )
    }

    // Check if ride is in pending status
    if (ride.status !== 'PENDING') {
      return NextResponse.json(
        { error: 'Ride is not available for acceptance' },
        { status: 400 }
      )
    }

    // Get the driver
    const driver = await prisma.driver.findUnique({
      where: { id: payload.userId },
    })

    if (!driver) {
      return NextResponse.json(
        { error: 'Driver not found' },
        { status: 404 }
      )
    }

    // Check if driver is available
    if (!driver.isAvailable) {
      return NextResponse.json(
        { error: 'Driver is not available' },
        { status: 400 }
      )
    }

    // Gender matching: All passengers must be same gender as driver
    const mismatchedPassengers = ride.passengers.filter((p: any) => p.gender !== driver.gender)
    if (mismatchedPassengers.length > 0) {
      return NextResponse.json(
        { error: 'Gender mismatch. All passengers must be the same gender as the driver.' },
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

    // Update ride and set driver to busy
    const result = await prisma.$transaction(async (tx: any) => {
      // Update ride
      const updatedRide = await tx.ride.update({
        where: { id: rideId },
        data: {
          driverId: payload.userId,
          status: 'ACCEPTED',
        },
      })

      // Set driver to busy
      const updatedDriver = await tx.driver.update({
        where: { id: payload.userId },
        data: { isAvailable: false },
      })

      // Update the accepted ride request
      await tx.rideRequest.updateMany({
        where: {
          rideId: rideId,
          driverId: payload.userId,
          status: 'PENDING',
        },
        data: {
          status: 'ACCEPTED',
          respondedAt: new Date(),
        },
      })

      // Reject all other pending requests for this ride
      await tx.rideRequest.updateMany({
        where: {
          rideId: rideId,
          driverId: { not: payload.userId },
          status: 'PENDING',
        },
        data: {
          status: 'REJECTED',
          respondedAt: new Date(),
        },
      })

      return { ride: updatedRide, driver: updatedDriver }
    })

    return NextResponse.json({
      message: 'Ride accepted successfully',
      ride: result.ride,
    })
  } catch (error) {
    console.error('Accept ride error:', error)
    return NextResponse.json(
      { error: 'Failed to accept ride' },
      { status: 500 }
    )
  }
}

