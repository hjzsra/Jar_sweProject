// Driver login page
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import api from '@/lib/api'
import toast from 'react-hot-toast'

export default function DriverLogin() {
  const router = useRouter()
  const [loginType, setLoginType] = useState<'email' | 'phone'>('email')
  const [formData, setFormData] = useState({
    email: '',
    phone: '',
    password: '',
  })
  const [loading, setLoading] = useState(false)

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const response = await api.post('/auth/driver/login', {
        [loginType]: formData[loginType],
        password: formData.password,
      })
      localStorage.setItem('token', response.data.token)
      localStorage.setItem('role', 'driver')
      localStorage.setItem('driver', JSON.stringify(response.data.driver))
      toast.success('Login successful')
      router.push('/driver/dashboard')
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Login failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="max-w-md w-full card">
        <h2 className="text-2xl font-bold text-primary mb-4">Driver Login</h2>
        <div className="flex gap-2 mb-4">
          <button
            onClick={() => setLoginType('email')}
            className={`btn ${loginType === 'email' ? 'btn-primary' : 'btn-outline'}`}
          >
            Email
          </button>
          <button
            onClick={() => setLoginType('phone')}
            className={`btn ${loginType === 'phone' ? 'btn-primary' : 'btn-outline'}`}
          >
            Phone
          </button>
        </div>
        <form onSubmit={handleLogin} className="space-y-4">
          {loginType === 'email' ? (
            <div>
              <label className="block text-sm font-medium mb-2">Email</label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="input"
                required
              />
            </div>
          ) : (
            <div>
              <label className="block text-sm font-medium mb-2">Phone Number</label>
              <input
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                className="input"
                required
              />
            </div>
          )}
          <div>
            <label className="block text-sm font-medium mb-2">Password</label>
            <input
              type="password"
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              className="input"
              required
            />
          </div>
          <button type="submit" className="btn btn-primary w-full" disabled={loading}>
            {loading ? 'Logging in...' : 'Login'}
          </button>
          <button
            type="button"
            onClick={() => router.push('/driver/register')}
            className="text-secondary text-sm underline w-full"
          >
            Don't have an account? Register
          </button>
        </form>
      </div>
    </div>
  )
}

