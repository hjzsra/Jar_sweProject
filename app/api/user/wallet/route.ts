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

// Add funds to wallet (for card or mobile pay)
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
    const { amount, paymentMethod } = body // Added paymentMethod

    if (!amount || amount <= 0) {
      return NextResponse.json(
        { error: 'Valid amount is required' },
        { status: 400 }
      )
    }

    if (!paymentMethod || !['card', 'mobilePay'].includes(paymentMethod)) {
      return NextResponse.json(
        { error: 'Valid payment method is required (card or mobilePay)' },
        { status: 400 }
      )
    }

    // In production, integrate with a payment gateway like Stripe or Braintree
    // For now, simulate payment processing based on the method
    switch (paymentMethod) {
      case 'card':
        // Simulate card processing
        console.log(`Processing card payment of ${amount}`);
        break;
      case 'mobilePay':
        // Simulate mobile payment (e.g., Apple Pay, Google Pay)
        console.log(`Processing mobile payment of ${amount}`);
        break;
      default:
        // This case should not be reached due to the validation above
        return NextResponse.json(
          { error: 'Invalid payment method' },
          { status: 400 }
        );
    }

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