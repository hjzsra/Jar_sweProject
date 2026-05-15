export const dynamic = 'force-dynamic';

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

    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status') // 'open' or 'closed'

    let whereClause: any = {}

    if (status === 'open') {
      whereClause.status = {
        in: ['OPEN', 'IN_PROGRESS']
      }
    } else if (status === 'closed') {
      whereClause.status = {
        in: ['RESOLVED', 'CLOSED']
      }
    }

    const tickets = await prisma.supportTicket.findMany({
      where: whereClause,
      orderBy: { createdAt: 'desc' },
      include: {
        user: {
          select: {
            firstName: true,
            lastName: true,
            email: true,
          },
        },
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
    console.error('Admin support tickets error:', error)
    return NextResponse.json(
      { error: 'Failed to get support tickets' },
      { status: 500 }
    )
  }
}