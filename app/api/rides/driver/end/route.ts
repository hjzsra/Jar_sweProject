// Driver end trip API
// Driver confirms trip has ended
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { PaymentMethod, PaymentStatus, RideStatus, UserRole } from '@prisma/client'
import { verifyToken } from '@/lib/auth'

export async function POST(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '')
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const payload = verifyToken(token)
    if (!payload || payload.role !== UserRole.DRIVER) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { rideId } = body

    if (!rideId) {
      return NextResponse.json({ error: 'Ride ID is required' }, { status: 400 })
    }

    const ride = await prisma.ride.findUnique({ where: { id: rideId } })
    if (!ride) {
      return NextResponse.json({ error: 'Ride not found' }, { status: 404 })
    }

    if (ride.driverId !== payload.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    if (ride.status !== RideStatus.IN_PROGRESS) {
      return NextResponse.json(
        { error: 'Trip must be in progress' },
        { status: 400 }
      )
    }

    // Use a transaction to ensure data consistency
    const updatedRide = await prisma.$transaction(async (tx) => {
      const rideForUpdate = await tx.ride.update({
        where: { id: rideId },
        data: {
          status: RideStatus.COMPLETED,
          tripEndedAt: new Date(),
        },
      });

      // If Apple Pay, deduct from user wallet
      if (ride.paymentMethod === PaymentMethod.APPLE_PAY) {
        await tx.user.update({
          where: { id: ride.passengerId },
          data: {
            walletBalance: {
              decrement: ride.costPerPassenger,
            },
          },
        });
      }
      
      return rideForUpdate;
    });

    return NextResponse.json({
      message: 'Trip completed',
      ride: updatedRide,
    })
  } catch (error) {
    console.error('End trip error:', error)
    return NextResponse.json({ error: 'Failed to end trip' }, { status: 500 })
  }
}