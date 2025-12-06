// Password reset confirmation API
// Validates token and updates password
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'

export async function POST(request: NextRequest) {
  try {
    const { token, role, newPassword, securityAnswer } = await request.json()

    if (!token || !role || !newPassword) {
      return NextResponse.json(
        { error: 'Token, role, and new password are required' },
        { status: 400 }
      )
    }

    if (!['USER', 'DRIVER', 'ADMIN'].includes(role)) {
      return NextResponse.json(
        { error: 'Invalid role' },
        { status: 400 }
      )
    }

    // Validate password strength
    if (newPassword.length < 8) {
      return NextResponse.json(
        { error: 'Password must be at least 8 characters long' },
        { status: 400 }
      )
    }

    // Find and validate reset token
    const resetToken = await prisma.passwordResetToken.findUnique({
      where: { token },
    })

    if (!resetToken) {
      return NextResponse.json(
        { error: 'Invalid or expired reset token' },
        { status: 400 }
      )
    }

    if (resetToken.role !== role) {
      return NextResponse.json(
        { error: 'Token role mismatch' },
        { status: 400 }
      )
    }

    if (resetToken.expiresAt < new Date()) {
      return NextResponse.json(
        { error: 'Reset token has expired' },
        { status: 400 }
      )
    }

    if (resetToken.usedAt) {
      return NextResponse.json(
        { error: 'Reset token has already been used' },
        { status: 400 }
      )
    }

    // For admins, verify security answer
    if (role === 'ADMIN') {
      if (!securityAnswer) {
        return NextResponse.json(
          { error: 'Security answer is required for admin password reset' },
          { status: 400 }
        )
      }

      const admin = await prisma.admin.findUnique({
        where: { email: resetToken.email },
      })

      if (!admin || !admin.securityAnswer) {
        return NextResponse.json(
          { error: 'Admin account security question not set up' },
          { status: 400 }
        )
      }

      // Compare security answer (case insensitive)
      if (admin.securityAnswer.toLowerCase() !== securityAnswer.toLowerCase()) {
        return NextResponse.json(
          { error: 'Incorrect security answer' },
          { status: 400 }
        )
      }
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 10)

    // Update password based on role
    if (role === 'USER') {
      await prisma.user.update({
        where: { email: resetToken.email },
        data: { password: hashedPassword },
      })
    } else if (role === 'DRIVER') {
      await prisma.driver.update({
        where: { email: resetToken.email },
        data: { password: hashedPassword },
      })
    } else if (role === 'ADMIN') {
      await prisma.admin.update({
        where: { email: resetToken.email },
        data: { password: hashedPassword },
      })
    }

    // Mark token as used
    await prisma.passwordResetToken.update({
      where: { token },
      data: { usedAt: new Date() },
    })

    return NextResponse.json({
      message: 'Password has been successfully reset'
    })

  } catch (error) {
    console.error('Password reset confirmation error:', error)
    return NextResponse.json(
      { error: 'Failed to reset password' },
      { status: 500 }
    )
  }
}