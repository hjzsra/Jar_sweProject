// Utility functions tests
import { calculateDistance, formatCurrency, validatePhoneNumber } from '@/lib/utils'

describe('Utility Functions', () => {
  describe('calculateDistance', () => {
    it('should calculate distance between two coordinates', () => {
      const lat1 = 40.7128 // New York
      const lon1 = -74.0060
      const lat2 = 40.7589 // Also New York, nearby
      const lon2 = -73.9851

      const distance = calculateDistance(lat1, lon1, lat2, lon2)
      expect(distance).toBeGreaterThan(0)
      expect(typeof distance).toBe('number')
    })

    it('should return 0 for same coordinates', () => {
      const lat = 40.7128
      const lon = -74.0060

      const distance = calculateDistance(lat, lon, lat, lon)
      expect(distance).toBe(0)
    })
  })

  describe('formatCurrency', () => {
    it('should format number as currency', () => {
      expect(formatCurrency(25.5)).toBe('$25.50')
      expect(formatCurrency(100)).toBe('$100.00')
      expect(formatCurrency(0.99)).toBe('$0.99')
    })

    it('should handle zero', () => {
      expect(formatCurrency(0)).toBe('$0.00')
    })
  })

  describe('validatePhoneNumber', () => {
    it('should validate correct phone numbers', () => {
      expect(validatePhoneNumber('+1234567890')).toBe(true)
      expect(validatePhoneNumber('123-456-7890')).toBe(true)
      expect(validatePhoneNumber('(123) 456-7890')).toBe(true)
    })

    it('should reject invalid phone numbers', () => {
      expect(validatePhoneNumber('123')).toBe(false)
      expect(validatePhoneNumber('invalid')).toBe(false)
      expect(validatePhoneNumber('')).toBe(false)
    })
  })
})