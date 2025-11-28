import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyToken } from '@/lib/auth';
import { z } from 'zod';




const acceptRideSchema = z.object({
  rideRequestId: z.string(),
});

export async function POST(req: NextRequest) {
  const token = req.headers.get('authorization')?.replace('Bearer ', '');

  if (!token) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  }

  try {
    const decoded = verifyToken(token);
    if (!decoded || !decoded.userId || decoded.role !== 'driver') {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }
    const driverId = decoded.userId;

    const body = await req.json();
    const validation = acceptRideSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json({ error: validation.error.errors }, { status: 400 });
    }

    const { rideRequestId } = validation.data;

    const driver = await prisma.driver.findUnique({
      where: { id: driverId },
    });

    if (!driver) {
      return NextResponse.json({ error: 'Driver not found' }, { status: 404 });
    }

    const ride = await prisma.ride.findUnique({
      where: { id: rideRequestId },
    });

    if (!ride || ride.status !== 'PENDING') {
      return NextResponse.json({ error: 'Ride not found or already accepted' }, { status: 404 });
    }

    // Check for gender preference
    if (ride.genderPreference !== 'NONE' && ride.genderPreference !== driver.gender) {
      return NextResponse.json({ error: 'Gender preference does not match' }, { status: 403 });
    }

    const updatedRide = await prisma.ride.update({
      where: { id: rideRequestId },
      data: {
        driverId: driverId,
        status: 'ACCEPTED',
      },
      include: {
        passenger: true,
        driver: true,
      }
    });

    return NextResponse.json(updatedRide);
  } catch (error) {
    console.error('Failed to accept ride:', error);
    return NextResponse.json({ error: 'Failed to accept ride' }, { status: 500 });
  }
}