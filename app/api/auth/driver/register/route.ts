// Driver registration API
// Handles driver registration with license verification through MOT
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyLicense } from '@/lib/mot-api'
import { generateOTP, sendOTP } from '@/lib/email'
import bcrypt from 'bcryptjs'
import { isValidUniversityEmail } from '@/lib/utils'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      email,
      phone,
      password,
      firstName,
      lastName,
      gender,
      licenseNumber,
      isStudent,
      university,
      carModel,
      carColor,
      carPlateNumber,
    } = body

    // Validate input
    if (!password || !firstName || !lastName || !gender || !licenseNumber) {
      return NextResponse.json(
        { error: 'All required fields must be provided' },
        { status: 400 }
      )
    }

    // For students, email is required; for non-students, phone is required
    if (isStudent && !email) {
      return NextResponse.json(
        { error: 'University email is required for students' },
        { status: 400 }
      )
    }

    if (!isStudent && !phone) {
      return NextResponse.json(
        { error: 'Phone number is required for non-student drivers' },
        { status: 400 }
      )
    }

    // Validate university email if student
    if (isStudent && email && !isValidUniversityEmail(email)) {
      return NextResponse.json(
        { error: 'Please use a valid university email address' },
        { status: 400 }
      )
    }

    // Check if driver already exists
    if (email) {
      const existingDriver = await prisma.driver.findUnique({
        where: { email },
      })
      if (existingDriver) {
        return NextResponse.json(
          { error: 'Driver with this email already exists' },
          { status: 400 }
        )
      }
    }

    if (phone) {
      const existingDriver = await prisma.driver.findUnique({
        where: { phone },
      })
      if (existingDriver) {
        return NextResponse.json(
          { error: 'Driver with this phone number already exists' },
          { status: 400 }
        )
      }
    }

    // Check if license number already exists
    const existingLicense = await prisma.driver.findUnique({
      where: { licenseNumber },
    })
    if (existingLicense) {
      return NextResponse.json(
        { error: 'License number already registered' },
        { status: 400 }
      )
    }

    // Verify license through Ministry of Transport API
    const licenseVerification = await verifyLicense(licenseNumber)
    if (!licenseVerification.valid) {
      return NextResponse.json(
        { error: 'Invalid or expired license. Please verify with Ministry of Transport.' },
        { status: 400 }
      )
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10)

    // Create driver and vehicle in a transaction
    const driver = await prisma.$transaction(async (tx: any) => {
      // Create driver
      const driverData = await tx.driver.create({
        data: {
          email: email || null,
          phone: phone || null,
          password: hashedPassword,
          firstName,
          lastName,
          gender,
          licenseNumber,
          licenseVerified: true,
          isStudent: isStudent || false,
          university: isStudent ? university : null,
          emailVerified: !isStudent || !email, // Non-students or students without email are verified by default
          isAvailable: false,
        },
      })

      // Create vehicle if car details provided
      if (carModel && carColor && carPlateNumber) {
        await tx.vehicle.create({
          data: {
            driverId: driverData.id,
            make: carModel.split(' ')[0] || carModel, // Extract make from model
            model: carModel,
            year: new Date().getFullYear(), // Default to current year
            color: carColor,
            licensePlate: carPlateNumber,
          },
        })
      }

      return driverData
    })

    // Send email verification for student drivers
    if (isStudent && email) {
      const otp = generateOTP()
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000) // 10 minutes

      // Save OTP
      await prisma.otpCode.create({
        data: {
          userId: null, // Not associated with a user yet
          destination: email,
          code: otp,
          purpose: 'driver_email_verification',
          expiresAt,
        },
      })

      // Send verification email
      await sendOTP(email, otp)

      return NextResponse.json({
        message: 'Driver registration successful. Please check your email for verification code.',
        driverId: driver.id,
        requiresEmailVerification: true,
      })
    }

    return NextResponse.json({
      message: 'Driver registration successful. License verified.',
      driverId: driver.id,
    })
  } catch (error) {
    console.error('Driver registration error:', error)
    return NextResponse.json(
      { error: 'Registration failed' },
      { status: 500 }
    )
  }
}

