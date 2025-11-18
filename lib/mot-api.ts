// Ministry of Transport API integration
// Verifies driver license through MOT API
// This is a mock implementation - replace with real API in production

export interface LicenseVerificationResult {
  valid: boolean
  licenseNumber: string
  name?: string
  expiryDate?: string
}

// Verify driver license through Ministry of Transport API
export async function verifyLicense(licenseNumber: string): Promise<LicenseVerificationResult> {
  try {
    // Mock API call - replace with real API endpoint
    const response = await fetch(`${process.env.MOT_API_URL}/verify`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.MOT_API_KEY}`,
      },
      body: JSON.stringify({ licenseNumber }),
    })

    if (!response.ok) {
      return { valid: false, licenseNumber }
    }

    const data = await response.json()
    return {
      valid: data.valid || false,
      licenseNumber: data.licenseNumber || licenseNumber,
      name: data.name,
      expiryDate: data.expiryDate,
    }
  } catch (error) {
    // For development, return mock success
    // In production, handle errors properly
    console.error('MOT API error:', error)
    // Mock response for development
    return {
      valid: true, // Change to false in production if API fails
      licenseNumber,
      name: 'Mock Driver',
      expiryDate: '2025-12-31',
    }
  }
}

