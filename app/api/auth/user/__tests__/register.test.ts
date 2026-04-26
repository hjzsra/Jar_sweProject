/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unused-vars */

import { POST } from '../register/route'

// Mock dependencies
jest.mock('@/lib/prisma', () => ({
  prisma: {
    user: {
      findUnique: jest.fn(),
      create: jest.fn(),
    },
  },
}))

jest.mock('@/lib/email', () => ({
  generateOTP: jest.fn(),
  sendOTP: jest.fn(),
}))

jest.mock('@/lib/utils', () => ({
  isValidUniversityEmail: jest.fn(),
}))

jest.mock('bcryptjs', () => ({
  hash: jest.fn(),
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
import { generateOTP as mockGenerateOTP, sendOTP as mockSendOTP } from '@/lib/email'
import { isValidUniversityEmail as mockIsValidUniversityEmail } from '@/lib/utils'
import bcrypt from 'bcryptjs'
import { NextResponse as mockNextResponse } from 'next/server'

describe('/api/auth/user/register', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should return 400 if email is missing', async () => {
    const mockRequest = {
      json: jest.fn().mockResolvedValue({
        password: 'testpass',
        firstName: 'John',
        lastName: 'Doe',
        phone: '1234567890',
        gender: 'male',
        university: 'Test University'
      }),
    }

    await POST(mockRequest as any)

    expect(mockNextResponse.json).toHaveBeenCalledWith(
      { error: 'All fields are required' },
      { status: 400 }
    )
  })

  it('should return 400 if password is missing', async () => {
    const mockRequest = {
      json: jest.fn().mockResolvedValue({
        email: 'test@university.edu.sa',
        firstName: 'John',
        lastName: 'Doe',
        phone: '1234567890',
        gender: 'male',
        university: 'Test University'
      }),
    }

    await POST(mockRequest as any)

    expect(mockNextResponse.json).toHaveBeenCalledWith(
      { error: 'All fields are required' },
      { status: 400 }
    )
  })

  it('should return 400 if firstName is missing', async () => {
    const mockRequest = {
      json: jest.fn().mockResolvedValue({
        email: 'test@university.edu.sa',
        password: 'testpass',
        lastName: 'Doe',
        phone: '1234567890',
        gender: 'male',
        university: 'Test University'
      }),
    }

    await POST(mockRequest as any)

    expect(mockNextResponse.json).toHaveBeenCalledWith(
      { error: 'All fields are required' },
      { status: 400 }
    )
  })

  it('should return 400 if lastName is missing', async () => {
    const mockRequest = {
      json: jest.fn().mockResolvedValue({
        email: 'test@university.edu.sa',
        password: 'testpass',
        firstName: 'John',
        phone: '1234567890',
        gender: 'male',
        university: 'Test University'
      }),
    }

    await POST(mockRequest as any)

    expect(mockNextResponse.json).toHaveBeenCalledWith(
      { error: 'All fields are required' },
      { status: 400 }
    )
  })

  it('should return 400 if phone is missing', async () => {
    const mockRequest = {
      json: jest.fn().mockResolvedValue({
        email: 'test@university.edu.sa',
        password: 'testpass',
        firstName: 'John',
        lastName: 'Doe',
        gender: 'male',
        university: 'Test University'
      }),
    }

    await POST(mockRequest as any)

    expect(mockNextResponse.json).toHaveBeenCalledWith(
      { error: 'All fields are required' },
      { status: 400 }
    )
  })

  it('should return 400 if gender is missing', async () => {
    const mockRequest = {
      json: jest.fn().mockResolvedValue({
        email: 'test@university.edu.sa',
        password: 'testpass',
        firstName: 'John',
        lastName: 'Doe',
        phone: '1234567890',
        university: 'Test University'
      }),
    }

    await POST(mockRequest as any)

    expect(mockNextResponse.json).toHaveBeenCalledWith(
      { error: 'All fields are required' },
      { status: 400 }
    )
  })

  it('should return 400 if university is missing', async () => {
    const mockRequest = {
      json: jest.fn().mockResolvedValue({
        email: 'test@university.edu.sa',
        password: 'testpass',
        firstName: 'John',
        lastName: 'Doe',
        phone: '1234567890',
        gender: 'male'
      }),
    }

    await POST(mockRequest as any)

    expect(mockNextResponse.json).toHaveBeenCalledWith(
      { error: 'All fields are required' },
      { status: 400 }
    )
  })

  it('should return 400 if email is invalid university email', async () => {
    ;(mockIsValidUniversityEmail as jest.Mock).mockReturnValue(false)

    const mockRequest = {
      json: jest.fn().mockResolvedValue({
        email: 'test@gmail.com',
        password: 'testpass',
        firstName: 'John',
        lastName: 'Doe',
        phone: '1234567890',
        gender: 'male',
        university: 'Test University'
      }),
    }

    await POST(mockRequest as any)

    expect(mockNextResponse.json).toHaveBeenCalledWith(
      { error: 'Please use a valid university email address' },
      { status: 400 }
    )
    expect(mockIsValidUniversityEmail).toHaveBeenCalledWith('test@gmail.com')
  })

  it('should return 400 if user already exists', async () => {
    ;(mockIsValidUniversityEmail as jest.Mock).mockReturnValue(true)
    ;(mockPrisma.user.findUnique as jest.Mock).mockResolvedValue({
      id: 'existing-id',
      email: 'test@university.edu.sa'
    })

    const mockRequest = {
      json: jest.fn().mockResolvedValue({
        email: 'test@university.edu.sa',
        password: 'testpass',
        firstName: 'John',
        lastName: 'Doe',
        phone: '1234567890',
        gender: 'male',
        university: 'Test University'
      }),
    }

    await POST(mockRequest as any)

    expect(mockNextResponse.json).toHaveBeenCalledWith(
      { error: 'User with this email already exists' },
      { status: 400 }
    )
    expect(mockPrisma.user.findUnique).toHaveBeenCalledWith({
      where: { email: 'test@university.edu.sa' },
    })
  })

  it('should successfully register a new user', async () => {
    ;(mockIsValidUniversityEmail as jest.Mock).mockReturnValue(true)
    ;(mockPrisma.user.findUnique as jest.Mock).mockResolvedValue(null)
    ;(bcrypt.hash as jest.Mock).mockResolvedValue('hashedpassword')
    ;(mockGenerateOTP as jest.Mock).mockReturnValue('123456')
    ;(mockSendOTP as jest.Mock).mockResolvedValue(true)
    ;(mockPrisma.user.create as jest.Mock).mockResolvedValue({
      id: 'new-user-id',
      email: 'test@university.edu.sa',
      firstName: 'John',
      lastName: 'Doe',
      phone: '1234567890',
      gender: 'male',
      university: 'Test University',
      emailVerified: false,
      otpCode: '123456',
      otpExpires: new Date(Date.now() + 10 * 60 * 1000)
    })

    const mockRequest = {
      json: jest.fn().mockResolvedValue({
        email: 'test@university.edu.sa',
        password: 'testpass',
        firstName: 'John',
        lastName: 'Doe',
        phone: '1234567890',
        gender: 'male',
        university: 'Test University'
      }),
    }

    await POST(mockRequest as any)

    expect(mockNextResponse.json).toHaveBeenCalledWith({
      message: 'Registration successful. Please check your email for verification code.',
      userId: 'new-user-id',
    })
    expect(bcrypt.hash).toHaveBeenCalledWith('testpass', 10)
    expect(mockGenerateOTP).toHaveBeenCalled()
    expect(mockSendOTP).toHaveBeenCalledWith('test@university.edu.sa', '123456')
    expect(mockPrisma.user.create).toHaveBeenCalledWith({
      data: {
        email: 'test@university.edu.sa',
        password: 'hashedpassword',
        firstName: 'John',
        lastName: 'Doe',
        phone: '1234567890',
        gender: 'male',
        university: 'Test University',
        otpCode: '123456',
        otpExpires: expect.any(Date),
        emailVerified: false,
      },
    })
  })

  it('should handle email sending failure gracefully', async () => {
    ;(mockIsValidUniversityEmail as jest.Mock).mockReturnValue(true)
    ;(mockPrisma.user.findUnique as jest.Mock).mockResolvedValue(null)
    ;(bcrypt.hash as jest.Mock).mockResolvedValue('hashedpassword')
    ;(mockGenerateOTP as jest.Mock).mockReturnValue('123456')
    ;(mockSendOTP as jest.Mock).mockResolvedValue(false) // Email fails
    ;(mockPrisma.user.create as jest.Mock).mockResolvedValue({
      id: 'new-user-id',
      email: 'test@university.edu.sa'
    })

    const mockRequest = {
      json: jest.fn().mockResolvedValue({
        email: 'test@university.edu.sa',
        password: 'testpass',
        firstName: 'John',
        lastName: 'Doe',
        phone: '1234567890',
        gender: 'male',
        university: 'Test University'
      }),
    }

    await POST(mockRequest as any)

    // Should fail if email fails
    expect(mockNextResponse.json).toHaveBeenCalledWith(
      { error: 'Failed to send verification email. Please try again.' },
      { status: 500 }
    )
  })

  it('should handle database errors during user lookup', async () => {
    ;(mockIsValidUniversityEmail as jest.Mock).mockReturnValue(true)
    ;(mockPrisma.user.findUnique as jest.Mock).mockRejectedValue(new Error('Database error'))

    const mockRequest = {
      json: jest.fn().mockResolvedValue({
        email: 'test@university.edu.sa',
        password: 'testpass',
        firstName: 'John',
        lastName: 'Doe',
        phone: '1234567890',
        gender: 'male',
        university: 'Test University'
      }),
    }

    await POST(mockRequest as any)

    expect(mockNextResponse.json).toHaveBeenCalledWith(
      { error: 'Registration failed' },
      { status: 500 }
    )
  })

  it('should handle database errors during user creation', async () => {
    ;(mockIsValidUniversityEmail as jest.Mock).mockReturnValue(true)
    ;(mockPrisma.user.findUnique as jest.Mock).mockResolvedValue(null)
    ;(bcrypt.hash as jest.Mock).mockResolvedValue('hashedpassword')
    ;(mockGenerateOTP as jest.Mock).mockReturnValue('123456')
    ;(mockPrisma.user.create as jest.Mock).mockRejectedValue(new Error('Database error'))

    const mockRequest = {
      json: jest.fn().mockResolvedValue({
        email: 'test@university.edu.sa',
        password: 'testpass',
        firstName: 'John',
        lastName: 'Doe',
        phone: '1234567890',
        gender: 'male',
        university: 'Test University'
      }),
    }

    await POST(mockRequest as any)

    expect(mockNextResponse.json).toHaveBeenCalledWith(
      { error: 'Registration failed' },
      { status: 500 }
    )
  })

  it('should handle bcrypt hashing errors', async () => {
    ;(mockIsValidUniversityEmail as jest.Mock).mockReturnValue(true)
    ;(mockPrisma.user.findUnique as jest.Mock).mockResolvedValue(null)
    ;(bcrypt.hash as jest.Mock).mockRejectedValue(new Error('Hashing error'))

    const mockRequest = {
      json: jest.fn().mockResolvedValue({
        email: 'test@university.edu.sa',
        password: 'testpass',
        firstName: 'John',
        lastName: 'Doe',
        phone: '1234567890',
        gender: 'male',
        university: 'Test University'
      }),
    }

    await POST(mockRequest as any)

    expect(mockNextResponse.json).toHaveBeenCalledWith(
      { error: 'Registration failed' },
      { status: 500 }
    )
  })

  it('should handle malformed JSON in request', async () => {
    const mockRequest = {
      json: jest.fn().mockRejectedValue(new Error('Invalid JSON')),
    }

    await POST(mockRequest as any)

    expect(mockNextResponse.json).toHaveBeenCalledWith(
      { error: 'Registration failed' },
      { status: 500 }
    )
  })

  it('should handle empty strings as missing fields', async () => {
    const mockRequest = {
      json: jest.fn().mockResolvedValue({
        email: '',
        password: '',
        firstName: '',
        lastName: '',
        phone: '',
        gender: '',
        university: ''
      }),
    }

    await POST(mockRequest as any)

    expect(mockNextResponse.json).toHaveBeenCalledWith(
      { error: 'All fields are required' },
      { status: 400 }
    )
  })

  it('should handle whitespace-only inputs as missing fields', async () => {
    const mockRequest = {
      json: jest.fn().mockResolvedValue({
        email: '   ',
        password: '   ',
        firstName: '   ',
        lastName: '   ',
        phone: '   ',
        gender: '   ',
        university: '   '
      }),
    }

    await POST(mockRequest as any)

    expect(mockNextResponse.json).toHaveBeenCalledWith(
      { error: 'All fields are required' },
      { status: 400 }
    )
  })

  it('should handle XSS attempts in input fields', async () => {
    ;(mockIsValidUniversityEmail as jest.Mock).mockReturnValue(true)
    ;(mockPrisma.user.findUnique as jest.Mock).mockResolvedValue(null)
    ;(bcrypt.hash as jest.Mock).mockResolvedValue('hashedpassword')
    ;(mockGenerateOTP as jest.Mock).mockReturnValue('123456')
    ;(mockSendOTP as jest.Mock).mockResolvedValue(true)
    ;(mockPrisma.user.create as jest.Mock).mockResolvedValue({
      id: 'new-user-id',
      email: 'test@university.edu.sa'
    })

    const mockRequest = {
      json: jest.fn().mockResolvedValue({
        email: 'test@university.edu.sa',
        password: 'testpass',
        firstName: '<script>alert("xss")</script>',
        lastName: 'Doe',
        phone: '1234567890',
        gender: 'male',
        university: 'Test University'
      }),
    }

    await POST(mockRequest as any)

    // Should still process the request (input sanitization should be handled elsewhere)
    expect(mockNextResponse.json).toHaveBeenCalledWith({
      message: 'Registration successful. Please check your email for verification code.',
      userId: 'new-user-id',
    })
  })
})