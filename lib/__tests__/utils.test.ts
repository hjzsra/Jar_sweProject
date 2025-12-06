import { isValidUniversityEmail, calculateDistance, formatCurrency } from '../utils'

describe('isValidUniversityEmail', () => {
  it('should return true for valid university emails', () => {
    expect(isValidUniversityEmail('test@sm.imamu.edu.sa')).toBe(true)
    expect(isValidUniversityEmail('student@ksu.edu.sa')).toBe(true)
    expect(isValidUniversityEmail('user@domain.edu.sa')).toBe(true)
  })

  it('should return false for invalid emails', () => {
    expect(isValidUniversityEmail('test@gmail.com')).toBe(false)
    expect(isValidUniversityEmail('invalid')).toBe(false)
    expect(isValidUniversityEmail('test@sm.edu.com')).toBe(false)
    expect(isValidUniversityEmail('')).toBe(false)
  })
})

describe('calculateDistance', () => {
  it('should calculate distance between two points correctly', () => {
    // Distance between (0,0) and (0,0) should be 0
    expect(calculateDistance(0, 0, 0, 0)).toBe(0)

    // Approximate distance between location  in Riyadh (should be around 500-600km)
    const distance = calculateDistance(25.276987, 51.520008, 24.7136, 46.6753)
    expect(distance).toBeGreaterThan(400)
    expect(distance).toBeLessThan(700)
  })

  it('should handle same latitude different longitude', () => {
    const distance = calculateDistance(0, 0, 0, 1)
    expect(distance).toBeGreaterThan(100) // Approximately 111km for 1 degree at equator
  })
})

describe('formatCurrency', () => {
  it('should format currency correctly', () => {
    expect(formatCurrency(100)).toBe('100.00 ر.س')
    expect(formatCurrency(50.5)).toBe('50.50 ر.س')
    expect(formatCurrency(0)).toBe('0.00 ر.س')
  })

  it('should handle decimal places', () => {
    expect(formatCurrency(10.123)).toBe('10.12 ر.س')
    expect(formatCurrency(10.129)).toBe('10.13 ر.س')
  })
})
