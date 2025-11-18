// Rate ride and driver API
// User can rate the ride and driver after trip completion
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
    if (!payload || payload.role !== 'user') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { rideId, rideRating, driverRating, comment } = body

    if (!rideId || !rideRating || !driverRating) {
      return NextResponse.json(
        { error: 'Ride ID, ride rating, and driver rating are required' },
        { status: 400 }
      )
    }

    // Validate ratings (1-5)
    if (rideRating < 1 || rideRating > 5 || driverRating < 1 || driverRating > 5) {
      return NextResponse.json(
        { error: 'Ratings must be between 1 and 5' },
        { status: 400 }
      )
    }

    // Get ride
    const ride = await prisma.ride.findUnique({
      where: { id: rideId },
      include: { driver: true },
    })

    if (!ride) {
      return NextResponse.json({ error: 'Ride not found' }, { status: 404 })
    }

    if (ride.passengerId !== payload.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    if (ride.status !== 'completed') {
      return NextResponse.json(
        { error: 'Can only rate completed rides' },
        { status: 400 }
      )
    }

    // Check if already rated
    const existingRating = await prisma.rating.findFirst({
      where: {
        rideId,
        userId: payload.userId,
      },
    })

    if (existingRating) {
      return NextResponse.json(
        { error: 'Ride already rated' },
        { status: 400 }
      )
    }

    // Create rating
    await prisma.rating.create({
      data: {
        rideId,
        userId: payload.userId,
        driverId: ride.driverId,
        rideRating,
        driverRating,
        comment: comment || null,
      },
    })

    // Update driver average rating
    const allRatings = await prisma.rating.findMany({
      where: { driverId: ride.driverId },
    })

    const averageRating =
      allRatings.reduce((sum, r) => sum + r.driverRating, 0) / allRatings.length

    await prisma.driver.update({
      where: { id: ride.driverId },
      data: {
        averageRating,
        totalRatings: allRatings.length,
      },
    })

    return NextResponse.json({
      message: 'Rating submitted successfully',
    })
  } catch (error) {
    console.error('Rate ride error:', error)
    return NextResponse.json({ error: 'Failed to submit rating' }, { status: 500 })
  }
}

