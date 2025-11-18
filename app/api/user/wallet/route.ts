// User wallet API
// Get wallet balance and add funds
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyToken } from '@/lib/auth'

// Get wallet balance
export async function GET(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '')
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const payload = verifyToken(token)
    if (!payload || payload.role !== 'user') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      select: { walletBalance: true },
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    return NextResponse.json({ balance: user.walletBalance })
  } catch (error) {
    console.error('Get wallet error:', error)
    return NextResponse.json({ error: 'Failed to get wallet' }, { status: 500 })
  }
}

// Add funds to wallet (for Apple Pay)
export async function POST(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '')
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const payload = verifyToken(token)
    if (!payload || payload.role !== 'user') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { amount } = body

    if (!amount || amount <= 0) {
      return NextResponse.json(
        { error: 'Valid amount is required' },
        { status: 400 }
      )
    }

    // In production, integrate with Apple Pay API here
    // For now, just add to wallet
    const user = await prisma.user.update({
      where: { id: payload.userId },
      data: {
        walletBalance: {
          increment: amount,
        },
      },
      select: { walletBalance: true },
    })

    return NextResponse.json({
      message: 'Funds added successfully',
      balance: user.walletBalance,
    })
  } catch (error) {
    console.error('Add funds error:', error)
    return NextResponse.json({ error: 'Failed to add funds' }, { status: 500 })
  }
}

