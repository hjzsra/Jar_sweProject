// Password reset request API
// Sends a password reset email with a secure token
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { sendEmail } from '@/lib/email'
import crypto from 'crypto'

export async function POST(request: NextRequest) {
  try {
    const { email, role } = await request.json()

    if (!email || !role) {
      return NextResponse.json(
        { error: 'Email and role are required' },
        { status: 400 }
      )
    }

    if (!['USER', 'DRIVER', 'ADMIN'].includes(role)) {
      return NextResponse.json(
        { error: 'Invalid role' },
        { status: 400 }
      )
    }

    // Check if user exists based on role
    let user = null
    if (role === 'USER') {
      user = await prisma.user.findUnique({ where: { email } })
    } else if (role === 'DRIVER') {
      user = await prisma.driver.findUnique({ where: { email } })
    } else if (role === 'ADMIN') {
      user = await prisma.admin.findUnique({ where: { email } })
    }

    if (!user) {
      // Don't reveal if email exists or not for security
      return NextResponse.json(
        { message: 'If an account with this email exists, a password reset link has been sent.' }
      )
    }

    // For admins, require security question verification
    if (role === 'ADMIN') {
      const admin = user as any
      if (!admin.securityQuestion || !admin.securityAnswer) {
        return NextResponse.json(
          { error: 'Admin account requires security question setup. Please contact support.' },
          { status: 400 }
        )
      }
    }

    // Generate secure reset token
    const token = crypto.randomBytes(32).toString('hex')
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000) // 15 minutes

    // Save reset token
    await prisma.passwordResetToken.create({
      data: {
        email,
        token,
        role: role as any,
        expiresAt,
      },
    })

    // Send reset email
    const resetUrl = `${process.env.NEXT_PUBLIC_APP_URL}/reset-password?token=${token}&role=${role}`

    await sendEmail({
      to: email,
      subject: 'Password Reset Request',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2>Password Reset Request</h2>
          <p>You requested a password reset for your ${role.toLowerCase()} account.</p>
          <p>Click the link below to reset your password:</p>
          <a href="${resetUrl}" style="background-color: #007bff; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block; margin: 20px 0;">
            Reset Password
          </a>
          <p>This link will expire in 15 minutes.</p>
          <p>If you didn't request this reset, please ignore this email.</p>
          <p>For security reasons, this link can only be used once.</p>
        </div>
      `,
    })

    return NextResponse.json({
      message: 'If an account with this email exists, a password reset link has been sent.'
    })

  } catch (error) {
    console.error('Password reset request error:', error)
    return NextResponse.json(
      { error: 'Failed to process password reset request' },
      { status: 500 }
    )
  }
}