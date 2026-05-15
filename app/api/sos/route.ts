// SOS emergency API
// Allow users to trigger emergency alerts during rides
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
    if (!payload || !payload.userId || payload.role !== 'user') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { rideId, message, latitude, longitude } = await request.json()

    if (!rideId) {
      return NextResponse.json(
        { error: 'Ride ID is required' },
        { status: 400 }
      )
    }

    // Verify user is on this ride
    const ride = await prisma.ride.findFirst({
      where: {
        id: rideId,
        passengers: {
          some: { id: payload.userId }
        },
        status: {
          in: ['ACCEPTED', 'DRIVER_ARRIVED', 'IN_PROGRESS']
        }
      }
    })

    if (!ride) {
      return NextResponse.json(
        { error: 'Ride not found or user not authorized' },
        { status: 404 }
      )
    }

    // Check if there's already an active SOS for this ride
    const existingSOS = await prisma.sOSSLog.findFirst({
      where: {
        rideId,
        userId: payload.userId,
        status: 'active'
      }
    })

    if (existingSOS) {
      return NextResponse.json(
        { error: 'SOS already active for this ride' },
        { status: 400 }
      )
    }

    // Create SOS log
    const sosLog = await prisma.sOSSLog.create({
      data: {
        userId: payload.userId,
        rideId,
        message: message || null,
        latitude: latitude || null,
        longitude: longitude || null,
      }
    })

    // TODO: Send emergency notifications to authorities/admin
    // This would integrate with emergency services, send SMS to admin, etc.

    return NextResponse.json({
      message: 'SOS alert sent successfully',
      sosId: sosLog.id
    })
  } catch (error) {
    console.error('SOS error:', error)
    return NextResponse.json(
      { error: 'Failed to send SOS alert' },
      { status: 500 }
    )
  }
}

// Get SOS status for a ride (for users to check)
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
      return NextResponse.json(
        { error: 'Ride ID is required' },
        { status: 400 }
      )
    }

    const sosLogs = await prisma.sOSSLog.findMany({
      where: {
        rideId,
        userId: payload.userId,
      },
      orderBy: {
        createdAt: 'desc'
      },
      take: 5
    })

    return NextResponse.json({ sosLogs })
  } catch (error) {
    console.error('Get SOS logs error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch SOS logs' },
      { status: 500 }
    )
  }
}