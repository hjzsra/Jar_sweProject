// Ride creation API tests
import { POST } from '@/app/api/rides/create/route'
import { prisma } from '@/lib/prisma'
import { verifyToken } from '@/lib/auth'
import { NextRequest } from 'next/server'

jest.mock('@/lib/prisma', () => ({
  prisma: {
    ride: {
      create: jest.fn(),
    },
    user: {
      findUnique: jest.fn(),
    },
    driver: {
      findUnique: jest.fn(),
    },
  },
}))

jest.mock('@/lib/auth')

// Helper function to create a mock NextRequest
const createMockRequest = (body: any, headers: Record<string, string> = {}): NextRequest => {
  return {
    json: async () => body,
    headers: {
      get: (key: string) => {
        const lowerKey = key.toLowerCase();
        const headerKey = Object.keys(headers).find(k => k.toLowerCase() === lowerKey);
        return headerKey ? headers[headerKey] : null;
      },
    },
  } as unknown as NextRequest;
};

describe('Create Ride API', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    ;(verifyToken as jest.Mock).mockReturnValue({
      userId: 'user123',
      email: 'user@test.com',
      role: 'user',
    })
  })

  it('should successfully create a ride', async () => {
    const mockUser = { id: 'user123', gender: 'MALE' };
    const mockDriver = { id: 'driver456', gender: 'MALE', isAvailable: true };
    const mockRide = {
      id: 'ride123',
      passengerId: 'user123',
      driverId: 'driver456',
      pickupLatitude: 40.7128,
      pickupLongitude: -74.0060,
      dropoffLatitude: 40.7589,
      dropoffLongitude: -73.9851,
      status: 'pending',
      cost: 25.50,
    }

    ;(prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);
    ;(prisma.driver.findUnique as jest.Mock).mockResolvedValue(mockDriver);
    ;(prisma.ride.create as jest.Mock).mockResolvedValue(mockRide)

    const requestBody = {
      driverId: 'driver456',
      pickupLatitude: 40.7128,
      pickupLongitude: -74.0060,
      dropoffLatitude: 40.7589,
      dropoffLongitude: -73.9851,
      pickupAddress: '123 Main St',
      dropoffAddress: '456 Park Ave',
      paymentMethod: 'cash',
    }

    const mockRequest = createMockRequest(requestBody, {
        'Authorization': 'Bearer valid-token',
    });

    const response = await POST(mockRequest)
    const data = await response.json()

    expect(response.status).toBe(201)
    expect(data.message).toBe('Ride request created successfully')
    expect(data.ride).toEqual(mockRide)
  })

  it('should return 400 for missing required fields', async () => {
    const requestBody = {
      // Missing required fields
      pickupLatitude: 40.7128,
    }

    const mockRequest = createMockRequest(requestBody, {
        'Authorization': 'Bearer valid-token',
    });

    const response = await POST(mockRequest)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error).toContain('All required fields must be provided')
  })
})