'use client'

// Password reset page
// Handles both requesting reset and confirming with token
export const dynamic = 'force-dynamic';

import { useState, useEffect, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import api from '@/lib/api'
import toast from 'react-hot-toast'

function ResetPasswordContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const token = searchParams.get('token')
  const role = searchParams.get('role')

  const [step, setStep] = useState<'request' | 'reset'>('request')
  const [loading, setLoading] = useState(false)

  // Request form
  const [requestForm, setRequestForm] = useState({
    email: '',
    role: 'USER' as 'USER' | 'DRIVER' | 'ADMIN'
  })

  // Reset form
  const [resetForm, setResetForm] = useState({
    newPassword: '',
    confirmPassword: '',
    securityAnswer: ''
  })

  useEffect(() => {
    if (token && role) {
      setStep('reset')
    }
  }, [token, role])

  const handleRequestSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      await api.post('/auth/password-reset/request', requestForm)
      toast.success('Password reset link sent to your email')
      setRequestForm({ email: '', role: 'USER' })
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to send reset email')
    } finally {
      setLoading(false)
    }
  }

  const handleResetSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (resetForm.newPassword !== resetForm.confirmPassword) {
      toast.error('Passwords do not match')
      return
    }

    if (resetForm.newPassword.length < 8) {
      toast.error('Password must be at least 8 characters')
      return
    }

    setLoading(true)

    try {
      await api.post('/auth/password-reset/confirm', {
        token,
        role,
        newPassword: resetForm.newPassword,
        securityAnswer: resetForm.securityAnswer || undefined
      })

      toast.success('Password reset successfully')
      router.push('/')
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to reset password')
    } finally {
      setLoading(false)
    }
  }

  if (step === 'reset') {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="card max-w-md w-full">
          <h1 className="text-2xl font-bold text-center mb-6">Reset Password</h1>

          <form onSubmit={handleResetSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">New Password</label>
              <input
                type="password"
                value={resetForm.newPassword}
                onChange={(e) => setResetForm(prev => ({ ...prev, newPassword: e.target.value }))}
                className="input w-full"
                required
                minLength={8}
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Confirm Password</label>
              <input
                type="password"
                value={resetForm.confirmPassword}
                onChange={(e) => setResetForm(prev => ({ ...prev, confirmPassword: e.target.value }))}
                className="input w-full"
                required
                minLength={8}
              />
            </div>

            {role === 'ADMIN' && (
              <div>
                <label className="block text-sm font-medium mb-2">Security Answer</label>
                <input
                  type="text"
                  value={resetForm.securityAnswer}
                  onChange={(e) => setResetForm(prev => ({ ...prev, securityAnswer: e.target.value }))}
                  className="input w-full"
                  required
                  placeholder="Answer to your security question"
                />
              </div>
            )}

            <button
              type="submit"
              className="btn btn-primary w-full"
              disabled={loading}
            >
              {loading ? 'Resetting...' : 'Reset Password'}
            </button>
          </form>

          <div className="mt-4 text-center">
            <button
              onClick={() => {
                if (requestForm.role === 'ADMIN') {
                  router.push('/admin/login')
                } else {
                  router.push(`/${requestForm.role.toLowerCase()}/login`)
                }
              }}
              className="text-secondary hover:text-primary"
            >
              Back to Login
            </button>
          </div>
        </div>
      </div>
    )
  }

  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="card max-w-md w-full">
        <h1 className="text-2xl font-bold text-center mb-6">Forgot Password</h1>

        <form onSubmit={handleRequestSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">Email</label>
            <input
              type="email"
              value={requestForm.email}
              onChange={(e) => setRequestForm(prev => ({ ...prev, email: e.target.value }))}
              className="input w-full"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Account Type</label>
            <select
              value={requestForm.role}
              onChange={(e) => setRequestForm(prev => ({ ...prev, role: e.target.value as any }))}
              className="input w-full"
            >
              <option value="USER">Student/User</option>
              <option value="DRIVER">Driver</option>
              <option value="ADMIN">Administrator</option>
            </select>
          </div>

          <button
            type="submit"
            className="btn btn-primary w-full"
            disabled={loading}
          >
            {loading ? 'Sending...' : 'Send Reset Link'}
          </button>
        </form>

        <div className="mt-4 text-center">
          <button
            onClick={() => router.push('/')}
            className="text-secondary hover:text-primary"
          >
            Back to Login
          </button>
        </div>
      </div>
    </div>
  )
}
export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <ResetPasswordContent />
    </Suspense>
  )
}