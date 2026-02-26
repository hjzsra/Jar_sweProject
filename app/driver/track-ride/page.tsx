'use client'

// Driver track active ride with map
export const dynamic = 'force-dynamic';

import { useState, useEffect, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import dynamicImport from 'next/dynamic'
import AuthGuard from '@/components/AuthGuard'
import api from '@/lib/api'
import toast from 'react-hot-toast'

const MapView = dynamicImport(() => import('@/components/MapView'), { ssr: false })

function DriverTrackRideContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const rideId = searchParams.get('rideId')
  const [ride, setRide] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [messages, setMessages] = useState<any[]>([])
  const [newMessage, setNewMessage] = useState('')
  const [driverLocation, setDriverLocation] = useState<{ lat: number; lng: number } | null>(null)
  const [mapKey, setMapKey] = useState(0) // Force map re-render

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
      console.log('Loading ride data for ID:', rideId)
      const response = await api.get(`/rides/${rideId}`)
      console.log('Ride data received:', response.data)

      const rideData = response.data.ride

      // Check if this driver is assigned to this ride
      if (rideData.driverId !== undefined) { // Allow undefined for debugging
        // For now, just log the driver ID check
        console.log('Ride driver ID:', rideData.driverId)
      }

      setRide(rideData)
    } catch (error: any) {
      console.error('Error loading ride data:', error)
      toast.error(`Failed to load ride data: ${error.response?.data?.error || error.message}`)
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
        const { latitude, longitude } = position.coords
        const newLocation = { lat: latitude, lng: longitude }
        setDriverLocation(newLocation)
        setMapKey(prev => prev + 1) // Force map re-render

        try {
          await api.post('/driver/update-location', {
            latitude,
            longitude,
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

  const handleRideAction = async (action: 'arrived' | 'start' | 'end', passengerId?: string) => {
    try {
      const payload: any = { rideId }
      if (passengerId) payload.passengerId = passengerId

      await api.post(`/rides/driver/${action}`, payload)
      toast.success(passengerId ? `Passenger trip ended successfully` : `Ride ${action}ed successfully`)
      loadRideData()
    } catch (error: any) {
      toast.error(error.response?.data?.error || `Failed to ${action} ride`)
    }
  }

  const handleCancelRide = async () => {
    const reasons = [
      { value: 'TRAFFIC_CONGESTION', label: 'Traffic congestion' },
      { value: 'VEHICLE_ISSUE', label: 'Vehicle issue' },
      { value: 'PERSONAL_EMERGENCY', label: 'Personal emergency' },
      { value: 'OTHER_DRIVER', label: 'Other reason' },
    ]

    const reasonSelect = document.createElement('select')
    reasonSelect.innerHTML = reasons.map(r => `<option value="${r.value}">${r.label}</option>`).join('')
    reasonSelect.style.cssText = 'width: 100%; padding: 8px; margin: 10px 0; border: 1px solid #ccc; border-radius: 4px;'

    const modal = document.createElement('div')
    modal.style.cssText = `
      position: fixed; top: 0; left: 0; width: 100%; height: 100%;
      background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center;
      z-index: 1000;
    `
    modal.innerHTML = `
      <div style="background: white; padding: 20px; border-radius: 8px; max-width: 400px; width: 90%;">
        <h3 style="margin: 0 0 15px 0;">Cancel Ride</h3>
        <p style="margin: 0 0 15px 0; color: #666;">Please select a reason for cancellation:</p>
        <div style="margin-bottom: 20px;">${reasonSelect.outerHTML}</div>
        <div style="display: flex; gap: 10px; justify-content: flex-end;">
          <button onclick="this.closest('.modal').remove()" style="padding: 8px 16px; border: 1px solid #ccc; background: white; border-radius: 4px; cursor: pointer;">Cancel</button>
          <button id="confirm-cancel" style="padding: 8px 16px; background: #dc3545; color: white; border: none; border-radius: 4px; cursor: pointer;">Confirm Cancellation</button>
        </div>
      </div>
    `

    document.body.appendChild(modal)

    document.getElementById('confirm-cancel')!.onclick = async () => {
      const selectedReason = (modal.querySelector('select') as HTMLSelectElement).value

      try {
        await api.post('/rides/driver/cancel', { rideId, reason: selectedReason })
        toast.success('Ride cancelled')
        modal.remove()
        router.push('/driver/dashboard')
      } catch (error: any) {
        toast.error(error.response?.data?.error || 'Failed to cancel ride')
      }
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
          <div className="text-center">
            <div className="text-secondary mb-4">Ride not found or not assigned to you</div>
            <div className="text-sm text-gray-500 mb-4">
              Ride ID: {rideId}
            </div>
            <button
              onClick={() => router.push('/driver/dashboard')}
              className="btn btn-primary"
            >
              Back to Dashboard
            </button>
          </div>
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
    ...(driverLocation ? [{
      position: driverLocation,
      title: 'Your Location',
      type: 'driver' as const,
    }] : []),
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
              <h2 className="text-xl font-bold mb-4">Live Route Tracking</h2>
              <div className="mb-2 text-sm text-secondary">
                🟢 Live tracking active - Your location updates every 10 seconds
              </div>
              <MapView
                key={mapKey}
                markers={markers}
                showRoute={ride.status === 'IN_PROGRESS'}
                height="500px"
              />
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
                <div>
                  <span className="text-secondary">Passengers:</span>
                  <div className="mt-2 space-y-2">
                    {ride.passengers.map((passenger: any) => (
                      <div key={passenger.id} className="flex justify-between items-center p-2 bg-gray-50 rounded">
                        <span className="font-medium">
                          {passenger.firstName} {passenger.lastName}
                        </span>
                        {ride.status === 'IN_PROGRESS' && (
                          <button
                            onClick={() => handleRideAction('end', passenger.id)}
                            className="btn btn-secondary text-xs"
                          >
                            End Trip
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
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
                  <span className="font-medium">{ride.cost.toFixed(2)} ر.س</span>
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

              <div className="flex gap-2 mt-4">
                {nextAction && (
                  <button
                    onClick={() => handleRideAction(nextAction.action as any)}
                    className={`btn btn-${nextAction.color} flex-1`}
                  >
                    {nextAction.label}
                  </button>
                )}
                {(ride.status === 'PENDING' || ride.status === 'ACCEPTED' || ride.status === 'DRIVER_ARRIVED' || ride.status === 'IN_PROGRESS') && (
                  <button
                    onClick={handleCancelRide}
                    className="btn btn-outline flex-1 text-red-500 border-red-500 hover:bg-red-500 hover:text-white"
                  >
                    Cancel Ride
                  </button>
                )}
              </div>
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

export default function DriverTrackRide() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <DriverTrackRideContent />
    </Suspense>
  )
}
