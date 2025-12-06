// Get ride details by ID
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyToken } from '@/lib/auth'

export async function GET(
  request: NextRequest,
  { params }: { params: { rideId: string } }
) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '')
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const decoded = verifyToken(token)
    if (!decoded) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
    }

    const { rideId } = params
    console.log('Fetching ride:', rideId, 'for user:', decoded.userId)

    const ride = await prisma.ride.findUnique({
      where: { id: rideId },
      include: {
        driver: true,
        passengers: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
    })

    if (!ride) {
      console.log('Ride not found:', rideId)
      return NextResponse.json({ error: 'Ride not found' }, { status: 404 })
    }

    // Check if user is authorized to view this ride
    const isPassenger = (ride as any).passengers.some((p: any) => p.id === decoded.userId)
    const isAssignedDriver = ride.driverId === decoded.userId

    if (!isPassenger && !isAssignedDriver) {
      console.log('User not authorized to view ride:', decoded.userId, 'isPassenger:', isPassenger, 'isAssignedDriver:', isAssignedDriver)
      return NextResponse.json({ error: 'Unauthorized to view this ride' }, { status: 403 })
    }

    console.log('Ride found and user authorized, status:', ride.status)

    // Get driver's current location if available
    let driverLocation = null
    let vehicle = null
    if (ride.driverId) {
      driverLocation = await prisma.driverLocation.findUnique({
        where: { driverId: ride.driverId },
      })

      // Get driver's vehicle information (stored directly on driver)
      if ((ride as any).driver) {
        vehicle = {
          make: (ride as any).driver.carModel?.split(' ')[0] || 'N/A',
          model: (ride as any).driver.carModel?.split(' ').slice(1).join(' ') || 'N/A',
          color: (ride as any).driver.carColor || 'N/A',
          licensePlate: (ride as any).driver.carPlateNumber || 'N/A',
        }
      }
    }

    return NextResponse.json({
      ride,
      driverLocation,
      vehicle,
    })
  } catch (error) {
    console.error('Get ride error:', error)
    return NextResponse.json(
      { error: 'Failed to get ride' },
      { status: 500 }
    )
  }
}
