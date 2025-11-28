// Driver start trip API
// Driver starts the trip
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { RideStatus, UserRole } from '@prisma/client'
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

    if (ride.status !== RideStatus.DRIVER_ARRIVED) {
      return NextResponse.json(
        { error: 'Driver must arrive first' },
        { status: 400 }
      )
    }

    const updatedRide = await prisma.ride.update({
      where: { id: rideId },
      data: {
        status: RideStatus.IN_PROGRESS,
        tripStartedAt: new Date(),
      },
    })

    return NextResponse.json({
      message: 'Trip started',
      ride: updatedRide,
    })
  } catch (error) {
    console.error('Start trip error:', error)
    return NextResponse.json({ error: 'Failed to start trip' }, { status: 500 })
  }
}

