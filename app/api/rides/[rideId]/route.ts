// Get ride details by ID
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyToken } from '@/lib/auth'

export async function GET(
  request: NextRequest,
  { params }: { params: { rideId: string } }
) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '')
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const decoded = verifyToken(token)
    if (!decoded) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
    }

    const { rideId } = params

    const ride = await prisma.ride.findUnique({
      where: { id: rideId },
      include: {
        driver: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            carModel: true,
            carColor: true,
            carPlateNumber: true,
            averageRating: true,
          },
        },
        passenger: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    })

    if (!ride) {
      return NextResponse.json({ error: 'Ride not found' }, { status: 404 })
    }

    // Get driver's current location if available
    const driverLocation = await prisma.driverLocation.findUnique({
      where: { driverId: ride.driverId },
    })

    return NextResponse.json({
      ride,
      driverLocation,
    })
  } catch (error) {
    console.error('Get ride error:', error)
    return NextResponse.json(
      { error: 'Failed to get ride' },
      { status: 500 }
    )
  }
}
