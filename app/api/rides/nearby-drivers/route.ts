// Get drivers API
// Returns drivers with optional filters (same gender, availability, etc.)
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyToken, getTokenFromRequest } from '@/lib/auth'

export async function GET(request: NextRequest) {
  try {
    // ✅ Verify authentication
    const token = getTokenFromRequest(request.headers)
    if (!token) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
)
}

const payload = verifyToken(token)
if (!payload || payload.role !== 'user') {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
)
}

// ✅ Get user (for gender filter if needed)
const user = await prisma.user.findUnique({
where: { id: payload.userId },
})

if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
)
}

// ✅ Read optional query params
const { searchParams } = new URL(request.url)

const sameGender = searchParams.get('sameGender') === 'true' // default false
const onlyAvailable = searchParams.get('onlyAvailable') === 'true'
const onlyVerified = searchParams.get('onlyVerified') === 'true'

// Build Prisma where object dynamically
const where: any = {}



const drivers = await prisma.driver.findMany({
select: {
id: true,
firstName: true,
lastName: true,
email: true,
phone: true,
gender: true,
isAvailable: true,
licenseVerified: true,
averageRating: true,
carModel: true,
carColor: true,
carPlateNumber: true,
},
})


    return NextResponse.json({
      drivers,
      count: drivers.length,
    })
  } catch (error) {
    console.error('Get drivers error:', error)
    return NextResponse.json(
      { error: 'Failed to get drivers' },
      { status: 500 }
)
}
}
