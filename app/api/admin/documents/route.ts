// Admin document verification API
// Get pending documents for review
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

    const documents = await prisma.documentVerification.findMany({
      where: {
        status: 'pending'
      },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            university: true,
          }
        },
        driver: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            phone: true,
            isStudent: true,
            university: true,
          }
        }
      },
      orderBy: {
        createdAt: 'asc'
      }
    })

    return NextResponse.json({ documents })
  } catch (error) {
    console.error('Get documents error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch documents' },
      { status: 500 }
    )
  }
}

// Review document (approve/reject)
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

    const { documentId, action, rejectionReason } = await request.json()

    if (!documentId || !['approve', 'reject'].includes(action)) {
      return NextResponse.json(
        { error: 'Invalid request data' },
        { status: 400 }
      )
    }

    const document = await prisma.documentVerification.findUnique({
      where: { id: documentId }
    })

    if (!document) {
      return NextResponse.json(
        { error: 'Document not found' },
        { status: 404 }
      )
    }

    // Update document status
    const updateData: any = {
      status: action === 'approve' ? 'approved' : 'rejected',
      reviewedBy: payload.userId,
      reviewedAt: new Date(),
    }

    if (action === 'reject' && rejectionReason) {
      updateData.rejectionReason = rejectionReason
    }

    await prisma.documentVerification.update({
      where: { id: documentId },
      data: updateData
    })

    // If approving driver's license, update driver verification status
    if (action === 'approve' && document.documentType === 'drivers_license' && document.driverId) {
      await prisma.driver.update({
        where: { id: document.driverId },
        data: { licenseVerified: true }
      })
    }

    return NextResponse.json({
      message: `Document ${action}d successfully`
    })
  } catch (error) {
    console.error('Document review error:', error)
    return NextResponse.json(
      { error: 'Failed to review document' },
      { status: 500 }
    )
  }
}