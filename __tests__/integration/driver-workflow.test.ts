// Integration tests for driver workflows
import request from 'supertest'
import { generateToken } from '@/lib/auth'

describe('Driver Workflow Integration Tests', () => {
  let authToken: string
  let driverId: string

  beforeAll(() => {
    // Create a test driver token
    driverId = 'test-driver-123'
    authToken = generateToken({
      userId: driverId,
      email: 'testdriver@example.com',
      role: 'driver',
    })
  })

  describe('Driver Location Update Flow', () => {
    it('should complete full location update workflow', async () => {
      const locationData = {
        latitude: 40.7589,
        longitude: -73.9851,
        isAvailable: true,
      }

      const response = await request('http://localhost:3000')
        .post('/api/driver/update-location')
        .set('Authorization', `Bearer ${authToken}`)
        .send(locationData)

      expect(response.status).toBe(200)
      expect(response.body.message).toBe('Location updated')
      expect(response.body.driver.currentLatitude).toBe(locationData.latitude)
      expect(response.body.driver.currentLongitude).toBe(locationData.longitude)
    })

    it('should reject update without authentication', async () => {
      const locationData = {
        latitude: 40.7589,
        longitude: -73.9851,
      }

      const response = await request('http://localhost:3000')
        .post('/api/driver/update-location')
        .send(locationData)

      expect(response.status).toBe(401)
      expect(response.body.error).toBe('Unauthorized')
    })
  })
})