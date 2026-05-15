// Application constants and configuration
export const PRICING = {
  BASE_RATE_PER_KM: 1.0, // $1 per kilometer
  MIN_DISTANCE_KM: 0.5,   // Minimum ride distance
  MAX_DISTANCE_KM: 100,   // Maximum ride distance
  MAX_PASSENGERS: 4,      // Maximum passengers per ride
  MIN_SCHEDULE_AHEAD_MINUTES: 30,  // Minimum time to schedule ahead
  MAX_SCHEDULE_AHEAD_DAYS: 7,      // Maximum days to schedule ahead
} as const

export const RIDE_STATUS = {
  PENDING: 'PENDING',
  ACCEPTED: 'ACCEPTED',
  DRIVER_ARRIVED: 'DRIVER_ARRIVED',
  IN_PROGRESS: 'IN_PROGRESS',
  COMPLETED: 'COMPLETED',
  CANCELLED: 'CANCELLED',
} as const

export const PAYMENT_METHODS = {
  CASH: 'CASH',
  APPLE_PAY: 'APPLE_PAY',
  BANK_TRANSFER: 'BANK_TRANSFER',
} as const

export const USER_ROLES = {
  USER: 'USER',
  DRIVER: 'DRIVER',
  ADMIN: 'ADMIN',
} as const