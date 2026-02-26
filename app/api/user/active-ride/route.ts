// Get active ride for user
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyToken } from '@/lib/auth'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '')
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const decoded = verifyToken(token)
    if (!decoded || decoded.role !== 'user') {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
    }

    const userId = decoded.userId
    console.log('Getting active ride for user:', userId)

    // Get active ride (not completed or cancelled)
    const activeRide = await prisma.ride.findFirst({
      where: {
        passengers: {
          some: {
            id: userId,
          },
        },
        status: {
          in: ['PENDING', 'ACCEPTED', 'DRIVER_ARRIVED', 'IN_PROGRESS'],
        },
      },
      include: {
        driver: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            phone: true,
          },
        },
        passengers: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    })

    // Get vehicle information if driver exists
    let vehicle = null
    if (activeRide?.driverId) {
      vehicle = await prisma.vehicle.findFirst({
        where: { driverId: activeRide.driverId, isActive: true },
        select: {
          make: true,
          model: true,
          color: true,
          licensePlate: true,
        },
      })
    }

    console.log('Active ride found:', activeRide?.id, 'status:', activeRide?.status)
    return NextResponse.json({ ride: activeRide, vehicle })
  } catch (error) {
    console.error('Get active ride error:', error)
    return NextResponse.json(
      { error: 'Failed to get active ride' },
      { status: 500 }
    )
  }
}
