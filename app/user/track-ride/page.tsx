// Track active ride with live map
'use client'

import { useState, useEffect } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import AuthGuard from '@/components/AuthGuard'
import MapView from '@/components/MapView'
import api from '@/lib/api'
import toast from 'react-hot-toast'

export default function TrackRide() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const rideId = searchParams.get('rideId')
  const [ride, setRide] = useState<any>(null)
  const [driverLocation, setDriverLocation] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [messages, setMessages] = useState<any[]>([])
  const [newMessage, setNewMessage] = useState('')

  useEffect(() => {
    if (rideId) {
      loadRideData()
      loadMessages()
      const interval = setInterval(() => {
        loadRideData()
        loadMessages()
      }, 5000) // Update every 5 seconds
      return () => clearInterval(interval)
    }
  }, [rideId])

  const loadRideData = async () => {
    try {
      const response = await api.get(`/rides/${rideId}`)
      setRide(response.data.ride)
      setDriverLocation(response.data.driverLocation)
    } catch (error) {
      toast.error('Failed to load ride data')
    } finally {
      setLoading(false)
    }
  }

  const loadMessages = async () => {
    try {
      const response = await api.get(`/chat/messages?rideId=${rideId}`)
      setMessages(response.data.messages)
    } catch (error) {
      console.error('Failed to load messages')
    }
  }

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newMessage.trim()) return

    try {
      await api.post('/chat/messages', {
        rideId,
        message: newMessage,
      })
      setNewMessage('')
      loadMessages()
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to send message')
    }
  }

  const handleCancelRide = async () => {
    if (!confirm('Are you sure you want to cancel this ride?')) return

    try {
      await api.post('/rides/user/reject', { rideId })
      toast.success('Ride cancelled')
      router.push('/user/dashboard')
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to cancel ride')
    }
  }

  if (loading) {
    return (
      <AuthGuard requiredRole="user">
        <div className="min-h-screen bg-background flex items-center justify-center">
          <div className="text-secondary">Loading...</div>
        </div>
      </AuthGuard>
    )
  }

  if (!ride) {
    return (
      <AuthGuard requiredRole="user">
        <div className="min-h-screen bg-background flex items-center justify-center">
          <div className="text-secondary">Ride not found</div>
        </div>
      </AuthGuard>
    )
  }

  const markers = [
    {
      position: { lat: ride.pickupLatitude, lng: ride.pickupLongitude },
      title: 'Pickup',
      type: 'pickup' as const,
    },
    {
      position: { lat: ride.dropoffLatitude, lng: ride.dropoffLongitude },
      title: 'Dropoff',
      type: 'dropoff' as const,
    },
  ]

  if (driverLocation) {
    markers.push({
      position: { lat: driverLocation.lat, lng: driverLocation.lng },
      title: 'Driver',
      type: 'driver' as const,
    })
  }

  const getStatusMessage = () => {
    switch (ride.status) {
      case 'PENDING':
        return 'Waiting for driver to accept...'
      case 'ACCEPTED':
        return 'Driver is on the way to pickup location'
      case 'DRIVER_ARRIVED':
        return 'Driver has arrived at pickup location'
      case 'IN_PROGRESS':
        return 'Trip in progress'
      case 'COMPLETED':
        return 'Trip completed'
      case 'CANCELLED':
        return 'Trip cancelled'
      default:
        return 'Unknown status'
    }
  }

  return (
    <AuthGuard requiredRole="user">
      <div className="min-h-screen bg-background">
        <nav className="bg-white shadow-sm p-4">
          <div className="max-w-7xl mx-auto flex justify-between items-center">
            <h1 className="text-xl font-bold text-primary">Track Your Ride</h1>
            <button
              onClick={() => router.push('/user/dashboard')}
              className="btn btn-outline"
            >
              Back to Dashboard
            </button>
          </div>
        </nav>

        <div className="max-w-7xl mx-auto p-4 grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Map Section */}
          <div className="lg:col-span-2 space-y-4">
            <div className="card">
              <h2 className="text-xl font-bold mb-4">Live Tracking</h2>
              <MapView markers={markers} showRoute={true} height="500px" />
            </div>

            {/* Ride Status */}
            <div className="card">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-lg font-bold">Status</h3>
                  <p className="text-sm text-secondary">{getStatusMessage()}</p>
                </div>
                <div
                  className={`px-4 py-2 rounded-lg text-white font-medium ${
                    ride.status === 'COMPLETED'
                      ? 'bg-accent'
                      : ride.status === 'CANCELLED'
                      ? 'bg-red-500'
                      : 'bg-primary'
                  }`}
                >
                  {ride.status}
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-secondary">Pickup:</span>
                  <span className="font-medium">{ride.pickupAddress}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-secondary">Dropoff:</span>
                  <span className="font-medium">{ride.dropoffAddress}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-secondary">Driver:</span>
                  <span className="font-medium">
                    {ride.driver?.firstName} {ride.driver?.lastName} ⭐{' '}
                    {ride.driver?.averageRating?.toFixed(1) || 'N/A'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-secondary">Car:</span>
                  <span className="font-medium">
                    {ride.driver?.carModel} - {ride.driver?.carColor} ({ride.driver?.carPlateNumber})
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-secondary">Cost:</span>
                  <span className="font-medium">${ride.costPerPassenger.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-secondary">Payment:</span>
                  <span className="font-medium">{ride.paymentMethod}</span>
                </div>
              </div>

              {ride.status === 'PENDING' && (
                <button
                  onClick={handleCancelRide}
                  className="btn btn-outline w-full mt-4 text-red-500 border-red-500 hover:bg-red-500 hover:text-white"
                >
                  Cancel Ride
                </button>
              )}
            </div>
          </div>

          {/* Chat Section */}
          <div className="card flex flex-col h-[600px]">
            <h3 className="text-lg font-bold mb-4">Chat with Driver</h3>

            <div className="flex-1 overflow-y-auto space-y-3 mb-4 pr-2">
              {messages.length === 0 ? (
                <p className="text-secondary text-center">No messages yet</p>
              ) : (
                messages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`flex ${msg.userId ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-[80%] p-3 rounded-lg ${
                        msg.userId
                          ? 'bg-primary text-white'
                          : 'bg-gray-100 border'
                      }`}
                    >
                      <p className="text-sm">{msg.message}</p>
                      <p className="text-xs mt-1 opacity-70">
                        {new Date(msg.createdAt).toLocaleTimeString()}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>

            <form onSubmit={handleSendMessage} className="flex gap-2">
              <input
                type="text"
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                className="input flex-1"
                placeholder="Type a message..."
              />
              <button
                type="submit"
                className="btn btn-primary"
                disabled={!newMessage.trim()}
              >
                Send
              </button>
            </form>
          </div>
        </div>
      </div>
    </AuthGuard>
  )
}
