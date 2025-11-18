// Admin dashboard API
// Get all data for admin dashboard
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

    // Get all statistics
    const [
      totalUsers,
      totalDrivers,
      totalRides,
      activeRides,
      totalRevenue,
      supportTickets,
    ] = await Promise.all([
      prisma.user.count(),
      prisma.driver.count(),
      prisma.ride.count(),
      prisma.ride.count({
        where: {
          status: {
            in: ['pending', 'accepted', 'driver_arrived', 'in_progress'],
          },
        },
      }),
      prisma.ride.aggregate({
        where: { status: 'completed', paymentStatus: 'completed' },
        _sum: { cost: true },
      }),
      prisma.supportTicket.count({
        where: { status: 'open' },
      }),
    ])

    // Get recent rides
    const recentRides = await prisma.ride.findMany({
      take: 10,
      orderBy: { createdAt: 'desc' },
      include: {
        driver: {
          select: {
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        passenger: {
          select: {
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
    })

    return NextResponse.json({
      stats: {
        totalUsers,
        totalDrivers,
        totalRides,
        activeRides,
        totalRevenue: totalRevenue._sum.cost || 0,
        openSupportTickets: supportTickets,
      },
      recentRides,
    })
  } catch (error) {
    console.error('Admin dashboard error:', error)
    return NextResponse.json(
      { error: 'Failed to get dashboard data' },
      { status: 500 }
    )
  }
}

