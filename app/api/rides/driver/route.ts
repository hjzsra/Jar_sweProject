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
    if (!decoded || !decoded.userId || decoded.role !== 'driver') {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }
    const driverId = decoded.userId;

    const activeRide = await prisma.ride.findFirst({
      where: {
        driverId,
        status: { in: ['ACCEPTED', 'IN_PROGRESS', 'DRIVER_ARRIVED', 'STARTED'] },
      },
      include: {
        passenger: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    return NextResponse.json(activeRide);
  } catch (error) {
    console.error('Failed to fetch active ride:', error);
    return NextResponse.json({ error: 'Failed to fetch active ride' }, { status: 500 });
  }
}