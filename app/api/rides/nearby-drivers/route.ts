// Get nearby drivers API
// Returns available drivers within a specified radius
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
    if (!payload || payload.role !== 'user') {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Get user to check gender
    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
    })

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
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

    // Get all available drivers with same gender and valid coordinates
    const drivers = await prisma.driver.findMany({
      where: {
        isAvailable: true,
        gender: user.gender, // Only show drivers of same gender
        licenseVerified: true,
        currentLatitude: { not: null },
        currentLongitude: { not: null },
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        currentLatitude: true,
        currentLongitude: true,
        isAvailable: true,
        averageRating: true,
        carModel: true,
        carColor: true,
        carPlateNumber: true,
        gender: true,
      },
    })

    // Filter drivers by distance and sort by proximity
    const nearbyDrivers = drivers
      .map((driver) => {
        if (
          driver.currentLatitude === null ||
          driver.currentLongitude === null
        ) {
          return null
        }
        const distance = calculateDistance(
          latitude,
          longitude,
          driver.currentLatitude,
          driver.currentLongitude
        )
        return { ...driver, distance }
      })
      .filter((d): d is typeof drivers[number] & { distance: number } => d !== null && d.distance <= radius)
      .sort((a, b) => a.distance - b.distance)

    return NextResponse.json({
      drivers: nearbyDrivers,
      count: nearbyDrivers.length,
    })
  } catch (error) {
    console.error('Get nearby drivers error:', error)
    return NextResponse.json(
      { error: 'Failed to get nearby drivers' },
      { status: 500 }
    )
  }
}
