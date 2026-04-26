// Driver resend OTP API
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { generateOTP, sendOTP } from '@/lib/email'

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json()

    if (!email) {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      )
    }

    // Check if driver exists and needs verification
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

    // Generate new OTP
    const otp = generateOTP()
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000) // 10 minutes

    // Save new OTP (this will replace any existing unconsumed OTP)
    await prisma.otpCode.create({
      data: {
        destination: email,
        code: otp,
        purpose: 'driver_email_verification',
        expiresAt,
      },
    })

    // Send OTP email
    await sendOTP(email, otp)

    return NextResponse.json({
      message: 'OTP sent successfully',
    })

  } catch (error) {
    console.error('Driver resend OTP error:', error)
    return NextResponse.json(
      { error: 'Failed to resend OTP' },
      { status: 500 }
    )
  }
}