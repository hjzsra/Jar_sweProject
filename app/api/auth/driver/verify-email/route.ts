// Driver email verification API
// Verifies email using OTP code sent during registration
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function POST(request: NextRequest) {
  try {
    const { email, otp } = await request.json()

    if (!email || !otp) {
      return NextResponse.json(
        { error: 'Email and OTP are required' },
        { status: 400 }
      )
    }

    // Find the OTP code
    const otpRecord = await prisma.otpCode.findFirst({
      where: {
        destination: email,
        code: otp,
        purpose: 'driver_email_verification',
        consumedAt: null,
        expiresAt: {
          gt: new Date(),
        },
      },
    })

    if (!otpRecord) {
      return NextResponse.json(
        { error: 'Invalid or expired OTP code' },
        { status: 400 }
      )
    }

    // Find the driver
    const driver = await prisma.driver.findUnique({
      where: { email },
    })

    if (!driver) {
      return NextResponse.json(
        { error: 'Driver not found' },
        { status: 404 }
      )
    }

    if (driver.emailVerified) {
      return NextResponse.json(
        { error: 'Email already verified' },
        { status: 400 }
      )
    }

    // Update driver email verification status
    await prisma.driver.update({
      where: { email },
      data: { emailVerified: true },
    })

    // Mark OTP as consumed
    await prisma.otpCode.update({
      where: { id: otpRecord.id },
      data: { consumedAt: new Date() },
    })

    return NextResponse.json({
      message: 'Email verified successfully. You can now log in.',
    })

  } catch (error) {
    console.error('Driver email verification error:', error)
    return NextResponse.json(
      { error: 'Email verification failed' },
      { status: 500 }
    )
  }
}