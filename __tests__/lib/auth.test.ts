// Authentication utilities tests
import { generateToken, verifyToken, getTokenFromRequest } from '@/lib/auth'
import { NextRequest } from 'next/server'

// Mock environment variable
process.env.JWT_SECRET = 'test-secret-key'

describe('Auth Utilities', () => {
  const mockPayload = {
    userId: '123',
    email: 'test@example.com',
    role: 'user' as const,
  }

  describe('generateToken', () => {
    it('should generate a valid JWT token', () => {
      const token = generateToken(mockPayload)
      expect(token).toBeTruthy()
      expect(typeof token).toBe('string')
      expect(token.split('.')).toHaveLength(3) // JWT has 3 parts
    })

    it('should generate different tokens for different payloads', () => {
      const token1 = generateToken(mockPayload)
      const token2 = generateToken({ ...mockPayload, userId: '456' })
      expect(token1).not.toBe(token2)
    })
  })

  describe('verifyToken', () => {
    it('should verify a valid token', () => {
      const token = generateToken(mockPayload)
      const decoded = verifyToken(token)
      expect(decoded).toEqual(expect.objectContaining(mockPayload))
    })

    it('should return null for invalid token', () => {
      const decoded = verifyToken('invalid-token')
      expect(decoded).toBeNull()
    })

    it('should return null for expired token', () => {
      const expiredToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiIxMjMiLCJlbWFpbCI6InRlc3RAZXhhbXBsZS5jb20iLCJyb2xlIjoidXNlciIsImlhdCI6MTYwOTQ2MDgwMCwiZXhwIjoxNjA5NDYwODAxfQ.invalid'
      const decoded = verifyToken(expiredToken)
      expect(decoded).toBeNull()
    })
  })

  describe('getTokenFromRequest', () => {
    it('should extract token from Authorization header', () => {
      const headers = new Headers({
        'Authorization': 'Bearer test-token-123',
      })
      const token = getTokenFromRequest(headers)
      expect(token).toBe('test-token-123')
    })

    it('should return null if no Authorization header', () => {
      const headers = new Headers()
      const token = getTokenFromRequest(headers)
      expect(token).toBeNull()
    })

    it('should return null if Authorization header is malformed', () => {
      const headers = new Headers({
        'Authorization': 'InvalidFormat test-token',
      })
      const token = getTokenFromRequest(headers)
      expect(token).toBeNull()
    })
  })
})