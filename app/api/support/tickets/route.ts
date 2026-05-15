import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyToken } from '@/lib/auth'

export const dynamic = 'force-dynamic'

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

    const tickets = await prisma.supportTicket.findMany({
      where: { userId: payload.userId },
      orderBy: { createdAt: 'desc' },
      include: {
        messages: {
          include: {
            sender: {
              select: {
                firstName: true,
                lastName: true,
              },
            },
          },
          orderBy: { createdAt: 'asc' },
        },
      },
    })

    return NextResponse.json({ tickets })
  } catch (error) {
    console.error('User support tickets error:', error)
    return NextResponse.json(
      { error: 'Failed to get support tickets' },
      { status: 500 }
    )
  }
}