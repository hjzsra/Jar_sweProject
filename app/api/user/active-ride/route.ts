// Get active ride for user
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
    if (!decoded || decoded.role !== 'user') {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
    }

    const userId = decoded.userId

    // Get active ride (not completed or cancelled)
    const activeRide = await prisma.ride.findFirst({
      where: {
        passengerId: userId,
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
            carModel: true,
            carColor: true,
            carPlateNumber: true,
            phone: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    })

    return NextResponse.json({ ride: activeRide })
  } catch (error) {
    console.error('Get active ride error:', error)
    return NextResponse.json(
      { error: 'Failed to get active ride' },
      { status: 500 }
    )
  }
}
