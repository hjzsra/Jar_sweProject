// OTP verification API
// Verifies OTP for either email (on registration) or phone (for logged-in users)
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyToken } from '@/lib/auth'

export async function POST(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '');
    const body = await request.json();
    const { otp, email } = body;

    if (!otp) {
        return NextResponse.json({ error: 'OTP is required' }, { status: 400 });
    }

    // Case 1: Phone verification for a logged-in user (using auth token)
    if (token) {
        const payload = verifyToken(token)
        if (!payload || !payload.userId || payload.role !== 'user') {
          return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
        }

        const user = await prisma.user.findUnique({ where: { id: payload.userId } });
        if (!user) {
          return NextResponse.json({ error: 'User not found' }, { status: 404 });
        }

        if (!user.phoneOtp || !user.phoneOtpExpiresAt) {
          return NextResponse.json({ error: 'No phone OTP found for this user.' }, { status: 400 });
        }

        if (user.phoneOtp !== otp) {
          return NextResponse.json({ error: 'Invalid phone OTP' }, { status: 400 });
        }

        if (new Date() > user.phoneOtpExpiresAt) {
            return NextResponse.json({ error: 'Phone OTP has expired' }, { status: 400 });
        }

        await prisma.user.update({
            where: { id: user.id },
            data: { phoneVerified: true, phoneOtp: null, phoneOtpExpiresAt: null },
        });

        return NextResponse.json({ message: 'Phone number verified successfully' });
    }

    // Case 2: Email verification for a new user (using email address)
    if (email) {
        const user = await prisma.user.findUnique({ where: { email } });
        if (!user) {
          return NextResponse.json({ error: 'User not found' }, { status: 404 });
        }

        if (user.emailVerified) {
            return NextResponse.json({ message: 'Email is already verified' });
        }

        if (!user.otp || !user.otpExpiresAt) {
          return NextResponse.json({ error: 'No email OTP found for this user.' }, { status: 400 });
        }

        if (user.otp !== otp) {
          return NextResponse.json({ error: 'Invalid email OTP' }, { status: 400 });
        }

        if (new Date() > user.otpExpiresAt) {
            return NextResponse.json({ error: 'Email OTP has expired' }, { status: 400 });
        }

        await prisma.user.update({
            where: { id: user.id },
            data: { emailVerified: new Date(), otp: null, otpExpiresAt: null },
        });

        return NextResponse.json({ message: 'Email verified successfully' });
    }

    // If we get here, the request is invalid
    return NextResponse.json({ error: 'Invalid request. Provide an auth token (for phone verification) or an email (for email verification).' }, { status: 400 });

  } catch (error) {
    console.error('Verify OTP error:', error);
    return NextResponse.json({ error: 'Failed to verify OTP' }, { status: 500 });
  }
}