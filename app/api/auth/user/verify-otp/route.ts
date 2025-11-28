// OTP verification API
// Verifies the OTP code sent to user's email
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { email, otpCode } = body

    if (!email || !otpCode) {
      return NextResponse.json(
        { error: 'Email and OTP code are required' },
        { status: 400 }
      )
    }

    // Find user
    const user = await prisma.user.findUnique({
      where: { email },
    })

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    // Check if OTP is valid
    if (!user.otpCode || user.otpCode !== otpCode) {
      return NextResponse.json(
        { error: 'Invalid OTP code' },
        { status: 400 }
      )
    }

    // Check if OTP has expired
    if (!user.otpExpires || user.otpExpires < new Date()) {
      return NextResponse.json(
        { error: 'OTP code has expired' },
        { status: 400 }
      )
    }

    // Verify email
    await prisma.user.update({
      where: { id: user.id },
      data: {
        emailVerified: true,
        otpCode: null,
        otpExpires: null,
      },
    })

    return NextResponse.json({
      message: 'Email verified successfully',
    })
  } catch (error) {
    console.error('OTP verification error:', error)
    return NextResponse.json(
      { error: 'Verification failed' },
      { status: 500 }
    )
  }
}

