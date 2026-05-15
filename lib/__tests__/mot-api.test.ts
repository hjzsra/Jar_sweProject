import {
  verifyLicense,
  verifyVehicleRegistration,
  checkInsuranceStatus,
  clearCache,
  resetRateLimiter,
  resetAuthToken,
  LicenseVerificationResult,
  VehicleRegistrationResult,
  InsuranceStatusResult,
} from '../mot-api'

// Mock fetch
const mockFetch = jest.fn()
global.fetch = mockFetch

// Mock process.env
const mockEnv = {
  MOT_API_URL: 'https://api.mot.example.com',
  MOT_API_KEY: 'test-api-key',
}
process.env = { ...process.env, ...mockEnv }

// Mock console.log
const mockConsoleLog = jest.spyOn(console, 'log').mockImplementation()

describe('MOT API Integration', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    clearCache()
    resetRateLimiter()
    resetAuthToken()
  })

  afterEach(() => {
    mockConsoleLog.mockClear()
  })

  describe('API Authentication and Token Management', () => {
    it('should get auth token successfully', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ token: 'test-token', expiresIn: 3600 }),
      })

      // Call any function that triggers auth
      await verifyLicense('12345')

      expect(mockFetch).toHaveBeenCalledWith('https://api.mot.example.com/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ apiKey: 'test-api-key' }),
      })
    })

    it('should reuse cached token', async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ token: 'test-token', expiresIn: 3600 }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ valid: true, licenseNumber: '12345' }),
        })

      await verifyLicense('12345')
      await verifyLicense('67890')

      expect(mockFetch).toHaveBeenCalledTimes(2) // auth + first license
    })

    it('should handle auth failure', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
      })

      await expect(verifyLicense('12345')).rejects.toThrow()
    })
  })

  describe('Driver License Verification', () => {
    it('should verify valid license successfully', async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ token: 'test-token', expiresIn: 3600 }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            valid: true,
            licenseNumber: '12345',
            name: 'John Doe',
            expiryDate: '2025-12-31',
          }),
        })

      const result = await verifyLicense('12345')

      expect(result).toEqual({
        valid: true,
        licenseNumber: '12345',
        name: 'John Doe',
        expiryDate: '2025-12-31',
      })
      expect(mockConsoleLog).toHaveBeenCalledWith(
        expect.stringMatching(/info.*Verifying license 12345/),
        undefined
      )
    })

    it('should handle invalid license', async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ token: 'test-token', expiresIn: 3600 }),
        })
        .mockResolvedValueOnce({
          ok: false,
        })

      const result = await verifyLicense('invalid')

      expect(result.valid).toBe(false)
      expect(result.licenseNumber).toBe('invalid')
    })

    it('should use cached result', async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ token: 'test-token', expiresIn: 3600 }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            valid: true,
            licenseNumber: '12345',
            name: 'John Doe',
          }),
        })

      await verifyLicense('12345')
      const result = await verifyLicense('12345')

      expect(mockFetch).toHaveBeenCalledTimes(2) // auth + first call
      expect(result.name).toBe('John Doe')
      expect(mockConsoleLog).toHaveBeenCalledWith(
        expect.stringMatching(/info.*License verification cached/),
        undefined
      )
    })
  })

  describe('Vehicle Registration Validation', () => {
    it('should verify valid vehicle registration', async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ token: 'test-token', expiresIn: 3600 }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            valid: true,
            registrationNumber: 'ABC123',
            make: 'Toyota',
            model: 'Corolla',
            year: 2020,
            owner: 'Jane Doe',
          }),
        })

      const result = await verifyVehicleRegistration('ABC123')

      expect(result).toEqual({
        valid: true,
        registrationNumber: 'ABC123',
        make: 'Toyota',
        model: 'Corolla',
        year: 2020,
        owner: 'Jane Doe',
      })
    })

    it('should handle invalid registration', async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ token: 'test-token', expiresIn: 3600 }),
        })
        .mockResolvedValueOnce({
          ok: false,
        })

      const result = await verifyVehicleRegistration('invalid')

      expect(result.valid).toBe(false)
    })
  })

  describe('Vehicle Insurance Status Checks', () => {
    it('should check valid insurance status', async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ token: 'test-token', expiresIn: 3600 }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            valid: true,
            vehicleId: 'veh123',
            provider: 'Insurance Co',
            expiryDate: '2025-12-31',
            coverage: 'Comprehensive',
          }),
        })

      const result = await checkInsuranceStatus('veh123')

      expect(result).toEqual({
        valid: true,
        vehicleId: 'veh123',
        provider: 'Insurance Co',
        expiryDate: '2025-12-31',
        coverage: 'Comprehensive',
      })
    })

    it('should handle invalid insurance', async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ token: 'test-token', expiresIn: 3600 }),
        })
        .mockResolvedValueOnce({
          ok: false,
        })

      const result = await checkInsuranceStatus('invalid')

      expect(result.valid).toBe(false)
    })
  })

  describe('Rate Limiting and Request Throttling', () => {
    it('should allow requests within rate limit', async () => {
      mockFetch
        .mockResolvedValue({
          ok: true,
          json: async () => ({ token: 'test-token', expiresIn: 3600 }),
        })
        .mockResolvedValue({
          ok: true,
          json: async () => ({ valid: true, licenseNumber: '12345' }),
        })

      // Make 10 requests (should be allowed)
      for (let i = 0; i < 10; i++) {
        await verifyLicense(`license${i}`)
      }

      expect(mockConsoleLog).not.toHaveBeenCalledWith(
        expect.stringMatching(/warn.*Rate limit exceeded/),
        undefined
      )
    })

    it('should throttle requests exceeding rate limit', async () => {
      mockFetch
        .mockResolvedValue({
          ok: true,
          json: async () => ({ token: 'test-token', expiresIn: 3600 }),
        })
        .mockResolvedValue({
          ok: true,
          json: async () => ({ valid: true, licenseNumber: '12345' }),
        })

      // Make 11 requests (11th should be blocked)
      for (let i = 0; i < 10; i++) {
        await verifyLicense(`license${i}`)
      }

      await expect(verifyLicense('license11')).rejects.toThrow('Rate limit exceeded')
      expect(mockConsoleLog).toHaveBeenCalledWith(
        expect.stringMatching(/warn.*Rate limit exceeded/),
        undefined
      )
    })
  })

  describe('Error Handling', () => {
    it('should handle network errors with fallback', async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ token: 'test-token', expiresIn: 3600 }),
        })
        .mockRejectedValueOnce(new Error('Network Error'))

      const result = await verifyLicense('12345')

      // Should return fallback (mock success)
      expect(result.valid).toBe(true)
      expect(result.licenseNumber).toBe('12345')
      expect(result.name).toBe('Mock Driver')
      expect(mockConsoleLog).toHaveBeenCalledWith(
        expect.stringMatching(/error.*License verification failed/),
        expect.any(Error)
      )
    })

    it('should handle timeout errors', async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ token: 'test-token', expiresIn: 3600 }),
        })
        .mockRejectedValueOnce(new Error('Timeout'))

      const result = await verifyLicense('12345')

      expect(result.valid).toBe(true) // fallback
    })

    it('should handle invalid API responses', async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ token: 'test-token', expiresIn: 3600 }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ invalid: 'response' }), // missing valid field
        })

      const result = await verifyLicense('12345')

      expect(result.valid).toBe(false) // defaults to false
    })
  })

  describe('Response Parsing and Data Transformation', () => {
    it('should parse and transform license response correctly', async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ token: 'test-token', expiresIn: 3600 }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            valid: true,
            licenseNumber: '12345',
            name: 'John Doe',
            expiryDate: '2025-12-31',
          }),
        })

      const result: LicenseVerificationResult = await verifyLicense('12345')

      expect(result).toMatchObject({
        valid: true,
        licenseNumber: '12345',
        name: 'John Doe',
        expiryDate: '2025-12-31',
      })
      expect(typeof result.valid).toBe('boolean')
      expect(typeof result.licenseNumber).toBe('string')
    })

    it('should parse and transform vehicle registration response', async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ token: 'test-token', expiresIn: 3600 }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            valid: true,
            registrationNumber: 'ABC123',
            make: 'Toyota',
            model: 'Corolla',
            year: 2020,
            owner: 'Jane Doe',
          }),
        })

      const result: VehicleRegistrationResult = await verifyVehicleRegistration('ABC123')

      expect(result).toMatchObject({
        valid: true,
        registrationNumber: 'ABC123',
        make: 'Toyota',
        model: 'Corolla',
        year: 2020,
        owner: 'Jane Doe',
      })
      expect(typeof result.year).toBe('number')
    })

    it('should parse and transform insurance status response', async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ token: 'test-token', expiresIn: 3600 }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            valid: true,
            vehicleId: 'veh123',
            provider: 'Insurance Co',
            expiryDate: '2025-12-31',
            coverage: 'Comprehensive',
          }),
        })

      const result: InsuranceStatusResult = await checkInsuranceStatus('veh123')

      expect(result).toMatchObject({
        valid: true,
        vehicleId: 'veh123',
        provider: 'Insurance Co',
        expiryDate: '2025-12-31',
        coverage: 'Comprehensive',
      })
    })
  })

  describe('Caching Mechanisms', () => {
    it('should cache license verification results', async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ token: 'test-token', expiresIn: 3600 }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            valid: true,
            licenseNumber: '12345',
            name: 'John Doe',
          }),
        })

      await verifyLicense('12345')
      await verifyLicense('12345') // should use cache

      expect(mockFetch).toHaveBeenCalledTimes(2) // auth + first call
    })

    it('should cache vehicle registration results', async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ token: 'test-token', expiresIn: 3600 }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            valid: true,
            registrationNumber: 'ABC123',
            make: 'Toyota',
          }),
        })

      await verifyVehicleRegistration('ABC123')
      await verifyVehicleRegistration('ABC123')

      expect(mockFetch).toHaveBeenCalledTimes(2)
    })

    it('should cache insurance status results', async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ token: 'test-token', expiresIn: 3600 }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            valid: true,
            vehicleId: 'veh123',
            provider: 'Insurance Co',
          }),
        })

      await checkInsuranceStatus('veh123')
      await checkInsuranceStatus('veh123')

      expect(mockFetch).toHaveBeenCalledTimes(2)
    })
  })

  describe('Fallback Handling', () => {
    it('should provide fallback when API is unavailable for license', async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ token: 'test-token', expiresIn: 3600 }),
        })
        .mockRejectedValueOnce(new Error('API unavailable'))

      const result = await verifyLicense('12345')

      expect(result).toEqual({
        valid: true,
        licenseNumber: '12345',
        name: 'Mock Driver',
        expiryDate: '2025-12-31',
      })
    })

    it('should provide fallback when API is unavailable for vehicle', async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ token: 'test-token', expiresIn: 3600 }),
        })
        .mockRejectedValueOnce(new Error('API unavailable'))

      const result = await verifyVehicleRegistration('ABC123')

      expect(result).toEqual({
        valid: true,
        registrationNumber: 'ABC123',
        make: 'Mock Make',
        model: 'Mock Model',
        year: 2020,
        owner: 'Mock Owner',
      })
    })

    it('should provide fallback when API is unavailable for insurance', async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ token: 'test-token', expiresIn: 3600 }),
        })
        .mockRejectedValueOnce(new Error('API unavailable'))

      const result = await checkInsuranceStatus('veh123')

      expect(result).toEqual({
        valid: true,
        vehicleId: 'veh123',
        provider: 'Mock Insurance',
        expiryDate: '2025-12-31',
        coverage: 'Comprehensive',
      })
    })

    it('should use cached fallback when available', async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ token: 'test-token', expiresIn: 3600 }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            valid: true,
            licenseNumber: '12345',
            name: 'Cached Name',
          }),
        })
        .mockRejectedValueOnce(new Error('API unavailable'))

      await verifyLicense('12345') // cache it
      const result = await verifyLicense('12345') // API fails, use cache

      expect(result.name).toBe('Cached Name')
    })
  })

  describe('Request/Response Logging and Monitoring', () => {
    it('should log successful license verification', async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ token: 'test-token', expiresIn: 3600 }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ valid: true, licenseNumber: '12345' }),
        })

      await verifyLicense('12345')

      expect(mockConsoleLog).toHaveBeenCalledWith(
        expect.stringMatching(/info.*Verifying license 12345/),
        undefined
      )
      expect(mockConsoleLog).toHaveBeenCalledWith(
        expect.stringMatching(/info.*License verification successful/),
        undefined
      )
    })

    it('should log errors', async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ token: 'test-token', expiresIn: 3600 }),
        })
        .mockRejectedValueOnce(new Error('Network Error'))

      await verifyLicense('12345')

      expect(mockConsoleLog).toHaveBeenCalledWith(
        expect.stringMatching(/error.*License verification failed/),
        expect.any(Error)
      )
    })

    it('should log rate limit warnings', async () => {
      mockFetch
        .mockResolvedValue({
          ok: true,
          json: async () => ({ token: 'test-token', expiresIn: 3600 }),
        })
        .mockResolvedValue({
          ok: true,
          json: async () => ({ valid: true, licenseNumber: '12345' }),
        })

      for (let i = 0; i < 11; i++) {
        if (i < 10) {
          await verifyLicense(`license${i}`)
        } else {
          try {
            await verifyLicense('license11')
          } catch {}
        }
      }

      expect(mockConsoleLog).toHaveBeenCalledWith(
        expect.stringMatching(/warn.*Rate limit exceeded/),
        undefined
      )
    })

    it('should log cache hits', async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ token: 'test-token', expiresIn: 3600 }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ valid: true, licenseNumber: '12345' }),
        })

      await verifyLicense('12345')
      await verifyLicense('12345')

      expect(mockConsoleLog).toHaveBeenCalledWith(
        expect.stringMatching(/info.*License verification cached/),
        undefined
      )
    })
  })
})