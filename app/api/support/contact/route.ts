// Support contact API
// Users can contact support team
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyToken } from '@/lib/auth'

export async function POST(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '')
    const body = await request.json()
    const { email, subject, message } = body

    if (!email || !subject || !message) {
      return NextResponse.json(
        { error: 'Email, subject, and message are required' },
        { status: 400 }
      )
    }

    // Get user ID if authenticated
    let userId = null
    if (token) {
      const payload = verifyToken(token)
      if (payload && payload.role === 'user') {
        userId = payload.userId
      }
    }

    // Create support ticket
    const ticket = await prisma.supportTicket.create({
      data: {
        userId,
        email,
        subject,
        message,
        status: 'OPEN',
      },
    })

    return NextResponse.json({
      message: 'Support ticket created successfully',
      ticketId: ticket.id,
    })
  } catch (error) {
    console.error('Create support ticket error:', error)
    return NextResponse.json(
      { error: 'Failed to create support ticket' },
      { status: 500 }
    )
  }
}

