// API client utility
// Handles API calls with authentication
import axios from 'axios'

const api = axios.create({
  baseURL: '/api',
})

// Add token to requests, excluding public routes
api.interceptors.request.use((config) => {
  const url = config.url || ''
  let token: string | null = null

  // Determine which token to use based on the request URL
  if (url.startsWith('/driver') || url.startsWith('/auth/driver')) {
    token = localStorage.getItem('driver_token')
  } else if (url.startsWith('/admin') || url.startsWith('/auth/admin')) {
    token = localStorage.getItem('admin_token')
  } else {
    // Default to user token
    token = localStorage.getItem('token')
  }

  // Public routes that don't require a token
  const publicRoutes = [
    '/auth/user/login',
    '/auth/user/register',
    '/auth/user/verify-otp',
    '/auth/driver/login',
    '/auth/driver/register',
    '/auth/driver/verify-otp',
    '/auth/admin/login',
  ]

  // If the route is not public and a token exists, add it to the header
  if (token && !publicRoutes.includes(url)) {
    config.headers.Authorization = `Bearer ${token}`
  }

  return config
})

export default api