// Authentication guard component
// Protects routes that require authentication
'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

interface AuthGuardProps {
  children: React.ReactNode
  requiredRole?: 'user' | 'driver' | 'admin'
}

export default function AuthGuard({ children, requiredRole }: AuthGuardProps) {
  const router = useRouter()
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const token = localStorage.getItem('token')
    const userRole = localStorage.getItem('role')

    if (!token) {
      router.push('/')
      return
    }

    if (requiredRole && userRole !== requiredRole) {
      router.push('/')
      return
    }

    setIsAuthenticated(true)
    setLoading(false)
  }, [router, requiredRole])

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-secondary">Loading...</div>
      </div>
    )
  }

  if (!isAuthenticated) {
    return null
  }

  return <>{children}</>
}

