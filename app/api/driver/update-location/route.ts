// Driver update location API
// Driver updates their current location
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyToken } from '@/lib/auth'

export async function POST(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '')
    if (!token) {
      console.log('❌ No token provided')
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const payload = verifyToken(token)
    if (!payload || payload.role !== 'driver') {
      console.log('❌ Invalid token or role')
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { latitude, longitude, isAvailable } = body

    console.log('📍 Update location request:', { 
      driverId: payload.userId, 
      latitude, 
      longitude, 
      isAvailable 
    })

    if (!latitude || !longitude) {
      return NextResponse.json(
        { error: 'Latitude and longitude are required' },
        { status: 400 }
      )
    }

    // First check if driver exists
    const existingDriver = await prisma.driver.findUnique({
      where: { id: payload.userId },
    })

    if (!existingDriver) {
      console.error('❌ Driver not found in database:', payload.userId)
      return NextResponse.json(
        { error: 'Driver account not found. Please login again.' },
        { status: 404 }
      )
    }

    console.log('✅ Driver found, updating location')

    // Update driver location
    const driver = await prisma.driver.update({
      where: { id: payload.userId },
      data: {
        currentLatitude: latitude,
        currentLongitude: longitude,
        ...(isAvailable !== undefined && { isAvailable }),
      },
    })

    console.log('✅ Location updated successfully')

    return NextResponse.json({
      message: 'Location updated',
      driver: {
        id: driver.id,
        currentLatitude: driver.currentLatitude,
        currentLongitude: driver.currentLongitude,
        isAvailable: driver.isAvailable,
      },
    })
  } catch (error) {
    console.error('❌ Update location error:', error)
    return NextResponse.json(
      { error: 'Failed to update location' },
      { status: 500 }
    )
  }
}