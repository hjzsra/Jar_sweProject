import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyToken } from '@/lib/auth'

export async function POST(
  request: NextRequest,
  { params }: { params: { ticketId: string } }
) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '')
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const payload = verifyToken(token)
    if (!payload || payload.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { ticketId } = params
    const body = await request.json()
    const { message, status } = body

    if (!message) {
      return NextResponse.json(
        { error: 'Message is required' },
        { status: 400 }
      )
    }

    // Add the reply message (senderId null for admin)
    await prisma.supportMessage.create({
      data: {
        ticketId,
        message,
        senderId: null, // Admin reply
      },
    })

    // Update ticket status if provided
    if (status) {
      await prisma.supportTicket.update({
        where: { id: ticketId },
        data: { status },
      })
    }

    return NextResponse.json({ message: 'Reply sent successfully' })
  } catch (error) {
    console.error('Admin reply error:', error)
    return NextResponse.json(
      { error: 'Failed to send reply' },
      { status: 500 }
    )
  }
}