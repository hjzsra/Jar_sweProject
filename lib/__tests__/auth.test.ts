import { generateToken, verifyToken, getTokenFromRequest, TokenPayload } from '../auth'

// Mock environment variables
process.env.JWT_SECRET = 'test-secret-key'

describe('generateToken', () => {
  it('should generate a valid JWT token', () => {
    const payload: TokenPayload = {
      userId: '123',
      email: 'test@example.com',
      role: 'user'
    }

    const token = generateToken(payload)
    expect(typeof token).toBe('string')
    expect(token.length).toBeGreaterThan(0)
  })

  it('should include correct payload in token', () => {
    const payload: TokenPayload = {
      userId: '456',
      email: 'driver@example.com',
      role: 'driver'
    }

    const token = generateToken(payload)
    const decoded = verifyToken(token)

    expect(decoded).toMatchObject(payload)
  })
})

describe('verifyToken', () => {
  it('should verify a valid token', () => {
    const payload: TokenPayload = {
      userId: '789',
      email: 'admin@example.com',
      role: 'admin'
    }

    const token = generateToken(payload)
    const decoded = verifyToken(token)

    expect(decoded).toMatchObject(payload)
  })

  it('should return null for invalid token', () => {
    const invalidToken = 'invalid.jwt.token'
    const decoded = verifyToken(invalidToken)

    expect(decoded).toBeNull()
  })

  it('should return null for expired token', () => {
    // Create a token that expires immediately
    const payload: TokenPayload = {
      userId: '999',
      email: 'expired@example.com',
      role: 'user'
    }

    // Mock jwt.sign to create an expired token
    const jwt = require('jsonwebtoken')
    const expiredToken = jwt.sign(payload, 'test-secret-key', { expiresIn: '-1h' })

    const decoded = verifyToken(expiredToken)
    expect(decoded).toBeNull()
  })
})

describe('getTokenFromRequest', () => {
  it('should extract token from Authorization header', () => {
    const headers = new Headers()
    headers.set('authorization', 'Bearer test-token-123')

    const token = getTokenFromRequest(headers)
    expect(token).toBe('test-token-123')
  })

  it('should return null when no Authorization header', () => {
    const headers = new Headers()

    const token = getTokenFromRequest(headers)
    expect(token).toBeNull()
  })

  it('should return null when Authorization header doesn\'t start with Bearer', () => {
    const headers = new Headers()
    headers.set('authorization', 'Basic test-token-123')

    const token = getTokenFromRequest(headers)
    expect(token).toBeNull()
  })

  it('should handle Bearer with correct case', () => {
    const headers = new Headers()
    headers.set('authorization', 'Bearer test-token-456')

    const token = getTokenFromRequest(headers)
    expect(token).toBe('test-token-456')
  })
})