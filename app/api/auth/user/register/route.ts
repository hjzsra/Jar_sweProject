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

    console.log('📝 Registration attempt:', { 
      email, 
      firstName, 
      lastName, 
      phone, 
      gender, 
      university,
      hasPassword: !!password 
    })

    // Validate input
    if (!email?.trim() || !password?.trim() || !firstName?.trim() || !lastName?.trim() || !phone?.trim() || !gender?.trim() || !university?.trim()) {
      console.log('❌ Missing required fields:', {
        email: !!email?.trim(),
        password: !!password?.trim(),
        firstName: !!firstName?.trim(),
        lastName: !!lastName?.trim(),
        phone: !!phone?.trim(),
        gender: !!gender?.trim(),
        university: !!university?.trim()
      })
      return NextResponse.json(
        { error: 'All fields are required' },
        { status: 400 }
      )
    }

    // Validate university email format
    const isValidEmail = isValidUniversityEmail(email)
    console.log('📧 Email validation:', { email, isValid: isValidEmail })
    
    if (!isValidEmail) {
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
      console.log('❌ User already exists:', email)
      return NextResponse.json(
        { error: 'User with this email already exists' },
        { status: 400 }
      )
    }

    console.log('✅ Validation passed, creating user...')

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10)

    // Generate OTP
    const otp = generateOTP()
    const otpExpires = new Date(Date.now() + 10 * 60 * 1000) // 10 minutes

    console.log('🔐 Generated OTP:', otp)

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

    console.log('✅ User created:', user.id)

    // Send OTP email
    const emailSent = await sendOTP(email, otp)
    if (!emailSent) {
      console.error('⚠️  Failed to send OTP email')
      return NextResponse.json(
        { error: 'Failed to send verification email. Please try again.' },
        { status: 500 }
      )
    } else {
      console.log('✅ OTP email sent')
    }

    return NextResponse.json({
      message: 'Registration successful. Please check your email for verification code.',
      userId: user.id,
    })
  } catch (error) {
    console.error('❌ Registration error:', error)
    return NextResponse.json(
      { error: 'Registration failed' },
      { status: 500 }
    )
  }
}