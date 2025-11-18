// Chat messages API
// Get and send chat messages for a ride
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyToken } from '@/lib/auth'

// Get messages for a ride
export async function GET(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '')
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const payload = verifyToken(token)
    if (!payload) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const rideId = searchParams.get('rideId')

    if (!rideId) {
      return NextResponse.json(
        { error: 'Ride ID is required' },
        { status: 400 }
      )
    }

    // Verify user has access to this ride
    const ride = await prisma.ride.findUnique({
      where: { id: rideId },
    })

    if (!ride) {
      return NextResponse.json({ error: 'Ride not found' }, { status: 404 })
    }

    if (
      (payload.role === 'user' && ride.passengerId !== payload.userId) ||
      (payload.role === 'driver' && ride.driverId !== payload.userId)
    ) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    // Get messages
    const messages = await prisma.chatMessage.findMany({
      where: { rideId },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
        driver: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
      },
      orderBy: { createdAt: 'asc' },
    })

    return NextResponse.json({ messages })
  } catch (error) {
    console.error('Get messages error:', error)
    return NextResponse.json({ error: 'Failed to get messages' }, { status: 500 })
  }
}

// Send a message
export async function POST(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '')
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const payload = verifyToken(token)
    if (!payload) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { rideId, message } = body

    if (!rideId || !message) {
      return NextResponse.json(
        { error: 'Ride ID and message are required' },
        { status: 400 }
      )
    }

    // Verify user has access to this ride
    const ride = await prisma.ride.findUnique({
      where: { id: rideId },
    })

    if (!ride) {
      return NextResponse.json({ error: 'Ride not found' }, { status: 404 })
    }

    if (
      (payload.role === 'user' && ride.passengerId !== payload.userId) ||
      (payload.role === 'driver' && ride.driverId !== payload.userId)
    ) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    // Create message
    const chatMessage = await prisma.chatMessage.create({
      data: {
        rideId,
        userId: payload.role === 'user' ? payload.userId : null,
        driverId: payload.role === 'driver' ? payload.userId : null,
        message,
      },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
        driver: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    })

    return NextResponse.json({
      message: 'Message sent',
      chatMessage,
    })
  } catch (error) {
    console.error('Send message error:', error)
    return NextResponse.json({ error: 'Failed to send message' }, { status: 500 })
  }
}

