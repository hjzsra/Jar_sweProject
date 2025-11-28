import { NextRequest, NextResponse } from "next/server";
import { verifyToken } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { RideStatus, UserRole } from "@prisma/client";

export async function POST(req: NextRequest) {
  try {
    const token = req.headers.get('authorization')?.replace('Bearer ', '');
    if (!token) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const payload = verifyToken(token);
    if (!payload || payload.role !== UserRole.DRIVER) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { rideId } = await req.json();

    if (!rideId) {
      return NextResponse.json({ error: "Ride ID is required" }, { status: 400 });
    }

    const ride = await prisma.ride.findFirst({
      where: {
        id: rideId,
        driverId: payload.userId,
      },
    });

    if (!ride) {
      return NextResponse.json({ error: "Ride not found or you are not the driver" }, { status: 404 });
    }

    if (ride.status !== RideStatus.ACCEPTED) {
      return NextResponse.json(
        { error: `Ride cannot be started. Current status: ${ride.status}` },
        { status: 400 }
      );
    }

    const updatedRide = await prisma.ride.update({
      where: {
        id: rideId,
      },
      data: {
        status: RideStatus.IN_PROGRESS,
      },
    });

    return NextResponse.json(updatedRide);
  } catch (error) {
    console.error("Error starting ride:", error);
    return NextResponse.json(
      { error: "An unexpected error occurred." },
      { status: 500 }
    );
  }
}