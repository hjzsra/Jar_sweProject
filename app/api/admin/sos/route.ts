// Admin SOS logs API
// Get and manage SOS emergency alerts
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
    if (!payload || payload.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const sosLogs = await prisma.sOSSLog.findMany({
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            phone: true,
          }
        },
        ride: {
          select: {
            id: true,
            pickupAddress: true,
            dropoffAddress: true,
            driver: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                phone: true,
              }
            }
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    })

    return NextResponse.json({ sosLogs })
  } catch (error) {
    console.error('Get SOS logs error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch SOS logs' },
      { status: 500 }
    )
  }
}

// Resolve SOS alert
export async function POST(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '')
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const payload = verifyToken(token)
    if (!payload || payload.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { sosId, action } = await request.json()

    if (!sosId || !['resolve', 'false_alarm'].includes(action)) {
      return NextResponse.json(
        { error: 'Invalid request data' },
        { status: 400 }
      )
    }

    const sosLog = await prisma.sOSSLog.findUnique({
      where: { id: sosId }
    })

    if (!sosLog) {
      return NextResponse.json(
        { error: 'SOS log not found' },
        { status: 404 }
      )
    }

    if (sosLog.status !== 'active') {
      return NextResponse.json(
        { error: 'SOS is already resolved' },
        { status: 400 }
      )
    }

    await prisma.sOSSLog.update({
      where: { id: sosId },
      data: {
        status: action === 'resolve' ? 'resolved' : 'false_alarm',
        resolvedBy: payload.userId,
        resolvedAt: new Date(),
      }
    })

    return NextResponse.json({
      message: `SOS marked as ${action === 'resolve' ? 'resolved' : 'false alarm'}`
    })
  } catch (error) {
    console.error('SOS management error:', error)
    return NextResponse.json(
      { error: 'Failed to manage SOS' },
      { status: 500 }
    )
  }
}