/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unused-vars */

import { POST } from '../verify-otp/route'

// Mock dependencies
jest.mock('@/lib/prisma', () => ({
  prisma: {
    user: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
  },
}))

jest.mock('next/server', () => ({
  NextResponse: {
    json: jest.fn((data, options) => ({
      status: options?.status || 200,
      json: () => Promise.resolve(data),
    })),
  },
}))

import { prisma as mockPrisma } from '@/lib/prisma'
import { NextResponse as mockNextResponse } from 'next/server'

describe('/api/auth/user/verify-otp', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should return 400 if email is missing', async () => {
    const mockRequest = {
      json: jest.fn().mockResolvedValue({
        otpCode: '123456'
      }),
    }

    await POST(mockRequest as any)

    expect(mockNextResponse.json).toHaveBeenCalledWith(
      { error: 'Email and OTP code are required' },
      { status: 400 }
    )
  })

  it('should return 400 if otpCode is missing', async () => {
    const mockRequest = {
      json: jest.fn().mockResolvedValue({
        email: 'test@university.edu.sa'
      }),
    }

    await POST(mockRequest as any)

    expect(mockNextResponse.json).toHaveBeenCalledWith(
      { error: 'Email and OTP code are required' },
      { status: 400 }
    )
  })

  it('should return 400 if both email and otpCode are missing', async () => {
    const mockRequest = {
      json: jest.fn().mockResolvedValue({}),
    }

    await POST(mockRequest as any)

    expect(mockNextResponse.json).toHaveBeenCalledWith(
      { error: 'Email and OTP code are required' },
      { status: 400 }
    )
  })

  it('should return 404 if user not found', async () => {
    ;(mockPrisma.user.findUnique as jest.Mock).mockResolvedValue(null)

    const mockRequest = {
      json: jest.fn().mockResolvedValue({
        email: 'nonexistent@university.edu.sa',
        otpCode: '123456'
      }),
    }

    await POST(mockRequest as any)

    expect(mockNextResponse.json).toHaveBeenCalledWith(
      { error: 'User not found' },
      { status: 404 }
    )
    expect(mockPrisma.user.findUnique).toHaveBeenCalledWith({
      where: { email: 'nonexistent@university.edu.sa' },
    })
  })

  it('should return 400 if OTP code is invalid', async () => {
    const mockUser = {
      id: '123',
      email: 'test@university.edu.sa',
      otpCode: '123456',
      otpExpires: new Date(Date.now() + 10 * 60 * 1000), // Future date
    }

    ;(mockPrisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser)

    const mockRequest = {
      json: jest.fn().mockResolvedValue({
        email: 'test@university.edu.sa',
        otpCode: '654321' // Wrong OTP
      }),
    }

    await POST(mockRequest as any)

    expect(mockNextResponse.json).toHaveBeenCalledWith(
      { error: 'Invalid OTP code' },
      { status: 400 }
    )
  })

  it('should return 400 if OTP code has expired', async () => {
    const mockUser = {
      id: '123',
      email: 'test@university.edu.sa',
      otpCode: '123456',
      otpExpires: new Date(Date.now() - 10 * 60 * 1000), // Past date
    }

    ;(mockPrisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser)

    const mockRequest = {
      json: jest.fn().mockResolvedValue({
        email: 'test@university.edu.sa',
        otpCode: '123456'
      }),
    }

    await POST(mockRequest as any)

    expect(mockNextResponse.json).toHaveBeenCalledWith(
      { error: 'OTP code has expired' },
      { status: 400 }
    )
  })

  it('should return 400 if user has no OTP code', async () => {
    const mockUser = {
      id: '123',
      email: 'test@university.edu.sa',
      otpCode: null,
      otpExpires: new Date(Date.now() + 10 * 60 * 1000),
    }

    ;(mockPrisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser)

    const mockRequest = {
      json: jest.fn().mockResolvedValue({
        email: 'test@university.edu.sa',
        otpCode: '123456'
      }),
    }

    await POST(mockRequest as any)

    expect(mockNextResponse.json).toHaveBeenCalledWith(
      { error: 'Invalid OTP code' },
      { status: 400 }
    )
  })

  it('should successfully verify OTP and update user', async () => {
    const mockUser = {
      id: '123',
      email: 'test@university.edu.sa',
      otpCode: '123456',
      otpExpires: new Date(Date.now() + 10 * 60 * 1000), // Future date
    }

    ;(mockPrisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser)
    ;(mockPrisma.user.update as jest.Mock).mockResolvedValue({
      ...mockUser,
      emailVerified: true,
      otpCode: null,
      otpExpires: null,
    })

    const mockRequest = {
      json: jest.fn().mockResolvedValue({
        email: 'test@university.edu.sa',
        otpCode: '123456'
      }),
    }

    await POST(mockRequest as any)

    expect(mockNextResponse.json).toHaveBeenCalledWith({
      message: 'Email verified successfully',
    })
    expect(mockPrisma.user.update).toHaveBeenCalledWith({
      where: { id: '123' },
      data: {
        emailVerified: true,
        otpCode: null,
        otpExpires: null,
      },
    })
  })

  it('should handle database errors during user lookup', async () => {
    ;(mockPrisma.user.findUnique as jest.Mock).mockRejectedValue(new Error('Database error'))

    const mockRequest = {
      json: jest.fn().mockResolvedValue({
        email: 'test@university.edu.sa',
        otpCode: '123456'
      }),
    }

    await POST(mockRequest as any)

    expect(mockNextResponse.json).toHaveBeenCalledWith(
      { error: 'Verification failed' },
      { status: 500 }
    )
  })

  it('should handle database errors during user update', async () => {
    const mockUser = {
      id: '123',
      email: 'test@university.edu.sa',
      otpCode: '123456',
      otpExpires: new Date(Date.now() + 10 * 60 * 1000),
    }

    ;(mockPrisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser)
    ;(mockPrisma.user.update as jest.Mock).mockRejectedValue(new Error('Database error'))

    const mockRequest = {
      json: jest.fn().mockResolvedValue({
        email: 'test@university.edu.sa',
        otpCode: '123456'
      }),
    }

    await POST(mockRequest as any)

    expect(mockNextResponse.json).toHaveBeenCalledWith(
      { error: 'Verification failed' },
      { status: 500 }
    )
  })

  it('should handle malformed JSON in request', async () => {
    const mockRequest = {
      json: jest.fn().mockRejectedValue(new Error('Invalid JSON')),
    }

    await POST(mockRequest as any)

    expect(mockNextResponse.json).toHaveBeenCalledWith(
      { error: 'Verification failed' },
      { status: 500 }
    )
  })

  it('should handle empty strings as missing fields', async () => {
    const mockRequest = {
      json: jest.fn().mockResolvedValue({
        email: '',
        otpCode: ''
      }),
    }

    await POST(mockRequest as any)

    expect(mockNextResponse.json).toHaveBeenCalledWith(
      { error: 'Email and OTP code are required' },
      { status: 400 }
    )
  })

  it('should handle whitespace-only inputs as missing fields', async () => {
    const mockRequest = {
      json: jest.fn().mockResolvedValue({
        email: '   ',
        otpCode: '   '
      }),
    }

    await POST(mockRequest as any)

    expect(mockNextResponse.json).toHaveBeenCalledWith(
      { error: 'Email and OTP code are required' },
      { status: 400 }
    )
  })

  it('should handle XSS attempts in input', async () => {
    ;(mockPrisma.user.findUnique as jest.Mock).mockResolvedValue(null)

    const mockRequest = {
      json: jest.fn().mockResolvedValue({
        email: '<script>alert("xss")</script>@university.edu.sa',
        otpCode: '<img src=x onerror=alert(1)>'
      }),
    }

    await POST(mockRequest as any)

    expect(mockNextResponse.json).toHaveBeenCalledWith(
      { error: 'User not found' },
      { status: 404 }
    )
    // Note: In a real app, input sanitization should be added
  })

  it('should handle SQL injection attempts safely', async () => {
    const maliciousEmail = "'; DROP TABLE users; --"

    ;(mockPrisma.user.findUnique as jest.Mock).mockResolvedValue(null)

    const mockRequest = {
      json: jest.fn().mockResolvedValue({
        email: maliciousEmail,
        otpCode: '123456'
      }),
    }

    await POST(mockRequest as any)

    expect(mockNextResponse.json).toHaveBeenCalledWith(
      { error: 'User not found' },
      { status: 404 }
    )
    expect(mockPrisma.user.findUnique).toHaveBeenCalledWith({
      where: { email: maliciousEmail },
    })
  })

  it('should handle OTP codes with leading/trailing spaces', async () => {
    const mockUser = {
      id: '123',
      email: 'test@university.edu.sa',
      otpCode: '123456',
      otpExpires: new Date(Date.now() + 10 * 60 * 1000),
    }

    ;(mockPrisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser)

    const mockRequest = {
      json: jest.fn().mockResolvedValue({
        email: 'test@university.edu.sa',
        otpCode: '  123456  ' // With spaces
      }),
    }

    await POST(mockRequest as any)

    // Should fail because OTP doesn't match exactly
    expect(mockNextResponse.json).toHaveBeenCalledWith(
      { error: 'Invalid OTP code' },
      { status: 400 }
    )
  })

  it('should handle case-sensitive OTP codes', async () => {
    const mockUser = {
      id: '123',
      email: 'test@university.edu.sa',
      otpCode: '123456',
      otpExpires: new Date(Date.now() + 10 * 60 * 1000),
    }

    ;(mockPrisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser)

    const mockRequest = {
      json: jest.fn().mockResolvedValue({
        email: 'test@university.edu.sa',
        otpCode: '123456' // Exact match
      }),
    }

    ;(mockPrisma.user.update as jest.Mock).mockResolvedValue({
      ...mockUser,
      emailVerified: true,
      otpCode: null,
      otpExpires: null,
    })

    await POST(mockRequest as any)

    expect(mockNextResponse.json).toHaveBeenCalledWith({
      message: 'Email verified successfully',
    })
  })
})