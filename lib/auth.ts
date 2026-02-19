// Authentication utilities
import jwt from 'jsonwebtoken'

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-this'

if (!process.env.JWT_SECRET) {
  console.warn('⚠️  WARNING: JWT_SECRET not set in environment variables!')
}

// Supports both userId and driverId
export interface TokenPayload {
  userId?: string     // For normal users and drivers (unified approach)
  driverId?: string   // For drivers (legacy support)
  email: string
  role: 'user' | 'driver' | 'admin'
}

// Create token for user/driver/admin
export function generateToken(payload: TokenPayload): string {
  console.log('🔑 Generating token for:', { userId: payload.userId, role: payload.role })
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' })
}

// Verify JWT token
export function verifyToken(token: string): TokenPayload | null {
  try {
    const payload = jwt.verify(token, JWT_SECRET) as TokenPayload
    console.log('✅ Token verified:', { userId: payload.userId, role: payload.role })
    return payload
  } catch (error) {
    console.error('❌ Token verification failed:', error)
    return null
  }
}

// Extract token from HTTP headers
export function getTokenFromRequest(headers: Headers): string | null {
  const authHeader = headers.get('authorization')
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.substring(7)
  }
  return null
}