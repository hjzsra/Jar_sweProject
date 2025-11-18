// User reject ride API
// User can reject a ride with a reason
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
    if (!payload || payload.role !== 'user') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { rideId, reason } = body

    if (!rideId || !reason) {
      return NextResponse.json(
        { error: 'Ride ID and reason are required' },
        { status: 400 }
      )
    }

    const ride = await prisma.ride.findUnique({ where: { id: rideId } })
    if (!ride) {
      return NextResponse.json({ error: 'Ride not found' }, { status: 404 })
    }

    if (ride.passengerId !== payload.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    if (ride.status === 'completed' || ride.status === 'cancelled') {
      return NextResponse.json(
        { error: 'Cannot reject completed or cancelled ride' },
        { status: 400 }
      )
    }

    const updatedRide = await prisma.ride.update({
      where: { id: rideId },
      data: {
        status: 'cancelled',
        rejectionReason: reason,
      },
    })

    return NextResponse.json({
      message: 'Ride rejected',
      ride: updatedRide,
    })
  } catch (error) {
    console.error('Reject ride error:', error)
    return NextResponse.json({ error: 'Failed to reject ride' }, { status: 500 })
  }
}

