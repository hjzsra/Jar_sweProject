// Home page - Landing page with login/register options
'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'

export default function Home() {
  const router = useRouter()
  const [userType, setUserType] = useState<'user' | 'driver' | null>(null)

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        <div className="card text-center">
          <h1 className="text-3xl font-bold text-primary mb-2">
            Student Ride Sharing
          </h1>
          <p className="text-secondary mb-8">Share rides, save money, connect</p>

          {!userType ? (
            <div className="space-y-4">
              <button
                onClick={() => setUserType('user')}
                className="btn btn-primary w-full"
              >
                I'm a Student (Passenger)
              </button>
              <button
                onClick={() => setUserType('driver')}
                className="btn btn-outline w-full"
              >
                I'm a Driver
              </button>
              <button
                onClick={() => router.push('/admin/login')}
                className="btn btn-secondary w-full"
              >
                Admin Login
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              <button
                onClick={() => {
                  router.push(`/${userType}/login`)
                }}
                className="btn btn-primary w-full"
              >
                Login
              </button>
              <button
                onClick={() => {
                  router.push(`/${userType}/register`)
                }}
                className="btn btn-outline w-full"
              >
                Register
              </button>
              <button
                onClick={() => setUserType(null)}
                className="text-secondary text-sm underline"
              >
                Go Back
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

