// Authentication utilities
// Handles JWT token generation and verification
import jwt from 'jsonwebtoken'

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-this'

export interface TokenPayload {
  userId: string
  email: string
  role: 'user' | 'driver' | 'admin'
}

// Generate JWT token for user/driver/admin
export function generateToken(payload: TokenPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' })
}

// Verify JWT token
export function verifyToken(token: string): TokenPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as TokenPayload
  } catch (error) {
    return null
  }
}

// Extract token from request headers
export function getTokenFromRequest(headers: Headers): string | null {
  const authHeader = headers.get('authorization')
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.substring(7)
  }
  return null
}

