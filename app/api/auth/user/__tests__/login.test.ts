/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unused-vars */

import { POST } from '../login/route'

// Mock dependencies
jest.mock('@/lib/prisma', () => ({
  prisma: {
    user: {
      findUnique: jest.fn(),
    },
  },
}))

jest.mock('@/lib/auth', () => ({
  generateToken: jest.fn(),
}))

jest.mock('bcryptjs', () => ({
  compare: jest.fn(),
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
import { generateToken as mockGenerateToken } from '@/lib/auth'
import bcrypt from 'bcryptjs'
import { NextResponse as mockNextResponse } from 'next/server'

describe('/api/auth/user/login', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should return 400 if email is missing', async () => {
    const mockRequest = {
      json: jest.fn().mockResolvedValue({ password: 'testpass' }),
    }

    await POST(mockRequest as any)

    expect(mockNextResponse.json).toHaveBeenCalledWith(
      { error: 'Email and password are required' },
      { status: 400 }
    )
  })

  it('should return 400 if password is missing', async () => {
    const mockRequest = {
      json: jest.fn().mockResolvedValue({ email: 'test@example.com' }),
    }

    await POST(mockRequest as any)

    expect(mockNextResponse.json).toHaveBeenCalledWith(
      { error: 'Email and password are required' },
      { status: 400 }
    )
  })

  it('should return 400 if both email and password are missing', async () => {
    const mockRequest = {
      json: jest.fn().mockResolvedValue({}),
    }

    await POST(mockRequest as any)

    expect(mockNextResponse.json).toHaveBeenCalledWith(
      { error: 'Email and password are required' },
      { status: 400 }
    )
  })

  it('should return 401 if user not found', async () => {
    (mockPrisma.user.findUnique as jest.Mock).mockResolvedValue(null)

    const mockRequest = {
      json: jest.fn().mockResolvedValue({
        email: 'nonexistent@example.com',
        password: 'testpass'
      }),
    }

    await POST(mockRequest as any)

    expect(mockNextResponse.json).toHaveBeenCalledWith(
      { error: 'Invalid credentials' },
      { status: 401 }
    )
    expect(mockPrisma.user.findUnique).toHaveBeenCalledWith({
      where: { email: 'nonexistent@example.com' },
    })
  })

  it('should return 401 if email is not verified', async () => {
    const mockUser = {
      id: '123',
      email: 'test@example.com',
      password: 'hashedpass',
      emailVerified: false,
      firstName: 'John',
      lastName: 'Doe',
    };

    (mockPrisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser)

    const mockRequest = {
      json: jest.fn().mockResolvedValue({
        email: 'test@example.com',
        password: 'testpass'
      }),
    }

    await POST(mockRequest as any)

    expect(mockNextResponse.json).toHaveBeenCalledWith(
      { error: 'Please verify your email first' },
      { status: 401 }
    )
    expect(mockPrisma.user.findUnique).toHaveBeenCalledWith({
      where: { email: 'test@example.com' },
    })
  })

  it('should return 401 if password is incorrect', async () => {
    const mockUser = {
      id: '123',
      email: 'test@example.com',
      password: 'hashedpass',
      emailVerified: true,
      firstName: 'John',
      lastName: 'Doe',
    };

    (mockPrisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser)
    ;(bcrypt.compare as jest.Mock).mockResolvedValue(false)

    const mockRequest = {
      json: jest.fn().mockResolvedValue({
        email: 'test@example.com',
        password: 'wrongpass'
      }),
    }

    await POST(mockRequest as any)

    expect(mockNextResponse.json).toHaveBeenCalledWith(
      { error: 'Invalid credentials' },
      { status: 401 }
    )
    expect(bcrypt.compare).toHaveBeenCalledWith('wrongpass', 'hashedpass')
  })

  it('should successfully login with correct credentials', async () => {
    const mockUser = {
      id: '123',
      email: 'test@example.com',
      password: 'hashedpass',
      emailVerified: true,
      firstName: 'John',
      lastName: 'Doe',
    };

    const mockToken = 'jwt-token-123';

    (mockPrisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser)
    ;(bcrypt.compare as jest.Mock).mockResolvedValue(true)
    ;(mockGenerateToken as jest.Mock).mockReturnValue(mockToken)

    const mockRequest = {
      json: jest.fn().mockResolvedValue({
        email: 'test@example.com',
        password: 'correctpass'
      }),
    }

    await POST(mockRequest as any)

    expect(mockNextResponse.json).toHaveBeenCalledWith({
      token: mockToken,
      user: {
        id: '123',
        email: 'test@example.com',
        firstName: 'John',
        lastName: 'Doe',
      },
    })
    expect(mockGenerateToken).toHaveBeenCalledWith({
      userId: '123',
      email: 'test@example.com',
      role: 'user',
    })
  })

  it('should handle database errors gracefully', async () => {
    (mockPrisma.user.findUnique as jest.Mock).mockRejectedValue(new Error('Database connection failed'))

    const mockRequest = {
      json: jest.fn().mockResolvedValue({
        email: 'test@example.com',
        password: 'testpass'
      }),
    }

    await POST(mockRequest as any)

    expect(mockNextResponse.json).toHaveBeenCalledWith(
      { error: 'Login failed' },
      { status: 500 }
    )
  })

  it('should handle token generation errors', async () => {
    const mockUser = {
      id: '123',
      email: 'test@example.com',
      password: 'hashedpass',
      emailVerified: true,
      firstName: 'John',
      lastName: 'Doe',
    };

    (mockPrisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser)
    ;(bcrypt.compare as jest.Mock).mockResolvedValue(true)
    ;(mockGenerateToken as jest.Mock).mockImplementation(() => {
      throw new Error('JWT generation failed')
    })

    const mockRequest = {
      json: jest.fn().mockResolvedValue({
        email: 'test@example.com',
        password: 'correctpass'
      }),
    }

    await POST(mockRequest as any)

    expect(mockNextResponse.json).toHaveBeenCalledWith(
      { error: 'Login failed' },
      { status: 500 }
    )
  })

  it('should handle bcrypt errors', async () => {
    const mockUser = {
      id: '123',
      email: 'test@example.com',
      password: 'hashedpass',
      emailVerified: true,
      firstName: 'John',
      lastName: 'Doe',
    };

    (mockPrisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser)
    ;(bcrypt.compare as jest.Mock).mockRejectedValue(new Error('Bcrypt error'))

    const mockRequest = {
      json: jest.fn().mockResolvedValue({
        email: 'test@example.com',
        password: 'testpass'
      }),
    }

    await POST(mockRequest as any)

    expect(mockNextResponse.json).toHaveBeenCalledWith(
      { error: 'Login failed' },
      { status: 500 }
    )
  })

  it('should handle malformed JSON in request', async () => {
    const mockRequest = {
      json: jest.fn().mockRejectedValue(new Error('Invalid JSON')),
    }

    await POST(mockRequest as any)

    expect(mockNextResponse.json).toHaveBeenCalledWith(
      { error: 'Login failed' },
      { status: 500 }
    )
  })

  it('should handle SQL injection attempts safely', async () => {
    // Since we use Prisma, SQL injection should be prevented
    const maliciousEmail = "'; DROP TABLE users; --";

    (mockPrisma.user.findUnique as jest.Mock).mockResolvedValue(null)

    const mockRequest = {
      json: jest.fn().mockResolvedValue({
        email: maliciousEmail,
        password: 'testpass'
      }),
    }

    await POST(mockRequest as any)

    expect(mockNextResponse.json).toHaveBeenCalledWith(
      { error: 'Invalid credentials' },
      { status: 401 }
    )
    expect(mockPrisma.user.findUnique).toHaveBeenCalledWith({
      where: { email: maliciousEmail },
    })
  })

  it('should handle XSS attempts in input', async () => {
    const maliciousEmail = '<script>alert("xss")</script>@example.com';

    (mockPrisma.user.findUnique as jest.Mock).mockResolvedValue(null)

    const mockRequest = {
      json: jest.fn().mockResolvedValue({
        email: maliciousEmail,
        password: '<img src=x onerror=alert(1)>'
      }),
    }

    await POST(mockRequest as any)

    expect(mockNextResponse.json).toHaveBeenCalledWith(
      { error: 'Invalid credentials' },
      { status: 401 }
    )
    // Note: In a real app, input sanitization should be added, but this tests that the endpoint doesn't crash
  })

  it('should handle empty strings as missing fields', async () => {
    const mockRequest = {
      json: jest.fn().mockResolvedValue({
        email: '',
        password: ''
      }),
    }

    await POST(mockRequest as any)

    expect(mockNextResponse.json).toHaveBeenCalledWith(
      { error: 'Email and password are required' },
      { status: 400 }
    )
  })

  it('should handle whitespace-only inputs as missing fields', async () => {
    const mockRequest = {
      json: jest.fn().mockResolvedValue({
        email: '   ',
        password: '   '
      }),
    }

    await POST(mockRequest as any)

    expect(mockNextResponse.json).toHaveBeenCalledWith(
      { error: 'Email and password are required' },
      { status: 400 }
    )
  })
})