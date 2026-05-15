// Driver login API
// Authenticates driver with email/phone and password
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { generateToken } from '@/lib/auth'
import bcrypt from 'bcryptjs'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { email, phone, password } = body

    console.log('🔐 Login attempt:', { email, phone: phone ? '***' + phone.slice(-4) : null })

    if (!password || (!email && !phone)) {
      return NextResponse.json(
        { error: 'Email/phone and password are required' },
        { status: 400 }
      )
    }

    // Find driver by email or phone
    const driver = email
      ? await prisma.driver.findUnique({ where: { email } })
      : await prisma.driver.findUnique({ where: { phone } })

    if (!driver) {
      console.log('❌ Driver not found')
      return NextResponse.json(
        { error: 'Invalid credentials' },
        { status: 401 }
      )
    }

    console.log('👤 Driver found:', { 
      id: driver.id, 
      email: driver.email, 
      phone: driver.phone,
      licenseVerified: driver.licenseVerified 
    })

    // Verify password
    const passwordValid = await bcrypt.compare(password, driver.password)
    if (!passwordValid) {
      console.log('❌ Password invalid')
      return NextResponse.json(
        { error: 'Invalid credentials' },
        { status: 401 }
      )
    }

    // Check if license is verified
    if (!driver.licenseVerified) {
      console.log('❌ License not verified')
      return NextResponse.json(
        { error: 'License not verified. Please contact support.' },
        { status: 401 }
      )
    }

    // Generate token
    const token = generateToken({
      userId: driver.id,
      email: driver.email || driver.phone || '',
      role: 'driver',
    })

    console.log('✅ Login successful for driver:', driver.id)

    return NextResponse.json({
      token,
      driver: {
        id: driver.id,
        email: driver.email,
        phone: driver.phone,
        firstName: driver.firstName,
        lastName: driver.lastName,
        isAvailable: driver.isAvailable,
        averageRating: driver.averageRating,
      },
    })
  } catch (error) {
    console.error('❌ Driver login error:', error)
    return NextResponse.json(
      { error: 'Login failed' },
      { status: 500 }
    )
  }
}