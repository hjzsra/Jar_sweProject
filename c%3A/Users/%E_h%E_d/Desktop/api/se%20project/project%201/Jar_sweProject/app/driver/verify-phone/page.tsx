'use client'

import { useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import api from '@/lib/api'
import toast from 'react-hot-toast'

export default function VerifyDriverPhonePage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [otp, setOtp] = useState('')
  const [loading, setLoading] = useState(false)

  // IMPORTANT: The phone number should be passed as a query parameter
  // from the registration page after successful registration.
  // e.g., router.push('/driver/verify-phone?phone=123456789')
  const phone = searchParams.get('phone')

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!phone) {
      toast.error('Phone number not found. Please go back and register again.')
      return
    }
    if (!otp || otp.length !== 6) {
      toast.error('Please enter a valid 6-digit OTP.')
      return
    }

    setLoading(true)
    try {
      const response = await api.post('/auth/driver/verify-otp', { phone, otp })
      toast.success('Phone number verified successfully!')
      // Store the token and redirect to the driver dashboard
      localStorage.setItem('driver_token', response.data.token)
      router.push('/driver/dashboard')
    } catch (error: any) {
      const errorMessage =
        error.response?.data?.error || 'Failed to verify OTP. Please try again.'
      toast.error(errorMessage)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100">
      <div className="w-full max-w-md p-8 space-y-6 bg-white rounded-lg shadow-md">
        <h2 className="text-2xl font-bold text-center text-gray-900">
          Verify Your Phone Number
        </h2>
        <p className="text-center text-gray-600">
          An OTP has been sent to your phone number: <strong>{phone}</strong>.
          (Check the console for the simulated OTP).
        </p>
        <form className="space-y-6" onSubmit={handleVerify}>
          <div>
            <label
              htmlFor="otp"
              className="block text-sm font-medium text-gray-700"
            >
              OTP Code
            </label>
            <input
              id="otp"
              name="otp"
              type="text"
              required
              maxLength={6}
              value={otp}
              onChange={(e) => setOtp(e.target.value)}
              className="w-full px-3 py-2 mt-1 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
              placeholder="Enter your 6-digit OTP"
            />
          </div>

          <div>
            <button
              type="submit"
              disabled={loading}
              className="w-full px-4 py-2 text-sm font-medium text-white bg-indigo-600 border border-transparent rounded-md shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:bg-indigo-300"
            >
              {loading ? 'Verifying...' : 'Verify'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}