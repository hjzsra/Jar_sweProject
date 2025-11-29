// Driver update location API tests
import { POST } from '@/app/api/driver/update-location/route'
import { prisma } from '@/lib/prisma'
import { verifyToken } from '@/lib/auth'
import { NextRequest } from 'next/server'

// Mock the dependencies
jest.mock('@/lib/prisma', () => ({
  prisma: {
    driver: {
      update: jest.fn(),
    },
  },
}))

jest.mock('@/lib/auth', () => ({
  verifyToken: jest.fn(),
}))

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


describe('Driver Update Location API', () => {
  let mockRequest: NextRequest
  let mockDriver: any

  beforeEach(() => {
    jest.clearAllMocks()
    
    mockDriver = {
      id: 'driver123',
      currentLatitude: 40.7128,
      currentLongitude: -74.0060,
      isAvailable: true,
    }

    // Setup default successful token verification
    (verifyToken as jest.Mock).mockReturnValue({
      userId: 'driver123',
      email: 'driver@test.com',
      role: 'driver',
    })

    // Setup default successful database update
    (prisma.driver.update as jest.Mock).mockResolvedValue(mockDriver)
  })

  describe('POST /api/driver/update-location', () => {
    it('should successfully update driver location', async () => {
      const requestBody = {
        latitude: 40.7589,
        longitude: -73.9851,
        isAvailable: true,
      }

      const updatedDriverData = {
        id: 'driver123',
        currentLatitude: requestBody.latitude,
        currentLongitude: requestBody.longitude,
        isAvailable: requestBody.isAvailable,
      };
      (prisma.driver.update as jest.Mock).mockResolvedValue(updatedDriverData);

      mockRequest = createMockRequest(requestBody, {
        'Authorization': 'Bearer valid-token',
      })

      const response = await POST(mockRequest)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.message).toBe('Location updated')
      expect(data.driver).toEqual(updatedDriverData)

      expect(prisma.driver.update).toHaveBeenCalledWith({
        where: { id: 'driver123' },
        data: {
          currentLatitude: requestBody.latitude,
          currentLongitude: requestBody.longitude,
          isAvailable: requestBody.isAvailable,
        },
      })
    })

    it('should return 401 if no authorization header', async () => {
      mockRequest = createMockRequest({
          latitude: 40.7589,
          longitude: -73.9851,
        }, {}) // No authorization header

      const response = await POST(mockRequest)
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.error).toBe('Unauthorized')
      expect(prisma.driver.update).not.toHaveBeenCalled()
    })

    it('should return 400 if latitude or longitude is missing', async () => {
      mockRequest = createMockRequest({
          // Missing latitude and longitude
          isAvailable: true,
        }, {
          'Authorization': 'Bearer valid-token',
        })

      const response = await POST(mockRequest)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Latitude and longitude are required')
      expect(prisma.driver.update).not.toHaveBeenCalled()
    })

    it('should return 500 if database update fails', async () => {
      (prisma.driver.update as jest.Mock).mockRejectedValue(new Error('Database error'))

      mockRequest = createMockRequest({
          latitude: 40.7589,
          longitude: -73.9851,
        }, {
          'Authorization': 'Bearer valid-token',
        })

      const response = await POST(mockRequest)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toBe('Failed to update location')
    })
  })
})