// Resend OTP API
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { generateOTP, sendOTP } from '@/lib/email'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { email } = body

    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 })
    }

    const user = await prisma.user.findUnique({ where: { email } })
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const otp = generateOTP()
    const otpExpires = new Date(Date.now() + 10 * 60 * 1000)

    await prisma.user.update({ where: { id: user.id }, data: { otpCode: otp, otpExpires } })

    const sent = await sendOTP(email, otp)
    if (!sent) {
      return NextResponse.json({ error: 'Failed to send OTP email' }, { status: 500 })
    }

    return NextResponse.json({ message: 'OTP resent' })
  } catch (error) {
    console.error('Resend OTP error:', error)
    return NextResponse.json({ error: 'Failed to resend OTP' }, { status: 500 })
  }
}
