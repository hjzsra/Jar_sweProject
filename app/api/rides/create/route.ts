import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyToken } from '@/lib/auth';
import { z } from 'zod';

const createRideSchema = z.object({
  pickup: z.object({
    lat: z.number(),
    lng: z.number(),
    address: z.string(),
  }),
  dropoff: z.object({
    lat: z.number(),
    lng: z.number(),
    address: z.string(),
  }),
  genderPreference: z.enum(['MALE', 'FEMALE', 'NONE']),
});

// Haversine formula to calculate distance
function getDistance(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371; // Radius of the earth in km
  const dLat = deg2rad(lat2 - lat1);
  const dLon = deg2rad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const d = R * c; // Distance in km
  return d;
}

function deg2rad(deg: number) {
  return deg * (Math.PI / 180);
}

export async function POST(req: NextRequest) {
    const token = req.headers.get('authorization')?.replace('Bearer ', '');

    if (!token) {
        return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    try {
        const decoded = verifyToken(token);
        if (!decoded || !decoded.userId || decoded.role !== 'user') {
            return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
        }
        const userId = decoded.userId;

        const body = await req.json();
        const validation = createRideSchema.safeParse(body);

        if (!validation.success) {
            return NextResponse.json({ error: validation.error.errors }, { status: 400 });
        }

        const { pickup, dropoff, genderPreference } = validation.data;

        const user = await prisma.user.findUnique({ where: { id: userId } });
        if (!user) {
            return NextResponse.json({ error: 'User not found' }, { status: 404 });
        }

        const distance = getDistance(pickup.lat, pickup.lng, dropoff.lat, dropoff.lng);
        const cost = distance * 1.5; // Example cost calculation

        const ride = await prisma.ride.create({
            data: {
                passengerId: userId,
                pickupLat: pickup.lat,
                pickupLng: pickup.lng,
                pickupAddress: pickup.address,
                dropoffLat: dropoff.lat,
                dropoffLng: dropoff.lng,
                dropoffAddress: dropoff.address,
                genderPreference,
                status: 'PENDING',
                cost,
            },
        });

        return NextResponse.json(ride);
    } catch (error) {
        console.error('Failed to create ride:', error);
        return NextResponse.json({ error: 'Failed to create ride' }, { status: 500 });
    }
}