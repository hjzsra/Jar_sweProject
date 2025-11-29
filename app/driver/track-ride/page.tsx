// Driver track active ride with map
'use client'

import { useState, useEffect } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import AuthGuard from '@/components/AuthGuard'
import MapView from '@/components/MapView'
import api from '@/lib/api'
import toast from 'react-hot-toast'

export default function DriverTrackRide() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const rideId = searchParams.get('rideId')
  const [ride, setRide] = useState<any>(null)
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
      }, 5000)
      return () => clearInterval(interval)
    }
  }, [rideId])

  useEffect(() => {
    // Update driver location periodically
    const locationInterval = setInterval(updateLocation, 10000) // Every 10 seconds
    return () => clearInterval(locationInterval)
  }, [])

  const loadRideData = async () => {
    try {
      const response = await api.get(`/rides/${rideId}`)
      setRide(response.data.ride)
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

  const updateLocation = () => {
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          await api.post('/driver/update-location', {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            isAvailable: true,
          })
        } catch (error) {
          console.error('Failed to update location')
        }
      },
      () => {}
    )
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

  const handleRideAction = async (action: 'arrived' | 'start' | 'end') => {
    try {
      await api.post(`/rides/driver/${action}`, { rideId })
      toast.success(`Ride ${action}ed successfully`)
      loadRideData()
    } catch (error: any) {
      toast.error(error.response?.data?.error || `Failed to ${action} ride`)
    }
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

  if (!ride) {
    return (
      <AuthGuard requiredRole="driver">
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

  const getNextAction = () => {
    switch (ride.status) {
      case 'ACCEPTED':
        return { action: 'arrived', label: "I've Arrived at Pickup", color: 'primary' }
      case 'DRIVER_ARRIVED':
        return { action: 'start', label: 'Start Trip', color: 'accent' }
      case 'IN_PROGRESS':
        return { action: 'end', label: 'End Trip', color: 'secondary' }
      default:
        return null
    }
  }

  const nextAction = getNextAction()

  return (
    <AuthGuard requiredRole="driver">
      <div className="min-h-screen bg-background">
        <nav className="bg-white shadow-sm p-4">
          <div className="max-w-7xl mx-auto flex justify-between items-center">
            <h1 className="text-xl font-bold text-primary">Active Ride</h1>
            <button
              onClick={() => router.push('/driver/dashboard')}
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
              <h2 className="text-xl font-bold mb-4">Route Map</h2>
              <MapView markers={markers} showRoute={true} height="500px" />
            </div>

            {/* Ride Details */}
            <div className="card">
              <h3 className="text-lg font-bold mb-4">Ride Details</h3>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-secondary">Status:</span>
                  <span
                    className={`px-3 py-1 rounded-full text-white text-sm ${
                      ride.status === 'COMPLETED'
                        ? 'bg-accent'
                        : ride.status === 'IN_PROGRESS'
                        ? 'bg-primary'
                        : 'bg-secondary'
                    }`}
                  >
                    {ride.status}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-secondary">Passenger:</span>
                  <span className="font-medium">
                    {ride.passenger?.firstName} {ride.passenger?.lastName}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-secondary">Pickup:</span>
                  <span className="font-medium text-right">{ride.pickupAddress}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-secondary">Dropoff:</span>
                  <span className="font-medium text-right">{ride.dropoffAddress}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-secondary">Cost:</span>
                  <span className="font-medium">${ride.cost.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-secondary">Payment:</span>
                  <span className="font-medium">
                    {ride.paymentMethod === 'cash' ? 'Cash' : 'Apple Pay'}
                  </span>
                </div>
                {ride.scheduledTime && (
                  <div className="flex justify-between">
                    <span className="text-secondary">Scheduled:</span>
                    <span className="font-medium">
                      {new Date(ride.scheduledTime).toLocaleString()}
                    </span>
                  </div>
                )}
              </div>

              {nextAction && (
                <button
                  onClick={() => handleRideAction(nextAction.action as any)}
                  className={`btn btn-${nextAction.color} w-full mt-4`}
                >
                  {nextAction.label}
                </button>
              )}
            </div>
          </div>

          {/* Chat Section */}
          <div className="card flex flex-col h-[600px]">
            <h3 className="text-lg font-bold mb-4">Chat with Passenger</h3>

            <div className="flex-1 overflow-y-auto space-y-3 mb-4 pr-2">
              {messages.length === 0 ? (
                <p className="text-secondary text-center">No messages yet</p>
              ) : (
                messages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`flex ${msg.driverId ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-[80%] p-3 rounded-lg ${
                        msg.driverId
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
