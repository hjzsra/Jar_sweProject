// User wallet API
// Get wallet balance and add funds
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyToken } from '@/lib/auth'

// Get wallet balance and recent transactions
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

    console.log('💰 Getting wallet for user:', payload.userId)

    // Get or create wallet
    let wallet = await prisma.wallet.findUnique({
      where: { userId: payload.userId },
      include: {
        txns: {
          orderBy: { createdAt: 'desc' },
          take: 10, // Last 10 transactions
        },
      },
    })

    // If wallet doesn't exist, create it
    if (!wallet) {
      console.log('📝 Creating new wallet for user')
      wallet = await prisma.wallet.create({
        data: {
          userId: payload.userId,
          balance: 0,
          currency: 'SAR',
        },
        include: {
          txns: true,
        },
      })
    }

    // Convert cents to currency units (SAR)
    const balanceInSAR = wallet.balance / 100

    console.log('✅ Wallet balance:', balanceInSAR, 'SAR')

    return NextResponse.json({
      balance: balanceInSAR,
      balanceInCents: wallet.balance,
      currency: wallet.currency,
      transactions: wallet.txns.map(txn => ({
        id: txn.id,
        type: txn.type,
        source: txn.source,
        amount: txn.amount / 100, // Convert to SAR
        amountInCents: txn.amount,
        currency: txn.currency,
        referenceId: txn.referenceId,
        createdAt: txn.createdAt,
      })),
    })
  } catch (error) {
    console.error('❌ Get wallet error:', error)
    return NextResponse.json({ error: 'Failed to get wallet' }, { status: 500 })
  }
}

// Add funds to wallet (for Apple Pay or top-up)
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
    const { amount, paymentMethod, referenceId } = body

    console.log('💳 Add funds request:', { 
      userId: payload.userId, 
      amount, 
      paymentMethod,
      referenceId 
    })

    // Validate amount
    if (!amount || amount <= 0) {
      return NextResponse.json(
        { error: 'Valid amount is required (must be greater than 0)' },
        { status: 400 }
      )
    }

    // Validate payment method
    if (!paymentMethod || !['APPLE_PAY', 'CASH'].includes(paymentMethod)) {
      return NextResponse.json(
        { error: 'Valid payment method is required (APPLE_PAY or CASH)' },
        { status: 400 }
      )
    }

    // Convert SAR to cents for storage
    const amountInCents = Math.round(amount * 100)

    console.log('💰 Adding', amountInCents, 'cents (', amount, 'SAR )')

    // Get or create wallet
    let wallet = await prisma.wallet.findUnique({
      where: { userId: payload.userId },
    })

    if (!wallet) {
      console.log('📝 Creating new wallet for user')
      wallet = await prisma.wallet.create({
        data: {
          userId: payload.userId,
          balance: 0,
          currency: 'SAR',
        },
      })
    }

    // Use transaction to ensure atomicity
    const result = await prisma.$transaction(async (tx) => {
      // Update wallet balance
      const updatedWallet = await tx.wallet.update({
        where: { id: wallet.id },
        data: {
          balance: {
            increment: amountInCents,
          },
        },
      })

      // Create transaction record
      const transaction = await tx.walletTransaction.create({
        data: {
          walletId: wallet.id,
          type: 'CREDIT',
          source: 'TOPUP',
          amount: amountInCents,
          currency: 'SAR',
          referenceId: referenceId || `TOPUP-${Date.now()}`,
        },
      })

      return { wallet: updatedWallet, transaction }
    })

    const newBalanceInSAR = result.wallet.balance / 100

    console.log('✅ Funds added successfully. New balance:', newBalanceInSAR, 'SAR')

    return NextResponse.json({
      message: 'Funds added successfully',
      balance: newBalanceInSAR,
      balanceInCents: result.wallet.balance,
      transaction: {
        id: result.transaction.id,
        amount: result.transaction.amount / 100,
        type: result.transaction.type,
        source: result.transaction.source,
        referenceId: result.transaction.referenceId,
        createdAt: result.transaction.createdAt,
      },
    })
  } catch (error) {
    console.error('❌ Add funds error:', error)
    return NextResponse.json({ error: 'Failed to add funds' }, { status: 500 })
  }
}