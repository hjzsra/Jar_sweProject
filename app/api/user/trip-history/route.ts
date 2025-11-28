// User trip history API
// Get user's previous trip history
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyToken } from '@/lib/auth'
import { UserRole } from '@prisma/client'

export async function GET(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '')
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const payload = verifyToken(token)
    if (!payload || payload.role !== UserRole.USER) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const rides = await prisma.ride.findMany({
      where: { passengerId: payload.userId },
      include: {
        driver: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            carModel: true,
            carColor: true,
            carPlateNumber: true,
            averageRating: true,
          },
        },
        ratings: {
          where: { passengerId: payload.userId },
          select: {
            rating: true,
            comment: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    })

    const ridesWithDriverDetails = rides.map(ride => {
      const driverDetails = {
        id: ride.driver.id,
        name: `${ride.driver.firstName} ${ride.driver.lastName}`,
        car: {
          model: ride.driver.carModel,
          color: ride.driver.carColor,
          plateNumber: ride.driver.carPlateNumber,
        },
        rating: ride.driver.averageRating,
      }

      return {
        ...ride,
        driver: driverDetails,
        rating: ride.ratings.length > 0 ? ride.ratings[0] : null,
      }
    })

    return NextResponse.json({ rides: ridesWithDriverDetails })
  } catch (error) {
    console.error('Get trip history error:', error)
    return NextResponse.json({ error: 'Failed to get trip history' }, { status: 500 })
  }
}