// Driver update location API
// Driver updates their current location
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
    const { latitude, longitude, isAvailable } = body

    if (!latitude || !longitude) {
      return NextResponse.json(
        { error: 'Latitude and longitude are required' },
        { status: 400 }
      )
    }

    const driver = await prisma.driver.update({
      where: { id: payload.userId },
      data: {
        currentLatitude: latitude,
        currentLongitude: longitude,
        ...(isAvailable !== undefined && { isAvailable }),
      },
    })

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
    console.error('Update location error:', error)
    return NextResponse.json(
      { error: 'Failed to update location' },
      { status: 500 }
    )
  }
}

