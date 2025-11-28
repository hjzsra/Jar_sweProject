// User registration API
// Handles new student registration and resending OTP for unverified users.
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { generateOTP, sendOTP } from '@/lib/email'
import bcrypt from 'bcryptjs'
import { isValidUniversityEmail } from '@/lib/utils'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { email, password, firstName, lastName, phone, gender, university } = body

    // Email is the only required field for both registration and resending OTP
    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 })
    }

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email },
    })

    if (existingUser) {
      // If user exists, handle OTP resend or return error if already verified.
      if (!existingUser.emailVerified) {
        // User exists but is not verified, resend OTP
        const otp = generateOTP()
        const otpExpires = new Date(Date.now() + 10 * 60 * 1000) // 10 minutes

        await prisma.user.update({
          where: { email },
          data: { otp: otp, otpExpiresAt: otpExpires },
        })

        await sendOTP(email, otp)

        // Return a success response, as the OTP has been resent.
        return NextResponse.json({
          message: 'This email is already registered but not verified. A new OTP has been sent.',
          errorCode: 'EMAIL_NOT_VERIFIED',
        })
      } else {
        // User is already verified
        return NextResponse.json(
          { error: 'User with this email already exists and is verified.' },
          { status: 400 }
        )
      }
    }

    // If user does not exist, this is a new registration.
    // Now, validate all other fields required for a new user.
    if (!password || !firstName || !lastName || !phone || !gender || !university) {
      return NextResponse.json(
        { error: 'All fields are required for a new registration' },
        { status: 400 }
      )
    }

    // Validate university email format for new registrations
    if (!isValidUniversityEmail(email)) {
      return NextResponse.json(
        { error: 'Please use a valid university email address' },
        { status: 400 }
      )
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10)

    // Generate OTP
    const otp = generateOTP()
    const otpExpires = new Date(Date.now() + 10 * 60 * 1000) // 10 minutes

    // Create user
    const user = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        firstName,
        lastName,
        phone,
        gender,
        university,
        otp: otp,
        otpExpiresAt: otpExpires,
        emailVerified: null,
      },
    })

    // Send OTP email
    const emailSent = await sendOTP(email, otp)
    if (!emailSent) {
      console.error('Failed to send OTP email; removing created user')
      await prisma.user.delete({ where: { id: user.id } })
      return NextResponse.json(
        { error: 'Failed to send verification email. Check email configuration.' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      message: 'Registration successful. Please check your email for verification code.',
      userId: user.id,
      email,
    })
  } catch (error) {
    console.error('REGISTER API: Unhandled error:', error)
    return NextResponse.json(
      { error: 'An unexpected error occurred during registration.' },
      { status: 500 }
    )
  }
}