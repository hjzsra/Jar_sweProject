// Driver dashboard page
'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import AuthGuard from '@/components/AuthGuard'
import api from '@/lib/api'
import toast from 'react-hot-toast'

export default function DriverDashboard() {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState<'home' | 'requests' | 'active' | 'history'>('home')
  const [driver, setDriver] = useState<any>(null)
  const [rideRequests, setRideRequests] = useState<any[]>([])
  const [activeRides, setActiveRides] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [isAvailable, setIsAvailable] = useState(false)

  useEffect(() => {
    loadDriverData()
    // Update location periodically
    const interval = setInterval(updateLocation, 30000) // Every 30 seconds
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    if (activeTab === 'requests') {
      loadRideRequests()
    }
    if (activeTab === 'active') {
      loadActiveRides()
    }
  }, [activeTab])

  const loadDriverData = async () => {
    try {
      const driverData = JSON.parse(localStorage.getItem('driver') || '{}')
      setDriver(driverData)
      setIsAvailable(driverData.isAvailable || false)
    } catch (error) {
      toast.error('Failed to load driver data')
    } finally {
      setLoading(false)
    }
  }

  const updateLocation = async () => {
    if (!isAvailable) return

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          await api.post('/driver/update-location', {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            isAvailable,
          })
        } catch (error) {
          console.error('Failed to update location')
        }
      },
      () => {}
    )
  }

  const toggleAvailability = async () => {
    const newAvailability = !isAvailable
    setIsAvailable(newAvailability)

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          await api.post('/driver/update-location', {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            isAvailable: newAvailability,
          })
          toast.success(newAvailability ? 'You are now available' : 'You are now offline')
        } catch (error) {
          toast.error('Failed to update availability')
          setIsAvailable(!newAvailability)
        }
      },
      () => {
        toast.error('Please enable location services')
        setIsAvailable(!newAvailability)
      }
    )
  }

  const loadRideRequests = async () => {
    try {
      const response = await api.get('/driver/requests?radius=5')
      setRideRequests(response.data.requests)
    } catch (error) {
      toast.error('Failed to load ride requests')
    }
  }

  const loadActiveRides = async () => {
    // In production, fetch active rides from API
    setActiveRides([])
  }

  const handleLogout = () => {
    localStorage.removeItem('token')
    localStorage.removeItem('role')
    localStorage.removeItem('driver')
    router.push('/')
  }

  if (loading) {
    return (
      <AuthGuard requiredRole="driver">
        <div className="min-h-screen bg-background flex items-center justify-center">
          <div className="text-secondary">Loading...</div>
        </div>
      </AuthGuard>
    )
  }

  return (
    <AuthGuard requiredRole="driver">
      <div className="min-h-screen bg-background">
        <nav className="bg-white shadow-sm p-4">
          <div className="max-w-7xl mx-auto flex justify-between items-center">
            <h1 className="text-xl font-bold text-primary">Driver Dashboard</h1>
            <div className="flex gap-4 items-center">
              <button
                onClick={toggleAvailability}
                className={`btn ${isAvailable ? 'btn-primary' : 'btn-secondary'}`}
              >
                {isAvailable ? 'Available' : 'Offline'}
              </button>
              <span className="text-secondary">{driver?.firstName} {driver?.lastName}</span>
              <button onClick={handleLogout} className="btn btn-outline">
                Logout
              </button>
            </div>
          </div>
        </nav>

        <div className="max-w-7xl mx-auto p-4">
          <div className="flex gap-4 mb-6">
            <button
              onClick={() => setActiveTab('home')}
              className={`btn ${activeTab === 'home' ? 'btn-primary' : 'btn-outline'}`}
            >
              Home
            </button>
            <button
              onClick={() => {
                setActiveTab('requests')
                loadRideRequests()
              }}
              className={`btn ${activeTab === 'requests' ? 'btn-primary' : 'btn-outline'}`}
            >
              Ride Requests
            </button>
            <button
              onClick={() => {
                setActiveTab('active')
                loadActiveRides()
              }}
              className={`btn ${activeTab === 'active' ? 'btn-primary' : 'btn-outline'}`}
            >
              Active Rides
            </button>
            <button
              onClick={() => setActiveTab('history')}
              className={`btn ${activeTab === 'history' ? 'btn-primary' : 'btn-outline'}`}
            >
              History
            </button>
          </div>

          {activeTab === 'home' && (
            <div className="card">
              <h2 className="text-2xl font-bold mb-4">Welcome, {driver?.firstName}!</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-4 bg-primary text-white rounded-lg">
                  <p className="text-sm">Average Rating</p>
                  <p className="text-2xl font-bold">{driver?.averageRating?.toFixed(1) || '0.0'}</p>
                </div>
                <div className="p-4 bg-accent text-white rounded-lg">
                  <p className="text-sm">Total Rides</p>
                  <p className="text-2xl font-bold">0</p>
                </div>
                <div className="p-4 bg-secondary text-white rounded-lg">
                  <p className="text-sm">Status</p>
                  <p className="text-lg font-bold">{isAvailable ? 'Available' : 'Offline'}</p>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'requests' && (
            <div className="card">
              <h2 className="text-2xl font-bold mb-4">Ride Requests</h2>
              {!isAvailable && (
                <div className="mb-4 p-4 bg-yellow-100 text-yellow-800 rounded-lg">
                  Turn on availability to see ride requests
                </div>
              )}
              {rideRequests.length === 0 ? (
                <p className="text-secondary">No ride requests available</p>
              ) : (
                <div className="space-y-4">
                  {rideRequests.map((request) => (
                    <RideRequestCard
                      key={request.id}
                      request={request}
                      onUpdate={loadRideRequests}
                    />
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'active' && (
            <div className="card">
              <h2 className="text-2xl font-bold mb-4">Active Rides</h2>
              {activeRides.length === 0 ? (
                <p className="text-secondary">No active rides</p>
              ) : (
                <div className="space-y-4">
                  {activeRides.map((ride) => (
                    <ActiveRideCard key={ride.id} ride={ride} />
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'history' && (
            <div className="card">
              <h2 className="text-2xl font-bold mb-4">Ride History</h2>
              <p className="text-secondary">Ride history will be displayed here</p>
            </div>
          )}
        </div>
      </div>
    </AuthGuard>
  )
}

// Ride Request Card Component
function RideRequestCard({ request, onUpdate }: { request: any; onUpdate: () => void }) {
  const [loading, setLoading] = useState(false)

  const handleAccept = async () => {
    setLoading(true)
    try {
      await api.post('/rides/driver/accept', { rideId: request.id })
      toast.success('Ride accepted!')
      onUpdate()
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to accept ride')
    } finally {
      setLoading(false)
    }
  }

  const handleReject = async () => {
    const reason = prompt('Reason for rejection (optional):')
    setLoading(true)
    try {
      await api.post('/rides/driver/reject', { rideId: request.id, reason })
      toast.success('Ride rejected')
      onUpdate()
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to reject ride')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="p-4 border rounded-lg">
      <div className="flex justify-between items-start">
        <div>
          <p className="font-medium">
            {request.pickupAddress} → {request.dropoffAddress}
          </p>
          <p className="text-sm text-secondary">
            Passenger: {request.passenger?.firstName} {request.passenger?.lastName}
          </p>
          <p className="text-sm text-secondary">
            Distance: {request.distance?.toFixed(2)} km | Cost: ${request.cost?.toFixed(2)}
          </p>
          {request.isPreBooked && request.scheduledTime && (
            <p className="text-sm text-secondary">
              Scheduled: {new Date(request.scheduledTime).toLocaleString()}
            </p>
          )}
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleAccept}
            className="btn btn-primary"
            disabled={loading}
          >
            Accept
          </button>
          <button
            onClick={handleReject}
            className="btn btn-outline"
            disabled={loading}
          >
            Reject
          </button>
        </div>
      </div>
    </div>
  )
}

// Active Ride Card Component
function ActiveRideCard({ ride }: { ride: any }) {
  const [loading, setLoading] = useState(false)

  const handleAction = async (action: string) => {
    setLoading(true)
    try {
      await api.post(`/rides/driver/${action}`, { rideId: ride.id })
      toast.success(`Ride ${action}ed`)
      window.location.reload()
    } catch (error: any) {
      toast.error(error.response?.data?.error || `Failed to ${action} ride`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="p-4 border rounded-lg">
      <div>
        <p className="font-medium">
          {ride.pickupAddress} → {ride.dropoffAddress}
        </p>
        <p className="text-sm text-secondary">Status: {ride.status}</p>
      </div>
      <div className="mt-4 flex gap-2">
        {ride.status === 'accepted' && (
          <button
            onClick={() => handleAction('arrived')}
            className="btn btn-primary"
            disabled={loading}
          >
            I've Arrived
          </button>
        )}
        {ride.status === 'driver_arrived' && (
          <button
            onClick={() => handleAction('start')}
            className="btn btn-primary"
            disabled={loading}
          >
            Start Trip
          </button>
        )}
        {ride.status === 'in_progress' && (
          <button
            onClick={() => handleAction('end')}
            className="btn btn-primary"
            disabled={loading}
          >
            End Trip
          </button>
        )}
        <button
          onClick={() => window.open(`/driver/chat?rideId=${ride.id}`, '_blank')}
          className="btn btn-outline"
        >
          Chat
        </button>
      </div>
    </div>
  )
}

