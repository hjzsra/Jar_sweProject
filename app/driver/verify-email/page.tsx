// Driver email verification page
'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import api from '@/lib/api'
import toast from 'react-hot-toast'

function DriverVerifyEmailContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [otp, setOtp] = useState('')
  const [loading, setLoading] = useState(false)
  const [email, setEmail] = useState('')

  useEffect(() => {
    const emailParam = searchParams.get('email')
    if (emailParam) {
      setEmail(emailParam)
    }
  }, [searchParams])

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const response = await api.post('/auth/driver/verify-email', {
        email,
        otp
      })
      toast.success('Email verified successfully!')
      router.push('/driver/login')
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Verification failed')
    } finally {
      setLoading(false)
    }
  }

  const handleResendOTP = async () => {
    try {
      await api.post('/auth/driver/resend-otp', { email })
      toast.success('OTP sent to your email')
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to resend OTP')
    }
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="max-w-md w-full card">
        <h2 className="text-2xl font-bold text-primary mb-4">Verify Your Email</h2>
        <p className="text-secondary mb-4">
          We've sent a verification code to <strong>{email}</strong>
        </p>

        <form onSubmit={handleVerify} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">Verification Code</label>
            <input
              type="text"
              value={otp}
              onChange={(e) => setOtp(e.target.value)}
              className="input text-center text-2xl tracking-widest"
              placeholder="000000"
              maxLength={6}
              required
            />
          </div>

          <button type="submit" className="btn btn-primary w-full" disabled={loading}>
            {loading ? 'Verifying...' : 'Verify Email'}
          </button>
        </form>

        <div className="mt-4 text-center">
          <button
            onClick={handleResendOTP}
            className="text-primary hover:underline"
            type="button"
          >
            Didn't receive the code? Resend
          </button>
        </div>

        <button
          onClick={() => router.push('/driver/register')}
          className="text-secondary text-sm underline w-full mt-4"
        >
          Back to Registration
        </button>
      </div>
    </div>
  )
}
export default function DriverVerifyEmail() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <DriverVerifyEmailContent />
    </Suspense>
  )
}