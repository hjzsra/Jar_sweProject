export const dynamic = 'force-dynamic';

// Admin live rides monitoring API
// Get all currently active rides
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyToken } from '@/lib/auth'

export async function GET(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '')
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const payload = verifyToken(token)
    if (!payload || payload.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const activeRides = await prisma.ride.findMany({
      where: {
        status: {
          in: ['ACCEPTED', 'DRIVER_ARRIVED', 'IN_PROGRESS']
        }
      },
      include: {
        driver: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            phone: true,
            currentLatitude: true,
            currentLongitude: true,
          }
        },
        passengers: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            phone: true,
          }
        },
        safetyReports: {
          where: {
            status: 'pending'
          },
          select: {
            id: true,
            reportType: true,
            description: true,
            createdAt: true,
          }
        },
        sosLogs: {
          where: {
            status: 'active'
          },
          select: {
            id: true,
            message: true,
            latitude: true,
            longitude: true,
            createdAt: true,
          }
        }
      },
      orderBy: {
        updatedAt: 'desc'
      }
    })

    return NextResponse.json({ rides: activeRides })
  } catch (error) {
    console.error('Get live rides error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch live rides' },
      { status: 500 }
    )
  }
}