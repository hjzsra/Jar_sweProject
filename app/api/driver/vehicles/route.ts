// Driver vehicle management API
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyToken } from '@/lib/auth'

export async function GET(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '')
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const payload = verifyToken(token)
    if (!payload || payload.role !== 'driver') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const vehicles = await prisma.vehicle.findMany({
      where: { driverId: payload.userId },
      orderBy: { createdAt: 'desc' }
    })

    return NextResponse.json({ vehicles })
  } catch (error) {
    console.error('Get vehicles error:', error)
    return NextResponse.json({ error: 'Failed to get vehicles' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '')
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const payload = verifyToken(token)
    if (!payload || payload.role !== 'driver') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { make, model, year, color, licensePlate, insuranceNumber, insuranceExpiry, inspectionDate, inspectionExpiry } = body

    if (!make || !model || !year || !color || !licensePlate) {
      return NextResponse.json({ error: 'Required fields: make, model, year, color, licensePlate' }, { status: 400 })
    }

    const vehicle = await prisma.vehicle.create({
      data: {
        driverId: payload.userId!,
        make,
        model,
        year: parseInt(year),
        color,
        licensePlate,
        insuranceNumber,
        insuranceExpiry: insuranceExpiry ? new Date(insuranceExpiry) : null,
        inspectionDate: inspectionDate ? new Date(inspectionDate) : null,
        inspectionExpiry: inspectionExpiry ? new Date(inspectionExpiry) : null,
      }
    })

    return NextResponse.json({ message: 'Vehicle registered successfully', vehicle })
  } catch (error) {
    console.error('Register vehicle error:', error)
    return NextResponse.json({ error: 'Failed to register vehicle' }, { status: 500 })
  }
}