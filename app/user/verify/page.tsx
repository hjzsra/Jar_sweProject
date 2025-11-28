"use client"

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import api from '@/lib/api'
import toast from 'react-hot-toast'

export default function VerifyPage() {
  const router = useRouter()
  const params = useSearchParams()
  const emailParam = params?.get('email') || ''

  const [email, setEmail] = useState(emailParam)
  const [otp, setOtp] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (emailParam) setEmail(emailParam)
  }, [emailParam])

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      const res = await api.post('/auth/user/verify-otp', { email, otpCode: otp })
      toast.success(res.data.message)
      router.push('/user/login')
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Verification failed')
    } finally {
      setLoading(false)
    }
  }

  const handleResend = async () => {
    if (!email) return toast.error('Enter your email to resend')
    setLoading(true)
    try {
      const res = await api.post('/auth/user/resend-otp', { email })
      toast.success(res.data.message || 'OTP resent')
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Resend failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="max-w-md w-full card">
        <h2 className="text-2xl font-bold text-primary mb-4">Verify Email</h2>
        <p className="text-secondary mb-6">Enter the 6-digit code sent to your email.</p>
        <form onSubmit={handleVerify} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">Email</label>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="input" required />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">OTP Code</label>
            <input type="text" value={otp} onChange={(e) => setOtp(e.target.value)} className="input" placeholder="Enter 6-digit code" maxLength={6} required />
          </div>
          <button type="submit" className="btn btn-primary w-full" disabled={loading}>{loading ? 'Verifying...' : 'Verify'}</button>
        </form>
        <div className="mt-4 flex gap-2">
          <button onClick={handleResend} className="btn btn-secondary w-full" disabled={loading}>{loading ? 'Sending...' : 'Resend OTP'}</button>
        </div>
      </div>
    </div>
  )
}
