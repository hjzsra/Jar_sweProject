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

    const { rideId, paymentMethod } = await req.json();

    if (!rideId || !paymentMethod) {
      return NextResponse.json(
        { error: "Ride ID and payment method are required" },
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
        { error: "Ride is not completed yet" },
        { status: 400 }
      );
    }
    if (paymentMethod === 'wallet') {
      const user = await prisma.user.findUnique({ where: { id: payload.userId } });
      if (!user || user.walletBalance < ride.cost) {
        return NextResponse.json({ error: 'Insufficient wallet balance' }, { status: 400 });
      }
      await prisma.user.update({
        where: { id: payload.userId },
        data: { walletBalance: { decrement: ride.cost } },
      });
    }

    await prisma.ride.update({
    where: { id: rideId },
    data: {
        paymentStatus: 'PAID',
        paymentMethod: paymentMethod,
    },
    });

    // Assuming payment processing logic will be handled here in a real scenario
    // For now, we just return a success message

    return NextResponse.json({ message: "Payment processed successfully" });
  } catch (error) {
    console.error("Error processing payment:", error);
    return NextResponse.json(
      { error: "An unexpected error occurred." },
      { status: 500 }
    );
  }
}