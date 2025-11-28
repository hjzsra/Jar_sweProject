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
    if (!user || user.role !== UserRole.USER) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { rideId, amount } = await req.json();

    if (!rideId || !amount) {
      return NextResponse.json({ error: 'Ride ID and amount are required' }, { status: 400 });
    }

    const ride = await prisma.ride.findUnique({
      where: { id: rideId },
      include: { user: true },
    });

    if (!ride) {
      return NextResponse.json({ error: 'Ride not found' }, { status: 404 });
    }

    if (ride.userId !== user.id) {
      return NextResponse.json({ error: 'You can only pay for your own rides' }, { status: 403 });
    }

    if (ride.status !== RideStatus.COMPLETED) {
      return NextResponse.json({ error: 'Can only pay for completed rides' }, { status: 400 });
    }

    // In a real application, you would integrate with a payment gateway like Stripe.
    // This is a simplified example.
    console.log(`Processing payment of ${amount} for ride ${rideId}`);

    // Assuming payment is successful, update the ride status.
    const updatedRide = await prisma.ride.update({
      where: { id: rideId },
      data: {
        // A new status, e.g., PAID, could be added to the schema.
        // For now, we'll just log the payment.
      },
    });

    // You might also want to create a transaction record.
    const transaction = await prisma.transaction.create({
      data: {
        userId: user.id,
        rideId: rideId,
        amount: amount,
        type: 'PAYMENT',
        status: 'COMPLETED',
      },
    });

    return NextResponse.json({ message: 'Payment successful', ride: updatedRide, transaction });
  } catch (error) {
    console.error('Error processing payment:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}