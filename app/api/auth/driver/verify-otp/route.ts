import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { generateToken } from '@/lib/auth';
import { UserRole } from '@prisma/client';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { phone, otp } = body;

    if (!phone || !otp) {
      return NextResponse.json(
        { error: 'Phone number and OTP are required' },
        { status: 400 }
      );
    }

    const driver = await prisma.driver.findUnique({
      where: { phone },
    });

    if (!driver) {
      return NextResponse.json(
        { error: 'Driver not found' },
        { status: 404 }
      );
    }

    if (driver.otp !== otp) {
      return NextResponse.json({ error: 'Invalid OTP' }, { status: 400 });
    }

    if (driver.otpExpires && driver.otpExpires < new Date()) {
      return NextResponse.json({ error: 'OTP has expired' }, { status: 400 });
    }

    // OTP is correct, update the driver to mark as verified
    const updatedDriver = await prisma.driver.update({
      where: { id: driver.id },
      data: {
        phoneVerified: true,
        otp: null, // Clear the OTP
        otpExpires: null,
      },
    });

    // Generate a token for the newly verified driver
    const token = generateToken({
      userId: updatedDriver.id,
      email: updatedDriver.email,
      role: UserRole.DRIVER,
    });

    return NextResponse.json({
      message: 'Phone number verified successfully',
      token,
    });
  } catch (error) {
    console.error('OTP verification error:', error);
    return NextResponse.json(
      { error: 'Failed to verify OTP' },
      { status: 500 }
    );
  }
}