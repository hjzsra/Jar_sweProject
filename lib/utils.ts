// Utility functions
// Calculate distance between two coordinates (Haversine formula)
export function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371 // Earth's radius in kilometers
  const dLat = toRad(lat2 - lat1)
  const dLon = toRad(lon2 - lon1)
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return R * c // Distance in kilometers
}

function toRad(degrees: number): number {
  return degrees * (Math.PI / 180)
}

// Validate university email format
export function isValidUniversityEmail(email: string): boolean {
  // Allow any Saudi or Qatar educational institution
  const eduPattern = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.(edu\.sa|edu\.qa)$/i
  return eduPattern.test(email)
}

// Format currency in Saudi Riyals (SAR)
export function formatCurrency(amount: number): string {
  return `${amount.toFixed(2)} ر.س`
}

