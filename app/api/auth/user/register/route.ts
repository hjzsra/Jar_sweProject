// User registration API
// Handles student registration with university email and OTP verification
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { generateOTP, sendOTP } from '@/lib/email'
import bcrypt from 'bcryptjs'
import { isValidUniversityEmail } from '@/lib/utils'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { email, password, firstName, lastName, phone, gender, university } = body

    // Validate input
    if (!email || !password || !firstName || !lastName || !phone || !gender || !university) {
      return NextResponse.json(
        { error: 'All fields are required' },
        { status: 400 }
      )
    }

    // Validate university email format
    if (!isValidUniversityEmail(email)) {
      return NextResponse.json(
        { error: 'Please use a valid university email address' },
        { status: 400 }
      )
    }

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email },
    })

    if (existingUser) {
      return NextResponse.json(
        { error: 'User with this email already exists' },
        { status: 400 }
      )
    }

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

    // Send OTP email
    const emailSent = await sendOTP(email, otp)
    if (!emailSent) {
      // Still create user, but log error
      console.error('Failed to send OTP email')
    }

    return NextResponse.json({
      message: 'Registration successful. Please check your email for verification code.',
      userId: user.id,
    })
  } catch (error) {
    console.error('Registration error:', error)
    return NextResponse.json(
      { error: 'Registration failed' },
      { status: 500 }
    )
  }
}

