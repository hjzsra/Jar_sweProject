// Get active rides for driver
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyToken } from '@/lib/auth'

export async function GET(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '')
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const decoded = verifyToken(token)
    if (!decoded || decoded.role !== 'driver') {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
    }

    const driverId = decoded.userId

    // Get active rides (accepted, driver arrived, or in progress)
    const activeRides = await prisma.ride.findMany({
      where: {
        driverId,
        status: {
          in: ['ACCEPTED', 'DRIVER_ARRIVED', 'IN_PROGRESS'],
        },
      },
      include: {
        passenger: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            phone: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    })

    return NextResponse.json({ rides: activeRides })
  } catch (error) {
    console.error('Get active rides error:', error)
    return NextResponse.json(
      { error: 'Failed to get active rides' },
      { status: 500 }
    )
  }
}
