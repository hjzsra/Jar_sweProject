import { NextRequest, NextResponse } from "next/server";
import { verifyToken } from "@/lib/auth";
import { prisma } from '@/lib/prisma';
import { RideStatus, UserRole, Rating } from "@prisma/client";

export async function POST(req: NextRequest) {
  try {
    const token = req.headers.get('authorization')?.replace('Bearer ', '');
    if (!token) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const user = await verifyToken(token);
    if (!user) {
        return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    const { rideId, rating, comment } = await req.json();

    if (!rideId || !rating) {
      return NextResponse.json({ error: 'Ride ID and rating are required' }, { status: 400 });
    }

    if (rating < 1 || rating > 5) {
      return NextResponse.json({ error: 'Rating must be between 1 and 5' }, { status: 400 });
    }

    const ride = await prisma.ride.findUnique({
      where: { id: rideId },
    });

    if (!ride) {
      return NextResponse.json({ error: 'Ride not found' }, { status: 404 });
    }

    // Check if the user was part of the ride (either as user or driver)
    if (ride.userId !== user.id && ride.driverId !== user.id) {
      return NextResponse.json({ error: 'You can only rate rides you were part of' }, { status: 403 });
    }

    // Check if the ride is completed
    if (ride.status !== RideStatus.COMPLETED) {
      return NextResponse.json({ error: 'You can only rate completed rides' }, { status: 400 });
    }

    // Determine who is being rated
    let ratedUserId: string;
    let ratedUserRole: UserRole;

    if (user.role === UserRole.USER) {
      // User is rating the driver
      if (!ride.driverId) {
        return NextResponse.json({ error: 'No driver assigned to this ride to rate' }, { status: 400 });
      }
      ratedUserId = ride.driverId;
      ratedUserRole = UserRole.DRIVER;
    } else if (user.role === UserRole.DRIVER) {
      // Driver is rating the user
      ratedUserId = ride.userId;
      ratedUserRole = UserRole.USER;
    } else {
      return NextResponse.json({ error: 'Admins cannot rate rides' }, { status: 403 });
    }

    const newRating = await prisma.rating.create({
      data: {
        rideId,
        ratedById: user.id,
        ratedUserId,
        rating,
        comment,
      },
    });

    // Optionally, update the average rating for the rated user
    // This could be done in a separate, asynchronous job for performance
    const allRatings = await prisma.rating.findMany({
      where: { ratedUserId },
    });

    const avgRating = allRatings.length > 0
        ? allRatings.reduce((acc: number, r: Rating) => acc + r.rating, 0) / allRatings.length
        : 0;

    await prisma.user.update({
      where: { id: ratedUserId },
      data: { averageRating: avgRating },
    });

    return NextResponse.json(newRating);
  } catch (error) {
    console.error('Error rating ride:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}