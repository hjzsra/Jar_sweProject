// Driver end trip API
// Driver confirms trip has ended
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
    if (!payload || payload.role !== 'driver') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { rideId, passengerId } = body

    if (!rideId) {
      return NextResponse.json({ error: 'Ride ID is required' }, { status: 400 })
    }

    const ride = await prisma.ride.findUnique({
      where: { id: rideId },
      include: { passengers: true }
    })
    if (!ride) {
      return NextResponse.json({ error: 'Ride not found' }, { status: 404 })
    }

    if (ride.driverId !== payload.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    if (ride.status !== 'IN_PROGRESS') {
      return NextResponse.json(
        { error: 'Trip must be in progress' },
        { status: 400 }
      )
    }

    // If ending for a specific passenger
    if (passengerId) {
      // Verify passenger is part of this ride
      const passengerExists = ride.passengers.some((p: any) => p.id === passengerId)
      if (!passengerExists) {
        return NextResponse.json({ error: 'Passenger not found in this ride' }, { status: 404 })
      }

      // Create a ride event for individual passenger completion
      await prisma.rideEvent.create({
        data: {
          rideId: rideId,
          type: 'PASSENGER_COMPLETED',
          metadata: { passengerId },
        },
      })

      // Process payment for this passenger if Apple Pay
      if (ride.paymentMethod === 'APPLE_PAY') {
        await prisma.user.update({
          where: { id: passengerId },
          data: {
            walletBalance: {
              decrement: ride.costPerPassenger,
            },
          } as any,
        })
      }

      // Check if all passengers are completed
      const completedEvents = await prisma.rideEvent.findMany({
        where: {
          rideId: rideId,
          type: 'PASSENGER_COMPLETED',
        },
      })

      if (completedEvents.length >= ride.passengers.length) {
        // All passengers completed, mark ride as fully completed
        await prisma.ride.update({
          where: { id: rideId },
          data: {
            status: 'COMPLETED',
            tripEndedAt: new Date(),
            paymentStatus: 'PAID', // All payments processed
          },
        })

        // Add earnings to driver and set back to available
        const driverEarnings = ride.costPerPassenger // Driver earns the full passenger fare
        await prisma.driver.update({
          where: { id: payload.userId },
          data: {
            totalEarnings: { increment: driverEarnings },
            availableBalance: { increment: driverEarnings },
            isAvailable: true,
          } as any,
        })
      }

      return NextResponse.json({
        message: 'Passenger trip completed',
        passengerId,
      })
    } else {
      // Complete entire ride (legacy behavior)
      const updatedRide = await prisma.ride.update({
        where: { id: rideId },
        data: {
          status: 'COMPLETED',
          tripEndedAt: new Date(),
          paymentStatus:
            ride.paymentMethod === 'APPLE_PAY'
              ? 'PAID'
              : 'PENDING',
        },
      })

      // If Apple Pay, deduct from all passengers' wallets
      if (ride.paymentMethod === 'APPLE_PAY') {
        for (const passenger of ride.passengers) {
          await prisma.user.update({
            where: { id: passenger.id },
            data: {
              walletBalance: {
                decrement: ride.costPerPassenger,
              },
            } as any,
          })
        }
      }

      // Set driver back to available
      await prisma.driver.update({
        where: { id: payload.userId },
        data: { isAvailable: true },
      })

      return NextResponse.json({
        message: 'Trip completed',
        ride: updatedRide,
      })
    }
  } catch (error) {
    console.error('End trip error:', error)
    return NextResponse.json({ error: 'Failed to end trip' }, { status: 500 })
  }
}