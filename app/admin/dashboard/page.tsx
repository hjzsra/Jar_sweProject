// Admin dashboard page
'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import AuthGuard from '@/components/AuthGuard'
import api from '@/lib/api'
import toast from 'react-hot-toast'

export default function AdminDashboard() {
  const router = useRouter()
  const [stats, setStats] = useState<any>(null)
  const [recentRides, setRecentRides] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadDashboardData()
  }, [])

  const loadDashboardData = async () => {
    try {
      const response = await api.get('/admin/dashboard')
      setStats(response.data.stats)
      setRecentRides(response.data.recentRides)
    } catch (error) {
      toast.error('Failed to load dashboard data')
    } finally {
      setLoading(false)
    }
  }

  const handleLogout = () => {
    localStorage.removeItem('token')
    localStorage.removeItem('role')
    localStorage.removeItem('admin')
    router.push('/')
  }

  if (loading) {
    return (
      <AuthGuard requiredRole="admin">
        <div className="min-h-screen bg-background flex items-center justify-center">
          <div className="text-secondary">Loading...</div>
        </div>
      </AuthGuard>
    )
  }

  return (
    <AuthGuard requiredRole="admin">
      <div className="min-h-screen bg-background">
        <nav className="bg-white shadow-sm p-4">
          <div className="max-w-7xl mx-auto flex justify-between items-center">
            <h1 className="text-xl font-bold text-primary">Admin Dashboard</h1>
            <button onClick={handleLogout} className="btn btn-outline">
              Logout
            </button>
          </div>
        </nav>

        <div className="max-w-7xl mx-auto p-4">
          <h2 className="text-2xl font-bold mb-6">Overview</h2>

          {stats && (
            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-6">
              <div className="card">
                <p className="text-sm text-secondary">Total Users</p>
                <p className="text-2xl font-bold text-primary">{stats.totalUsers}</p>
              </div>
              <div className="card">
                <p className="text-sm text-secondary">Total Drivers</p>
                <p className="text-2xl font-bold text-primary">{stats.totalDrivers}</p>
              </div>
              <div className="card">
                <p className="text-sm text-secondary">Total Rides</p>
                <p className="text-2xl font-bold text-primary">{stats.totalRides}</p>
              </div>
              <div className="card">
                <p className="text-sm text-secondary">Active Rides</p>
                <p className="text-2xl font-bold text-accent">{stats.activeRides}</p>
              </div>
              <div className="card">
                <p className="text-sm text-secondary">Total Revenue</p>
                <p className="text-2xl font-bold text-accent">${stats.totalRevenue.toFixed(2)}</p>
              </div>
              <div className="card">
                <p className="text-sm text-secondary">Open Tickets</p>
                <p className="text-2xl font-bold text-secondary">{stats.openSupportTickets}</p>
              </div>
            </div>
          )}

          <div className="card">
            <h3 className="text-xl font-bold mb-4">Recent Rides</h3>
            {recentRides.length === 0 ? (
              <p className="text-secondary">No recent rides</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left p-2">ID</th>
                      <th className="text-left p-2">Driver</th>
                      <th className="text-left p-2">Passenger</th>
                      <th className="text-left p-2">Route</th>
                      <th className="text-left p-2">Cost</th>
                      <th className="text-left p-2">Status</th>
                      <th className="text-left p-2">Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentRides.map((ride) => (
                      <tr key={ride.id} className="border-b">
                        <td className="p-2 text-sm">{ride.id.substring(0, 8)}...</td>
                        <td className="p-2">
                          {ride.driver?.firstName} {ride.driver?.lastName}
                        </td>
                        <td className="p-2">
                          {ride.passenger?.firstName} {ride.passenger?.lastName}
                        </td>
                        <td className="p-2 text-sm">
                          {ride.pickupAddress.substring(0, 20)}... → {ride.dropoffAddress.substring(0, 20)}...
                        </td>
                        <td className="p-2">${ride.cost.toFixed(2)}</td>
                        <td className="p-2">
                          <span className={`px-2 py-1 rounded text-xs ${
                            ride.status === 'completed' ? 'bg-green-100 text-green-800' :
                            ride.status === 'in_progress' ? 'bg-blue-100 text-blue-800' :
                            'bg-gray-100 text-gray-800'
                          }`}>
                            {ride.status}
                          </span>
                        </td>
                        <td className="p-2 text-sm">
                          {new Date(ride.createdAt).toLocaleDateString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </AuthGuard>
  )
}

