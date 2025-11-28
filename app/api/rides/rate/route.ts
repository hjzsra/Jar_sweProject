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
    if (!payload || payload.role !== UserRole.USER) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { rideId, rating, comment } = await req.json();

    if (!rideId || !rating) {
      return NextResponse.json(
        { error: "Ride ID and rating are required" },
        { status: 400 }
      );
    }

    if (rating < 1 || rating > 5) {
      return NextResponse.json(
        { error: "Rating must be between 1 and 5" },
        { status: 400 }
      );
    }

    const ride = await prisma.ride.findUnique({
      where: { id: rideId },
    });

    if (!ride || ride.passengerId !== payload.userId) {
      return NextResponse.json(
        { error: "Ride not found or you are not a passenger" },
        { status: 404 }
      );
    }

    if (ride.status !== RideStatus.COMPLETED) {
      return NextResponse.json(
        { error: "You can only rate completed rides" },
        { status: 400 }
      );
    }

    // Check if the user has already rated this ride
    const existingRating = await prisma.rating.findFirst({
        where: {
            rideId: rideId,
            userId: payload.userId,
        }
    });

    if(existingRating){
        return NextResponse.json({error: "You have already rated this ride"}, {status: 400});
    }


    const newRating = await prisma.rating.create({
      data: {
        rideId,
        userId: payload.userId,
        driverId: ride.driverId,
        rating,
        comment,
      },
    });

    // Update driver's average rating
    const driverRatings = await prisma.rating.findMany({
      where: { driverId: ride.driverId },
      select: { rating: true },
    });

    const averageRating =
      driverRatings.reduce((acc, r) => acc + r.rating, 0) /
      driverRatings.length;

    await prisma.driver.update({
      where: { id: ride.driverId! },
      data: { rating: averageRating },
    });

    return NextResponse.json(newRating);
  } catch (error) {
    console.error("Error submitting rating:", error);
    return NextResponse.json(
      { error: "An unexpected error occurred." },
      { status: 500 }
    );
  }
}