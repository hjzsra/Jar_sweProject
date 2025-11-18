// Driver ride requests API
// Get pending ride requests for driver in their area
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyToken } from '@/lib/auth'
import { calculateDistance } from '@/lib/utils'

export async function GET(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '')
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const payload = verifyToken(token)
    if (!payload || payload.role !== 'driver') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get driver location
    const driver = await prisma.driver.findUnique({
      where: { id: payload.userId },
    })

    if (!driver || !driver.currentLatitude || !driver.currentLongitude) {
      return NextResponse.json(
        { error: 'Driver location not set' },
        { status: 400 }
      )
    }

    // Get query parameters
    const { searchParams } = new URL(request.url)
    const radius = parseFloat(searchParams.get('radius') || '5') // Default 5km

    // Get pending rides with same gender (passenger gender must match driver gender)
    const pendingRides = await prisma.ride.findMany({
      where: {
        status: 'pending',
        passenger: {
          gender: driver.gender, // Only show rides from passengers of same gender
        },
      },
      include: {
        passenger: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            phone: true,
            gender: true,
          },
        },
      },
    })

    // Filter by distance
    const nearbyRequests = pendingRides
      .map((ride) => {
        const distance = calculateDistance(
          driver.currentLatitude!,
          driver.currentLongitude!,
          ride.pickupLatitude,
          ride.pickupLongitude
        )
        return {
          ...ride,
          distance,
        }
      })
      .filter((ride) => ride.distance <= radius)
      .sort((a, b) => a.distance - b.distance)

    return NextResponse.json({
      requests: nearbyRequests,
      count: nearbyRequests.length,
    })
  } catch (error) {
    console.error('Get driver requests error:', error)
    return NextResponse.json(
      { error: 'Failed to get ride requests' },
      { status: 500 }
    )
  }
}

