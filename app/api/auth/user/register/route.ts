// User registration API
// Handles student registration with university email and OTP verification
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { generateOTP, sendOTP } from '@/lib/email'
import bcrypt from 'bcryptjs'
import { isValidUniversityEmail } from '@/lib/utils'

export async function POST(request: NextRequest) {
  try {
    console.log('REGISTER API: Received request');
    const body = await request.json()
    const { email, password, firstName, lastName, phone, gender, university } = body
    console.log('REGISTER API: Request body:', body);

    // Validate input
    if (!email || !password || !firstName || !lastName || !phone || !gender || !university) {
      return NextResponse.json(
        { error: 'All fields are required' },
        { status: 400 }
      )
    }

    // Validate university email format
    if (!isValidUniversityEmail(email)) {
      console.log('REGISTER API: Invalid university email format');
      return NextResponse.json(
        { error: 'Please use a valid university email address' },
        { status: 400 }
      )
    }

    // Check if user already exists
    console.log('REGISTER API: Checking for existing user with email:', email);
    const existingUser = await prisma.user.findUnique({
      where: { email },
    })

    if (existingUser) {
      console.log('REGISTER API: User exists.');
      if (!existingUser.emailVerified) {
        console.log('REGISTER API: User is not verified. Resending OTP.');
        // User exists but is not verified, resend OTP
        const otp = generateOTP()
        const otpExpires = new Date(Date.now() + 10 * 60 * 1000) // 10 minutes

        await prisma.user.update({
          where: { email },
          data: { otpCode: otp, otpExpires },
        })

        console.log('REGISTER API: Sending OTP to existing unverified user.');
        await sendOTP(email, otp)
        console.log('REGISTER API: OTP sent to existing unverified user.');

        return NextResponse.json(
          {
            message:
              'This email is already registered but not verified. A new OTP has been sent.',
            errorCode: 'EMAIL_NOT_VERIFIED',
          },
          { status: 400 }
        )
      } else {
        console.log('REGISTER API: User is already verified.');
        // User is already verified
        return NextResponse.json(
          { error: 'User with this email already exists' },
          { status: 400 }
        )
      }
    }

    console.log('REGISTER API: Creating new user.');
    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10)

    // Generate OTP
    const otp = generateOTP()
    const otpExpires = new Date(Date.now() + 10 * 60 * 1000) // 10 minutes

    // Create user (email not verified yet)
    const user = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        firstName,
        lastName,
        phone,
        gender,
        university,
        otpCode: otp,
        otpExpires,
        emailVerified: false,
      },
    })
    console.log('REGISTER API: New user created with ID:', user.id);

    // Send OTP email; if sending fails remove user and return error so frontend can surface the problem
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
      { error: 'Registration failed' },
      { status: 500 }
    )
  }
}