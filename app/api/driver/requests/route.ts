export const dynamic = 'force-dynamic';

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

    console.log('📍 Fetching ride requests for driver:', payload.userId)

    // Get driver location
    const driver = await prisma.driver.findUnique({
      where: { id: payload.userId },
    })

    if (!driver) {
      console.log('❌ Driver not found')
      return NextResponse.json(
        { error: 'Driver not found' },
        { status: 404 }
      )
    }

    if (!driver.currentLatitude || !driver.currentLongitude) {
      console.log('❌ Driver location not set')
      return NextResponse.json(
        { error: 'Driver location not set. Please enable location in dashboard.' },
        { status: 400 }
      )
    }

    console.log('✅ Driver location:', {
      lat: driver.currentLatitude,
      lng: driver.currentLongitude,
      gender: driver.gender
    })

    // Get query parameters
    const { searchParams } = new URL(request.url)
    const radius = parseFloat(searchParams.get('radius') || '5') // Default 5km

    // Get ride requests for this driver
    const rideRequests = await prisma.rideRequest.findMany({
      where: {
        driverId: payload.userId,
        status: 'PENDING', // Only show pending requests for this driver
      },
      include: {
        ride: {
          include: {
            passengers: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                phone: true,
                gender: true,
              },
            },
          },
        },
      },
    })

    console.log(`📋 Found ${rideRequests.length} ride requests`)

    // Add distance if driver location is set
    const requestsWithDistance = rideRequests.map((request: any) => {
      let distance = null
      if (driver.currentLatitude && driver.currentLongitude) {
        distance = calculateDistance(
          driver.currentLatitude,
          driver.currentLongitude,
          request.ride.pickupLatitude,
          request.ride.pickupLongitude
        )
      }
      return {
        ...request.ride,
        distance,
      }
    }).sort((a: any, b: any) => (a.distance || 0) - (b.distance || 0))

    console.log(`✅ Returning ${requestsWithDistance.length} ride requests`)

    return NextResponse.json({
      requests: requestsWithDistance,
      count: requestsWithDistance.length,
    })
  } catch (error) {
    console.error('❌ Get driver requests error:', error)
    return NextResponse.json(
      { error: 'Failed to get ride requests' },
      { status: 500 }
    )
  }
}
