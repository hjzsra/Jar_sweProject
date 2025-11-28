// API client utility
// Handles API calls with authentication
import axios from 'axios'

const api = axios.create({
  baseURL: '/api',
})

// Add token to requests, excluding public routes
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  // Define public routes that don't need authentication
  const publicRoutes = ['/auth/user/register', '/auth/user/verify-otp', '/auth/admin/login'];

  // Attach token only if it exists and the route is not public
  if (token && !publicRoutes.includes(config.url || '')) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  
  return config;
});

export default api;