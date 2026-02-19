// GPS tracking for active rides
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
    const { rideId, latitude, longitude, heading, speed } = body

    if (!rideId || !latitude || !longitude) {
      return NextResponse.json({ error: 'rideId, latitude, and longitude are required' }, { status: 400 })
    }

    // Verify the driver is assigned to this ride and it's active
    const ride = await prisma.ride.findFirst({
      where: {
        id: rideId,
        driverId: payload.userId,
        status: { in: ['ACCEPTED', 'DRIVER_ARRIVED', 'IN_PROGRESS'] }
      }
    })

    if (!ride) {
      return NextResponse.json({ error: 'Ride not found or not active' }, { status: 404 })
    }

    // Record the location
    const location = await prisma.rideLocation.create({
      data: {
        rideId,
        latitude: parseFloat(latitude),
        longitude: parseFloat(longitude),
        heading: heading ? parseFloat(heading) : null,
        speed: speed ? parseFloat(speed) : null,
      }
    })

    return NextResponse.json({ message: 'Location recorded', location })
  } catch (error) {
    console.error('Record location error:', error)
    return NextResponse.json({ error: 'Failed to record location' }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '')
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const payload = verifyToken(token)
    if (!payload) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const rideId = searchParams.get('rideId')

    if (!rideId) {
      return NextResponse.json({ error: 'rideId parameter required' }, { status: 400 })
    }

    // Check if user is passenger or driver for this ride
    const ride = await prisma.ride.findFirst({
      where: {
        id: rideId,
        OR: [
          { driverId: payload.role === 'driver' ? payload.userId : undefined },
          { passengers: { some: { id: payload.role === 'user' ? payload.userId : undefined } } }
        ]
      },
      include: {
        locations: {
          orderBy: { timestamp: 'desc' },
          take: 50 // Last 50 locations
        }
      }
    })

    if (!ride) {
      return NextResponse.json({ error: 'Ride not found or access denied' }, { status: 404 })
    }

    return NextResponse.json({ locations: ride.locations })
  } catch (error) {
    console.error('Get locations error:', error)
    return NextResponse.json({ error: 'Failed to get locations' }, { status: 500 })
  }
}