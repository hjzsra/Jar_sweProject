// Driver cancel ride API
// Allows driver to cancel a ride with reason and apply fees
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyToken } from '@/lib/auth'

export async function POST(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '')
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const payload = verifyToken(token)
    if (!payload || payload.role !== 'driver') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { rideId, reason } = body

    if (!rideId || !reason) {
      return NextResponse.json(
        { error: 'Ride ID and cancellation reason are required' },
        { status: 400 }
      )
    }

    // Validate reason
    const validDriverReasons = ['TRAFFIC_CONGESTION', 'VEHICLE_ISSUE', 'PERSONAL_EMERGENCY', 'OTHER_DRIVER']
    if (!validDriverReasons.includes(reason)) {
      return NextResponse.json(
        { error: 'Invalid cancellation reason for driver' },
        { status: 400 }
      )
    }

    // Get ride with driver info
    const ride = await prisma.ride.findUnique({
      where: { id: rideId },
      include: { passengers: true, driver: true },
    })

    if (!ride) {
      return NextResponse.json({ error: 'Ride not found' }, { status: 404 })
    }

    if (ride.driverId !== payload.userId) {
      return NextResponse.json({ error: 'You are not assigned to this ride' }, { status: 403 })
    }

    console.log('Driver cancel - ride status check:', {
      rideId: ride.id,
      currentStatus: ride.status,
      allowedStatuses: ['ACCEPTED', 'DRIVER_ARRIVED', 'IN_PROGRESS'],
      isAllowed: ['ACCEPTED', 'DRIVER_ARRIVED', 'IN_PROGRESS'].includes(ride.status)
    })

    // Check if ride can be cancelled
    // Allow cancellation if driver is assigned and ride is not completed/cancelled
    const cancellableStatuses = ['PENDING', 'ACCEPTED', 'DRIVER_ARRIVED', 'IN_PROGRESS']
    if (!cancellableStatuses.includes(ride.status)) {
      return NextResponse.json(
        { error: `Ride cannot be cancelled at this stage. Current status: ${ride.status}` },
        { status: 400 }
      )
    }

    // Calculate progressive cancellation fee based on history
    let cancellationFee = 0
    if (reason !== 'TRAFFIC_CONGESTION') {
      // Base penalty: 3 SAR
      cancellationFee = 300

      // Progressive penalties based on recent cancellations
      const driver = ride.driver as any // Type assertion for new fields
      if (driver) {
        const recentCancellations = driver.cancellationCount || 0
        const lastCancellation = driver.lastCancellation

        // If driver had cancellations in the last 24 hours, increase penalty
        if (lastCancellation && (Date.now() - new Date(lastCancellation).getTime()) < 24 * 60 * 60 * 1000) {
          if (recentCancellations >= 3) {
            cancellationFee = 1000 // 10 SAR for frequent offenders
          } else if (recentCancellations >= 2) {
            cancellationFee = 600 // 6 SAR
          } else if (recentCancellations >= 1) {
            cancellationFee = 450 // 4.5 SAR
          }
        }
      }
    }

    // Update driver cancellation tracking and apply penalty
    const driverUpdate: any = {
      cancellationCount: { increment: 1 },
      lastCancellation: new Date(),
      isAvailable: true, // Set driver as available again
    }

    if (cancellationFee > 0) {
      driverUpdate.totalPenalties = { increment: cancellationFee }
      driverUpdate.availableBalance = { decrement: cancellationFee }
      console.log(`Driver cancellation penalty: ${cancellationFee / 100} SAR applied`)
    }

    await prisma.driver.update({
      where: { id: payload.userId },
      data: driverUpdate,
    })

    // Update ride status
    await prisma.ride.update({
      where: { id: rideId },
      data: {
        status: 'CANCELLED',
        cancellationReason: reason,
      } as any,
    })


    return NextResponse.json({
      message: 'Ride cancelled successfully',
      cancellationFee: cancellationFee / 100, // Convert to SAR
    })
  } catch (error) {
    console.error('Driver cancel ride error:', error)
    return NextResponse.json(
      { error: 'Failed to cancel ride' },
      { status: 500 }
    )
  }
}