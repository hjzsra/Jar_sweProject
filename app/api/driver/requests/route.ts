import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyToken } from '@/lib/auth';



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

    const driver = await prisma.driver.findUnique({
      where: { id: driverId },
    });

    if (!driver || !driver.currentLat || !driver.currentLng) {
      return NextResponse.json({ error: 'Driver not found or location not set' }, { status: 404 });
    }

    const pendingRides = await prisma.ride.findMany({
      where: {
        status: 'PENDING',
        // Gender preference matching
        OR: [
          { genderPreference: 'NONE' },
          { genderPreference: driver.gender },
        ],
      },
      include: {
        passenger: true,
      },
    });

    // Filter requests to a certain radius (e.g., 10km)
    const nearbyRequests = pendingRides.filter(ride => {
      const distance = getDistance(
        driver.currentLat!,
        driver.currentLng!,
        ride.pickupLat,
        ride.pickupLng
      );
      return distance <= 10;
    });

    return NextResponse.json(nearbyRequests);
  } catch (error) {
    console.error('Failed to fetch ride requests:', error);
    return NextResponse.json({ error: 'Failed to fetch ride requests' }, { status: 500 });
  }
}