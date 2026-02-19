// Create ride API
// Allows users to create a ride request (immediate or pre-booked)
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyToken } from '@/lib/auth'
import { calculateDistance } from '@/lib/utils'
import { PRICING } from '@/lib/constants'

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
    if (!payload || !payload.userId || payload.role !== 'user') {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const body = await request.json()
    console.log('Create ride body:', body)
    const {
      driverId, // Optional: if not provided, ride is pending for drivers to accept
      pickupLatitude,
      pickupLongitude,
      dropoffLatitude,
      dropoffLongitude,
      pickupAddress,
      dropoffAddress,
      scheduledTime,
      isPreBooked,
      paymentMethod,
      passengerIds, // Array of passenger IDs for group booking
    } = body

    // Validate input
    if (!pickupLatitude || !pickupLongitude || !dropoffLatitude || !dropoffLongitude || !pickupAddress || !dropoffAddress || !paymentMethod) {
      console.log('Validation failed:', { pickupLatitude, pickupLongitude, dropoffLatitude, dropoffLongitude, pickupAddress, dropoffAddress, paymentMethod })
      return NextResponse.json(
        { error: 'All required fields must be provided' },
        { status: 400 }
      )
    }

    // Determine passengers: either provided array or default to current user
    let passengerIdsArray: string[]
    if (passengerIds && Array.isArray(passengerIds) && passengerIds.length > 0) {
      // Group booking: validate that current user is included
      if (!passengerIds.includes(payload.userId)) {
        return NextResponse.json(
          { error: 'You must be included in the passenger list for group booking' },
          { status: 400 }
        )
      }
      passengerIdsArray = passengerIds
    } else {
      // Single passenger booking (backward compatibility)
      passengerIdsArray = [payload.userId]
    }

    // Validate passenger count
    if (passengerIdsArray.length > PRICING.MAX_PASSENGERS) {
      return NextResponse.json(
        { error: `Maximum ${PRICING.MAX_PASSENGERS} passengers allowed per ride` },
        { status: 400 }
      )
    }

    // Get all passengers
    const passengers = await prisma.user.findMany({
      where: { id: { in: passengerIdsArray } },
    })

    if (passengers.length !== passengerIdsArray.length) {
      return NextResponse.json(
        { error: 'One or more passengers not found' },
        { status: 404 }
      )
    }

    let driver: any = null
    if (driverId) {
      // Get driver
      driver = await prisma.driver.findUnique({
        where: { id: driverId },
      })

      if (!driver) {
        return NextResponse.json(
          { error: 'Driver not found' },
          { status: 404 }
        )
      }

      // Gender matching: All passengers must be same gender as driver
      const mismatchedPassengers = passengers.filter((p: any) => p.gender !== driver!.gender)
      if (mismatchedPassengers.length > 0) {
        return NextResponse.json(
          { error: 'Gender mismatch. All passengers must be the same gender as the driver.' },
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
    }

    // Calculate distance and cost (simple calculation - 1km = $1)
    const distance = calculateDistance(
      pickupLatitude,
      pickupLongitude,
      dropoffLatitude,
      dropoffLongitude
    )

    // Validate distance limits
    if (distance < PRICING.MIN_DISTANCE_KM) {
      return NextResponse.json(
        { error: `Ride distance must be at least ${PRICING.MIN_DISTANCE_KM} km` },
        { status: 400 }
      )
    }

    if (distance > PRICING.MAX_DISTANCE_KM) {
      return NextResponse.json(
        { error: `Ride distance cannot exceed ${PRICING.MAX_DISTANCE_KM} km` },
        { status: 400 }
      )
    }

    const baseCost = distance * PRICING.BASE_RATE_PER_KM

    // Cost splitting: Divide total cost among all passengers
    const passengerCount = passengers.length
    const costPerPassenger = baseCost / passengerCount


    const paymentMethodUpper = paymentMethod.toUpperCase().replace(' ', '_');

    // Validate scheduled time if pre-booked
    let scheduledDate: Date | null = null
    if (isPreBooked && scheduledTime) {
      scheduledDate = new Date(scheduledTime)
      const now = new Date()
      const minTime = new Date(now.getTime() + PRICING.MIN_SCHEDULE_AHEAD_MINUTES * 60 * 1000)

      if (scheduledDate <= minTime) {
        return NextResponse.json(
          { error: `Scheduled time must be at least ${PRICING.MIN_SCHEDULE_AHEAD_MINUTES} minutes in the future` },
          { status: 400 }
        )
      }

      const maxTime = new Date(now.getTime() + PRICING.MAX_SCHEDULE_AHEAD_DAYS * 24 * 60 * 60 * 1000)
      if (scheduledDate > maxTime) {
        return NextResponse.json(
          { error: `Scheduled time cannot be more than ${PRICING.MAX_SCHEDULE_AHEAD_DAYS} days in the future` },
          { status: 400 }
        )
      }
    }

    // Create ride request (not a confirmed ride yet)
    const ride = await prisma.ride.create({
      data: {
        passengers: {
          connect: passengerIdsArray.map(id => ({ id })),
        },
        pickupLatitude,
        pickupLongitude,
        dropoffLatitude,
        dropoffLongitude,
        pickupAddress,
        dropoffAddress,
        scheduledTime: scheduledDate,
        isPreBooked: isPreBooked || false,
        paymentMethod: paymentMethodUpper as any,
        cost: baseCost,
        costPerPassenger,
        status: 'PENDING', // Ride starts as pending for driver acceptance
      } as any,
    })

    console.log('Ride request created:', ride.id, 'status:', ride.status)

    // Find nearby available drivers and create ride requests
    const nearbyDrivers = await prisma.driver.findMany({
      where: {
        isAvailable: true,
        // Add location-based filtering (simplified - in real app would use geospatial queries)
        // For now, just get all available drivers
      },
      take: 10, // Limit to 10 nearest drivers
    })

    // Create ride requests for nearby drivers
    const rideRequests = nearbyDrivers.map(driver => ({
      rideId: ride.id,
      driverId: driver.id,
    }))

    if (rideRequests.length > 0) {
      await prisma.rideRequest.createMany({
        data: rideRequests,
      })
      console.log(`Created ${rideRequests.length} ride requests for ride ${ride.id}`)
    }

    // Note: Ride expiration is now handled by a background cron job
    // See scripts/cleanup-expired-rides.js for the implementation
    console.log(`Ride ${ride.id} created. Background job will handle expiration.`)

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