// Admin manual ride management API
// Force complete or cancel stuck rides
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
    if (!payload || payload.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { rideId, action, reason } = await request.json()

    if (!rideId || !['complete', 'cancel'].includes(action)) {
      return NextResponse.json(
        { error: 'Invalid request data' },
        { status: 400 }
      )
    }

    const ride = await prisma.ride.findUnique({
      where: { id: rideId },
      include: {
        driver: true,
        passengers: true,
      }
    })

    if (!ride) {
      return NextResponse.json(
        { error: 'Ride not found' },
        { status: 404 }
      )
    }

    if (ride.status === 'COMPLETED' || ride.status === 'CANCELLED') {
      return NextResponse.json(
        { error: 'Ride is already completed or cancelled' },
        { status: 400 }
      )
    }

    const updateData: any = {
      updatedAt: new Date(),
    }

    if (action === 'complete') {
      updateData.status = 'COMPLETED'
      updateData.tripEndedAt = new Date()
      updateData.paymentStatus = 'PAID'
      updateData.rejectionReason = `Force completed by admin: ${reason || 'System issue'}`
    } else if (action === 'cancel') {
      updateData.status = 'CANCELLED'
      updateData.rejectionReason = `Force cancelled by admin: ${reason || 'System issue'}`
    }

    await prisma.ride.update({
      where: { id: rideId },
      data: updateData
    })

    // Create ride event log
    await prisma.rideEvent.create({
      data: {
        rideId,
        type: `admin_${action}`,
        metadata: {
          adminId: payload.userId,
          reason: reason || 'System issue',
          previousStatus: ride.status,
        }
      }
    })

    return NextResponse.json({
      message: `Ride ${action}d successfully`
    })
  } catch (error) {
    console.error('Ride management error:', error)
    return NextResponse.json(
      { error: 'Failed to manage ride' },
      { status: 500 }
    )
  }
}