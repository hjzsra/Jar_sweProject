// User login page
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import api from '@/lib/api'
import toast from 'react-hot-toast'

export default function UserLogin() {
  const router = useRouter()
  const [formData, setFormData] = useState({
    email: '',
    password: '',
  })
  const [loading, setLoading] = useState(false)

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const response = await api.post('/auth/user/login', formData)
      localStorage.setItem('token', response.data.token)
      localStorage.setItem('role', 'user')
      localStorage.setItem('user', JSON.stringify(response.data.user))
      toast.success('Login successful')
      router.push('/user/dashboard')
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Login failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="max-w-md w-full card">
        <h2 className="text-2xl font-bold text-primary mb-4">Student Login</h2>
        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">University Email</label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className="input"
              placeholder="student@university.edu"
              required
            />
          </div>
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
            onClick={() => router.push('/user/register')}
            className="text-secondary text-sm underline w-full"
          >
            Don't have an account? Register
          </button>
        </form>
      </div>
    </div>
  )
}

