// User cancel ride API
// Allows user to cancel a ride with reason and apply distance-based fees
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyToken } from '@/lib/auth'
import { calculateDistance } from '@/lib/utils'

export async function POST(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '')
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const payload = verifyToken(token)
    if (!payload || payload.role !== 'user') {
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
    const validUserReasons = ['DRIVER_TOO_FAR', 'DRIVER_LATE', 'DRIVER_NOT_RESPONDING', 'CHANGE_OF_PLANS', 'OTHER_STUDENT']
    if (!validUserReasons.includes(reason)) {
      return NextResponse.json(
        { error: 'Invalid cancellation reason for user' },
        { status: 400 }
      )
    }

    // Get ride with driver location
    const ride = await prisma.ride.findUnique({
      where: { id: rideId },
      include: { passengers: true, driver: true },
    })

    if (!ride) {
      return NextResponse.json({ error: 'Ride not found' }, { status: 404 })
    }

    // Check if user is a passenger
    const isPassenger = ride.passengers.some(p => p.id === payload.userId)
    if (!isPassenger) {
      return NextResponse.json({ error: 'You are not a passenger on this ride' }, { status: 403 })
    }

    // Check if ride can be cancelled
    if (!['PENDING', 'ACCEPTED', 'DRIVER_ARRIVED'].includes(ride.status)) {
      return NextResponse.json(
        { error: 'Ride cannot be cancelled at this stage' },
        { status: 400 }
      )
    }

    // Calculate cancellation fee based on distance and reason
    let cancellationFee = 0

    if (!['DRIVER_TOO_FAR', 'DRIVER_LATE', 'DRIVER_NOT_RESPONDING'].includes(reason)) {
      // Get driver location for distance calculation
      const driverLocation = await prisma.driverLocation.findUnique({
        where: { driverId: ride.driverId! },
      })

      if (driverLocation) {
        const distance = calculateDistance(
          driverLocation.lat,
          driverLocation.lng,
          ride.pickupLatitude,
          ride.pickupLongitude
        )

        // Fee based on distance: max 4 SAR, scales with proximity
        // Closer driver = higher fee (more inconvenience)
        if (distance <= 1) {
          cancellationFee = 400 // 4 SAR
        } else if (distance <= 2) {
          cancellationFee = 300 // 3 SAR
        } else if (distance <= 5) {
          cancellationFee = 200 // 2 SAR
        } else {
          cancellationFee = 100 // 1 SAR
        }
      } else {
        cancellationFee = 200 // Default 2 SAR if location unknown
      }
    }

    // Apply fee to user if applicable
    if (cancellationFee > 0) {
      const userWallet = await prisma.wallet.findUnique({
        where: { userId: payload.userId },
      })

      if (userWallet && userWallet.balance >= cancellationFee) {
        await prisma.$transaction([
          // Deduct from user wallet
          prisma.wallet.update({
            where: { id: userWallet.id },
            data: { balance: { decrement: cancellationFee } },
          }),
          // Record transaction
          prisma.walletTransaction.create({
            data: {
              walletId: userWallet.id,
              type: 'DEBIT',
              source: 'RIDE',
              amount: cancellationFee,
              currency: 'SAR',
              referenceId: `CANCEL-${rideId}`,
            },
          }),
        ])
      } else {
        return NextResponse.json(
          { error: 'Insufficient wallet balance for cancellation fee' },
          { status: 400 }
        )
      }
    }

    // Update ride status
    await prisma.ride.update({
      where: { id: rideId },
      data: {
        status: 'CANCELLED',
        cancellationReason: reason as any,
      },
    })

    // If driver was assigned, set them as available again
    if (ride.driverId) {
      await prisma.driver.update({
        where: { id: ride.driverId },
        data: { isAvailable: true },
      })
    }

    return NextResponse.json({
      message: 'Ride cancelled successfully',
      cancellationFee: cancellationFee / 100, // Convert to SAR
    })
  } catch (error) {
    console.error('User cancel ride error:', error)
    return NextResponse.json(
      { error: 'Failed to cancel ride' },
      { status: 500 }
    )
  }
}
