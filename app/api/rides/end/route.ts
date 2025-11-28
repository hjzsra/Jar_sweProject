import { NextRequest, NextResponse } from "next/server";
import { verifyToken } from "@/lib/auth";
import { prisma } from '@/lib/prisma';
import { RideStatus, UserRole } from "@prisma/client";

export async function POST(req: NextRequest) {
  try {
    const token = req.headers.get('authorization')?.replace('Bearer ', '');
    if (!token) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const user = await verifyToken(token);
    if (!user || (user.role !== UserRole.DRIVER && user.role !== UserRole.ADMIN)) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { rideId } = await req.json();

    if (!rideId) {
      return NextResponse.json({ error: 'Ride ID is required' }, { status: 400 });
    }

    const ride = await prisma.ride.findUnique({
      where: { id: rideId },
    });

    if (!ride) {
      return NextResponse.json({ error: 'Ride not found' }, { status: 404 });
    }

    if (ride.status !== RideStatus.IN_PROGRESS) {
      return NextResponse.json({ error: 'Ride is not in progress' }, { status: 400 });
    }

    // In a real-world scenario, you might want to add more validation
    // e.g., check if the driver ending the ride is the one assigned to it.

    const updatedRide = await prisma.ride.update({
      where: { id: rideId },
      data: {
        status: RideStatus.COMPLETED,
        endTime: new Date(),
      },
    });

    // You might want to trigger other events here, like calculating the final fare,
    // notifying the user, etc.

    return NextResponse.json(updatedRide);
  } catch (error) {
    console.error('Error ending ride:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}