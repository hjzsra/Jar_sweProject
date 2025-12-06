/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-require-imports */

import { POST } from '../end/route'

// Mock dependencies
jest.mock('@/lib/prisma', () => ({
  prisma: {
    ride: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    user: {
      update: jest.fn(),
    },
    driver: {
      update: jest.fn(),
    },
  },
}))

jest.mock('@/lib/auth', () => ({
  verifyToken: jest.fn(),
}))

jest.mock('@prisma/client', () => ({
  RideStatus: {
    IN_PROGRESS: 'IN_PROGRESS',
    COMPLETED: 'COMPLETED',
  },
  PaymentStatus: {
    PENDING: 'PENDING',
    PAID: 'PAID',
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
import { verifyToken as mockVerifyToken } from '@/lib/auth'
import { NextResponse as mockNextResponse } from 'next/server'

// Mock request type (removed - not used)

describe('/api/rides/driver/end', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should return 401 if no token provided', async () => {
    const mockRequest = {
      headers: {
        get: jest.fn().mockReturnValue(null),
      },
      json: jest.fn().mockResolvedValue({ rideId: '123' }),
    }

    await POST(mockRequest as any)

    expect(mockNextResponse.json).toHaveBeenCalledWith(
      { error: 'Unauthorized' },
      { status: 401 }
    )
  })

  it('should return 401 if invalid token', async () => {
    mockVerifyToken.mockReturnValue(null)

    const mockRequest = {
      headers: {
        get: jest.fn().mockReturnValue('Bearer invalid-token'),
      },
      json: jest.fn().mockResolvedValue({ rideId: '123' }),
    }

    await POST(mockRequest as any)

    expect(mockNextResponse.json).toHaveBeenCalledWith(
      { error: 'Unauthorized' },
      { status: 401 }
    )
    expect(mockVerifyToken).toHaveBeenCalledWith('invalid-token')
  })

  it('should return 401 if user is not a driver', async () => {
    mockVerifyToken.mockReturnValue({
      userId: '123',
      email: 'user@example.com',
      role: 'user', // Not driver
    })

    const mockRequest = {
      headers: {
        get: jest.fn().mockReturnValue('Bearer valid-token'),
      },
      json: jest.fn().mockResolvedValue({ rideId: '123' }),
    }

    await POST(mockRequest as any)

    expect(mockNextResponse.json).toHaveBeenCalledWith(
      { error: 'Unauthorized' },
      { status: 401 }
    )
  })

  it('should return 400 if rideId not provided', async () => {
    mockVerifyToken.mockReturnValue({
      userId: '123',
      email: 'driver@example.com',
      role: 'driver',
    })

    const mockRequest = {
      headers: {
        get: jest.fn().mockReturnValue('Bearer valid-token'),
      },
      json: jest.fn().mockResolvedValue({}), // No rideId
    }

    await POST(mockRequest as any)

    expect(mockNextResponse.json).toHaveBeenCalledWith(
      { error: 'Ride ID is required' },
      { status: 400 }
    )
  })

  it('should return 404 if ride not found', async () => {
    mockVerifyToken.mockReturnValue({
      userId: '123',
      email: 'driver@example.com',
      role: 'driver',
    })

    mockPrisma.ride.findUnique.mockResolvedValue(null)

    const mockRequest = {
      headers: {
        get: jest.fn().mockReturnValue('Bearer valid-token'),
      },
      json: jest.fn().mockResolvedValue({ rideId: 'non-existent' }),
    }

    await POST(mockRequest as any)

    expect(mockNextResponse.json).toHaveBeenCalledWith(
      { error: 'Ride not found' },
      { status: 404 }
    )
    expect(mockPrisma.ride.findUnique).toHaveBeenCalledWith({
      where: { id: 'non-existent' },
      include: { passengers: true }
    })
  })

  it('should successfully end a ride', async () => {
    const mockRide = {
      id: '123',
      driverId: '123',
      status: 'IN_PROGRESS',
      paymentMethod: 'APPLE_PAY',
      costPerPassenger: 5000, // 50 SAR in cents
      passengers: [
        { id: 'passenger1', firstName: 'John', lastName: 'Doe' },
        { id: 'passenger2', firstName: 'Jane', lastName: 'Smith' }
      ]
    }

    mockVerifyToken.mockReturnValue({
      userId: '123',
      email: 'driver@example.com',
      role: 'driver',
    })

    mockPrisma.ride.findUnique.mockResolvedValue(mockRide)
    mockPrisma.ride.update.mockResolvedValue({
      ...mockRide,
      status: 'COMPLETED',
      tripEndedAt: new Date(),
      paymentStatus: 'PAID',
    })

    const mockRequest = {
      headers: {
        get: jest.fn().mockReturnValue('Bearer valid-token'),
      },
      json: jest.fn().mockResolvedValue({ rideId: '123' }),
    }

    await POST(mockRequest as any)

    expect(mockNextResponse.json).toHaveBeenCalledWith({
      message: 'Trip completed',
      ride: expect.objectContaining({
        status: 'COMPLETED',
        tripEndedAt: expect.any(Date),
        paymentStatus: 'PAID',
      }),
    })
    expect(mockPrisma.ride.update).toHaveBeenCalled()
  })
})