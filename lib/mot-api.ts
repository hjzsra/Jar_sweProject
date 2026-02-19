// Ministry of Transport API integration
// Handles vehicle registration, driver license, insurance verification, etc.
// This is a mock implementation - replace with real API in production

export interface LicenseVerificationResult {
  valid: boolean
  licenseNumber: string
  name?: string
  expiryDate?: string
}

export interface VehicleRegistrationResult {
  valid: boolean
  registrationNumber: string
  make?: string
  model?: string
  year?: number
  owner?: string
}

export interface InsuranceStatusResult {
  valid: boolean
  vehicleId: string
  provider?: string
  expiryDate?: string
  coverage?: string
}

export interface AuthToken {
  token: string
  expiresAt: number
}

// Simple cache with TTL
class SimpleCache {
  private cache = new Map<string, { data: any; expiresAt: number }>()

  set(key: string, data: any, ttlMs: number = 300000) { // 5 min default
    this.cache.set(key, { data, expiresAt: Date.now() + ttlMs })
  }

  get(key: string): any | null {
    const entry = this.cache.get(key)
    if (!entry) return null
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key)
      return null
    }
    return entry.data
  }

  clear() {
    this.cache.clear()
  }
}

// Simple rate limiter
class RateLimiter {
  private requests = new Map<string, number[]>()

  isAllowed(key: string, maxRequests: number = 10, windowMs: number = 60000): boolean {
    const now = Date.now()
    const windowStart = now - windowMs
    const userRequests = this.requests.get(key) || []
    const recentRequests = userRequests.filter(time => time > windowStart)
    if (recentRequests.length >= maxRequests) return false
    recentRequests.push(now)
    this.requests.set(key, recentRequests)
    return true
  }

  reset() {
    this.requests.clear()
  }
}

// Logger
class Logger {
  log(level: 'info' | 'error' | 'warn', message: string, data?: any) {
    const timestamp = new Date().toISOString()
    console.log(`[${timestamp}] ${level.toUpperCase()}: ${message}`, data || '')
  }
}

const cache = new SimpleCache()
const rateLimiter = new RateLimiter()
const logger = new Logger()

// API authentication and token management
let authToken: AuthToken | null = null

async function getAuthToken(): Promise<string> {
  if (authToken && Date.now() < authToken.expiresAt) {
    return authToken.token
  }

  try {
    // Mock token request
    const response = await fetch(`${process.env.MOT_API_URL}/auth`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ apiKey: process.env.MOT_API_KEY }),
    })

    if (!response.ok) throw new Error('Auth failed')

    const data = await response.json()
    authToken = {
      token: data.token,
      expiresAt: Date.now() + (data.expiresIn || 3600) * 1000,
    }
    logger.log('info', 'MOT API token refreshed')
    return authToken.token
  } catch (error) {
    logger.log('error', 'Failed to get MOT API token', error)
    throw error
  }
}

// Verify driver license through Ministry of Transport API
export async function verifyLicense(licenseNumber: string): Promise<LicenseVerificationResult> {
  const cacheKey = `license:${licenseNumber}`
  const cached = cache.get(cacheKey)
  if (cached) {
    logger.log('info', `License verification cached for ${licenseNumber}`)
    return cached
  }

  // Since this is a mock implementation, always return verified
  logger.log('info', `License verification mock for ${licenseNumber} - always verified`)
  const result: LicenseVerificationResult = {
    valid: true, // Always verified for mock
    licenseNumber,
    name: `Driver ${licenseNumber}`,
    expiryDate: '2025-12-31',
  }

  cache.set(cacheKey, result)
  return result
}

// Verify vehicle registration
export async function verifyVehicleRegistration(registrationNumber: string): Promise<VehicleRegistrationResult> {
  const cacheKey = `vehicle:${registrationNumber}`
  const cached = cache.get(cacheKey)
  if (cached) {
    logger.log('info', `Vehicle registration cached for ${registrationNumber}`)
    return cached
  }

  if (!rateLimiter.isAllowed('vehicle')) {
    logger.log('warn', 'Rate limit exceeded for vehicle registration')
    throw new Error('Rate limit exceeded')
  }

  try {
    const token = await getAuthToken()
    logger.log('info', `Verifying vehicle registration ${registrationNumber}`)

    const response = await fetch(`${process.env.MOT_API_URL}/verify-vehicle`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({ registrationNumber }),
    })

    if (!response.ok) {
      throw new Error(`API error: ${response.status}`)
    }

    const data = await response.json()
    const result: VehicleRegistrationResult = {
      valid: data.valid || false,
      registrationNumber: data.registrationNumber || registrationNumber,
      make: data.make,
      model: data.model,
      year: data.year,
      owner: data.owner,
    }

    cache.set(cacheKey, result)
    logger.log('info', `Vehicle registration verification successful for ${registrationNumber}`)
    return result
  } catch (error) {
    logger.log('error', `Vehicle registration verification failed for ${registrationNumber}`, error)
    // Fallback
    const fallback = cached || {
      valid: true,
      registrationNumber,
      make: 'Mock Make',
      model: 'Mock Model',
      year: 2020,
      owner: 'Mock Owner',
    }
    return fallback
  }
}

// Check vehicle insurance status
export async function checkInsuranceStatus(vehicleId: string): Promise<InsuranceStatusResult> {
  const cacheKey = `insurance:${vehicleId}`
  const cached = cache.get(cacheKey)
  if (cached) {
    logger.log('info', `Insurance status cached for ${vehicleId}`)
    return cached
  }

  if (!rateLimiter.isAllowed('insurance')) {
    logger.log('warn', 'Rate limit exceeded for insurance check')
    throw new Error('Rate limit exceeded')
  }

  try {
    const token = await getAuthToken()
    logger.log('info', `Checking insurance status for ${vehicleId}`)

    const response = await fetch(`${process.env.MOT_API_URL}/insurance-status`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({ vehicleId }),
    })

    if (!response.ok) {
      throw new Error(`API error: ${response.status}`)
    }

    const data = await response.json()
    const result: InsuranceStatusResult = {
      valid: data.valid || false,
      vehicleId: data.vehicleId || vehicleId,
      provider: data.provider,
      expiryDate: data.expiryDate,
      coverage: data.coverage,
    }

    cache.set(cacheKey, result)
    logger.log('info', `Insurance status check successful for ${vehicleId}`)
    return result
  } catch (error) {
    logger.log('error', `Insurance status check failed for ${vehicleId}`, error)
    // Fallback
    const fallback = cached || {
      valid: true,
      vehicleId,
      provider: 'Mock Insurance',
      expiryDate: '2025-12-31',
      coverage: 'Comprehensive',
    }
    return fallback
  }
}

// Clear cache (for testing)
export function clearCache() {
  cache.clear()
}

// Reset rate limiter (for testing)
export function resetRateLimiter() {
  rateLimiter.reset()
}

// Reset auth token (for testing)
export function resetAuthToken() {
  authToken = null
}
