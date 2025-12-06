// User trip history API
// Get user's previous trip history
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

    const payload = verifyToken(token)
    if (!payload || payload.role !== 'user') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const rides = await prisma.ride.findMany({
      where: {
        passengers: {
          some: {
            id: payload.userId,
          },
        },
      },
      include: {
        driver: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            averageRating: true,
          },
        },
        ratings: {
          where: { userId: payload.userId },
        },
      },
      orderBy: { createdAt: 'desc' },
    })

    // Add vehicle information to each ride
    const ridesWithVehicles = await Promise.all(
      rides.map(async (ride) => {
        if (ride.driverId) {
          const vehicle = await prisma.vehicle.findFirst({
            where: { driverId: ride.driverId },
            select: {
              make: true,
              model: true,
              color: true,
              licensePlate: true,
            },
          })
          return { ...ride, vehicle }
        }
        return ride
      })
    )

    return NextResponse.json({ rides: ridesWithVehicles })
  } catch (error) {
    console.error('Get trip history error:', error)
    return NextResponse.json({ error: 'Failed to get trip history' }, { status: 500 })
  }
}

