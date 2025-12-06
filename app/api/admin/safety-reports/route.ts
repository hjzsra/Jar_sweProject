// Admin safety reports API
// Get and manage safety reports
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

    const reports = await prisma.safetyReport.findMany({
      include: {
        reporter: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          }
        },
        reported: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          }
        },
        ride: {
          select: {
            id: true,
            pickupAddress: true,
            dropoffAddress: true,
            status: true,
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    })

    return NextResponse.json({ reports })
  } catch (error) {
    console.error('Get safety reports error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch safety reports' },
      { status: 500 }
    )
  }
}

// Update report status and take action
export async function POST(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '')
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const payload = verifyToken(token)
    if (!payload || !payload.userId || payload.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { reportId, action, adminNotes } = await request.json()

    if (!reportId || !['resolve', 'dismiss', 'warning', 'ban'].includes(action)) {
      return NextResponse.json(
        { error: 'Invalid request data' },
        { status: 400 }
      )
    }

    const report = await prisma.safetyReport.findUnique({
      where: { id: reportId },
      include: { reported: true }
    })

    if (!report) {
      return NextResponse.json(
        { error: 'Report not found' },
        { status: 404 }
      )
    }

    const updateData: any = {
      status: action === 'resolve' ? 'resolved' : action === 'dismiss' ? 'dismissed' : 'investigating',
      adminAction: action,
      adminNotes: adminNotes || null,
      reviewedBy: payload.userId,
      reviewedAt: new Date(),
    }

    // Handle user bans
    if (action === 'ban') {
      const banType = report.reportType === 'reckless_driving' ? 'temporary_ban' : 'permanent_ban'
      const expiresAt = banType === 'temporary_ban' ? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) : null // 30 days

      await prisma.userBan.create({
        data: {
          userId: report.reportedId,
          banType,
          reason: `Safety violation: ${report.reportType}`,
          bannedBy: payload.userId,
          expiresAt,
        }
      })
    } else if (action === 'warning') {
      await prisma.userBan.create({
        data: {
          userId: report.reportedId,
          banType: 'warning',
          reason: `Safety warning: ${report.reportType}`,
          bannedBy: payload.userId,
        }
      })
    }

    await prisma.safetyReport.update({
      where: { id: reportId },
      data: updateData
    })

    return NextResponse.json({
      message: `Report ${action} action completed`
    })
  } catch (error) {
    console.error('Safety report management error:', error)
    return NextResponse.json(
      { error: 'Failed to manage safety report' },
      { status: 500 }
    )
  }
}