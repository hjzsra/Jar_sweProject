// Driver login API tests
import { POST } from '@/app/api/auth/driver/login/route'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'
import { generateToken } from '@/lib/auth'

jest.mock('@/lib/prisma', () => ({
  prisma: {
    driver: {
      findUnique: jest.fn(),
    },
  },
}))

jest.mock('bcryptjs')
jest.mock('@/lib/auth')

describe('Driver Login API', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should successfully login a driver with valid credentials', async () => {
    const mockDriver = {
      id: 'driver123',
      email: 'driver@test.com',
      password: 'hashedPassword',
      firstName: 'Test',
      lastName: 'Driver',
    }

    const mockToken = 'mock-jwt-token'

    ;(prisma.driver.findUnique as jest.Mock).mockResolvedValue(mockDriver)
    ;(bcrypt.compare as jest.Mock).mockResolvedValue(true)
    ;(generateToken as jest.Mock).mockReturnValue(mockToken)

    const requestBody = {
      email: 'driver@test.com',
      password: 'correctPassword',
    }

    const mockRequest = new NextRequest('http://localhost:3000/api/auth/driver/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    })

    const response = await POST(mockRequest)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.message).toBe('Login successful')
    expect(data.token).toBe(mockToken)
    expect(data.driver).toEqual({
      id: mockDriver.id,
      email: mockDriver.email,
      firstName: mockDriver.firstName,
      lastName: mockDriver.lastName,
    })
  })

  it('should return 401 for invalid credentials', async () => {
    ;(prisma.driver.findUnique as jest.Mock).mockResolvedValue(null)

    const requestBody = {
      email: 'nonexistent@test.com',
      password: 'wrongPassword',
    }

    const mockRequest = new NextRequest('http://localhost:3000/api/auth/driver/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    })

    const response = await POST(mockRequest)
    const data = await response.json()

    expect(response.status).toBe(401)
    expect(data.error).toBe('Invalid credentials')
  })
})