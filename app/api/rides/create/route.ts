// Create ride API
// Allows users to create a ride request (immediate or pre-booked)
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyToken } from '@/lib/auth'
import { calculateDistance } from '@/lib/utils'

export async function POST(request: NextRequest) {
  try {
    // Verify authentication
    const token = request.headers.get('authorization')?.replace('Bearer ', '')
    if (!token) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const payload = verifyToken(token)
    if (!payload || payload.role !== 'user') {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const {
      driverId,
      pickupLatitude,
      pickupLongitude,
      dropoffLatitude,
      dropoffLongitude,
      pickupAddress,
      dropoffAddress,
      scheduledTime,
      isPreBooked,
      paymentMethod,
    } = body

    // Validate input
    if (!driverId || !pickupLatitude || !pickupLongitude || !dropoffLatitude || !dropoffLongitude || !pickupAddress || !dropoffAddress || !paymentMethod) {
      return NextResponse.json(
        { error: 'All required fields must be provided' },
        { status: 400 }
      )
    }

    // Get user to check gender
    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
    })

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    // Get driver and verify gender match
    const driver = await prisma.driver.findUnique({
      where: { id: driverId },
    })

    if (!driver) {
      return NextResponse.json(
        { error: 'Driver not found' },
        { status: 404 }
      )
    }

    // Check gender match (male can only book with male, female with female)
    if (user.gender !== driver.gender) {
      return NextResponse.json(
        { error: 'Gender mismatch. You can only book rides with drivers of the same gender.' },
        { status: 400 }
      )
    }

    // Check if driver is available
    if (!driver.isAvailable) {
      return NextResponse.json(
        { error: 'Driver is not available' },
        { status: 400 }
      )
    }

    // Calculate distance and cost (simple calculation - 1km = $1)
    const distance = calculateDistance(
      pickupLatitude,
      pickupLongitude,
      dropoffLatitude,
      dropoffLongitude
    )
    const baseCost = distance * 1.0 // $1 per km
    
    // Cost splitting: Currently supports single passenger per ride
    // To support multiple passengers sharing a ride, we would need to:
    // 1. Modify schema to support many-to-many relationship (RidePassengers table)
    // 2. Count total passengers and divide baseCost by passenger count
    // For now, costPerPassenger equals baseCost (single passenger)
    const costPerPassenger = baseCost

    // Create ride
    const ride = await prisma.ride.create({
      data: {
        driverId,
        passengerId: payload.userId,
        pickupLatitude,
        pickupLongitude,
        dropoffLatitude,
        dropoffLongitude,
        pickupAddress,
        dropoffAddress,
        scheduledTime: isPreBooked && scheduledTime ? new Date(scheduledTime) : null,
        isPreBooked: isPreBooked || false,
        paymentMethod,
        cost: baseCost,
        costPerPassenger,
        status: 'pending',
      },
    })

    return NextResponse.json({
      message: 'Ride request created successfully',
      ride,
    })
  } catch (error) {
    console.error('Create ride error:', error)
    return NextResponse.json(
      { error: 'Failed to create ride' },
      { status: 500 }
    )
  }
}

