// Driver end trip API
// Driver confirms trip has ended
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

    if (ride.status !== 'in_progress') {
      return NextResponse.json(
        { error: 'Trip must be in progress' },
        { status: 400 }
      )
    }

    // Update ride status and process payment if needed
    const updatedRide = await prisma.ride.update({
      where: { id: rideId },
      data: {
        status: 'completed',
        tripEndedAt: new Date(),
        paymentStatus: ride.paymentMethod === 'apple_pay' ? 'completed' : 'pending',
      },
    })

    // If Apple Pay, deduct from user wallet
    if (ride.paymentMethod === 'apple_pay') {
      await prisma.user.update({
        where: { id: ride.passengerId },
        data: {
          walletBalance: {
            decrement: ride.costPerPassenger,
          },
        },
      })
    }

    return NextResponse.json({
      message: 'Trip completed',
      ride: updatedRide,
    })
  } catch (error) {
    console.error('End trip error:', error)
    return NextResponse.json({ error: 'Failed to end trip' }, { status: 500 })
  }
}

