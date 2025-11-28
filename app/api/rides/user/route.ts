import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyToken } from '@/lib/auth';

export async function GET(req: NextRequest) {
  const token = req.headers.get('authorization')?.replace('Bearer ', '');

  if (!token) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  }

  try {
    const decoded = verifyToken(token);
    if (!decoded || !decoded.userId) {
        return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }
    const userId = decoded.userId;

    const activeRide = await prisma.ride.findFirst({
      where: {
        passengerId: userId,
        status: { in: ['PENDING', 'ACCEPTED', 'DRIVER_ARRIVED', 'IN_PROGRESS', 'STARTED'] },
      },
      include: {
        driver: {
          include: {
            car: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    if (!activeRide) {
      return NextResponse.json(null); // No active ride
    }

    // We don't want to expose all driver details
    const { driver } = activeRide;
    const driverInfo = driver ? {
      id: driver.id,
      firstName: driver.firstName,
      lastName: driver.lastName,
      rating: driver.rating,
      currentLat: driver.currentLat,
      currentLng: driver.currentLng,
      car: driver.car ? {
        plateNumber: driver.car.plateNumber,
        color: driver.car.color,
        type: driver.car.type,
      } : null,
    } : null;


    const response = {
      ...activeRide,
      driver: driverInfo,
    };


    return NextResponse.json(response);
  } catch (error) {
    console.error('Failed to fetch user ride:', error);
    return NextResponse.json({ error: 'Failed to fetch user ride' }, { status: 500 });
  }
}