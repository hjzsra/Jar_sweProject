// User trip history API
// Get user's previous trip history
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyToken } from '@/lib/auth'
import { UserRole } from '@prisma/client'

export async function GET(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '')
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const payload = verifyToken(token)
    if (!payload || payload.role !== UserRole.USER) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const nearbyDrivers = drivers
      .map((driver) => {
        if (
          !driver.location
        ) {
          return null
        }
        const distance = calculateDistance(
          latitude,
          longitude,
          driver.location.lat,
          driver.location.lng
        )
        return { ...driver, distance }
      })
      .filter((d): d is typeof drivers[0] & { distance: number } => d !== null && d.distance <= radius)
      .sort((a, b) => a.distance - b.distance)
      .map(d => ({
        id: d.id,
        firstName: d.firstName,
        lastName: d.lastName,
        currentLat: d.location?.lat,
        currentLng: d.location?.lng,
        isAvailable: d.isAvailable,
        rating: d.averageRating,
        gender: d.gender,
        distance: d.distance,
        car: {
            model: d.carModel,
            color: d.carColor,
            plateNumber: d.carPlateNumber
        }
      }))

        return {
            ...ride,
            driver: driverDetails,
            rating: ride.ratings.length > 0 ? ride.ratings[0] : null
        }
    })

     return NextResponse.json({ rides: ridesWithDriverDetails })\n  } catch (error) {\n    console.error('Get trip history error:', error)\n    return NextResponse.json({ error: 'Failed to get trip history' }, { status: 500 })\n  }\n}\nreturn NextResponse.json({ rides: ridesWithDriverDetails })
  } catch (error) {
    console.error('Get trip history error:', error)
    return NextResponse.json({ error: 'Failed to get trip history' }, { status: 500 })
  }
}