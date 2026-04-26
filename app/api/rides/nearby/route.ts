export const dynamic = 'force-dynamic';

// Get nearby pending rides API
// Returns pending rides within a specified radius for drivers to accept
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyToken, getTokenFromRequest } from '@/lib/auth'
import { calculateDistance } from '@/lib/utils'

export async function GET(request: NextRequest) {
  try {
    // Verify authentication
    const token = getTokenFromRequest(request.headers)
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

    // Get driver to check gender
    const driver = await prisma.driver.findUnique({
      where: { id: payload.userId },
    })

    if (!driver) {
      return NextResponse.json(
        { error: 'Driver not found' },
        { status: 404 }
      )
    }

    // Get query parameters
    const { searchParams } = new URL(request.url)
    const latStr = searchParams.get('latitude')
    const lonStr = searchParams.get('longitude')
    const radiusStr = searchParams.get('radius')

    if (latStr === null || lonStr === null) {
      return NextResponse.json(
        { error: 'Latitude and longitude are required' },
        { status: 400 }
      )
    }

    const latitude = Number(latStr)
    const longitude = Number(lonStr)
    const radius = radiusStr !== null ? Number(radiusStr) : 5

    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
      return NextResponse.json(
        { error: 'Latitude and longitude must be valid numbers' },
        { status: 400 }
      )
    }

    if (!Number.isFinite(radius) || radius <= 0) {
      return NextResponse.json(
        { error: 'Radius must be a positive number' },
        { status: 400 }
      )
    }

    // Get all pending rides with valid coordinates and matching gender
    const rides = await prisma.ride.findMany({
      where: {
        status: 'PENDING',
        passengers: {
          every: {
            gender: driver.gender, // Only show rides where all passengers match driver's gender
          },
        },
      },
      include: {
        passengers: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            gender: true,
          },
        },
      },
    })

    // Filter rides by distance from driver's location and sort by proximity
    const nearbyRides = rides
      .map((ride: any) => {
        const distance = calculateDistance(
          latitude,
          longitude,
          ride.pickupLatitude,
          ride.pickupLongitude
        )
        return { ...ride, distance }
      })
      .filter((r: any) => r.distance <= radius)
      .sort((a: any, b: any) => a.distance - b.distance)

    return NextResponse.json({
      rides: nearbyRides,
      count: nearbyRides.length,
    })
  } catch (error) {
    console.error('Get nearby rides error:', error)
    return NextResponse.json(
      { error: 'Failed to get nearby rides' },
      { status: 500 }
    )
  }
}