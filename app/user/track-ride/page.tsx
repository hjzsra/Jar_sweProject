'use client'

// Track active ride with live map
export const dynamic = 'force-dynamic';

import { useState, useEffect, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import dynamicImport from 'next/dynamic'
import AuthGuard from '@/components/AuthGuard'
import api from '@/lib/api'
import { calculateDistance } from '@/lib/utils'
import toast from 'react-hot-toast'

const MapView = dynamicImport(() => import('@/components/MapView'), { ssr: false })

function TrackRideContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const rideId = searchParams.get('rideId')
  const [ride, setRide] = useState<any>(null)
  const [driverLocation, setDriverLocation] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [messages, setMessages] = useState<any[]>([])
  const [newMessage, setNewMessage] = useState('')
  const [sosActive, setSosActive] = useState(false)
  const [mapKey, setMapKey] = useState(0) // Force map re-render
  const [lastLocationUpdate, setLastLocationUpdate] = useState<Date | null>(null)

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
      const newDriverLocation = response.data.driverLocation
      if (newDriverLocation && JSON.stringify(newDriverLocation) !== JSON.stringify(driverLocation)) {
        setDriverLocation(newDriverLocation)
        setLastLocationUpdate(new Date())
        setMapKey(prev => prev + 1) // Force map re-render when location changes
      }
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
    const reasons = [
      { value: 'DRIVER_TOO_FAR', label: 'Driver is too far away' },
      { value: 'DRIVER_LATE', label: 'Driver is late' },
      { value: 'DRIVER_NOT_RESPONDING', label: 'Driver is not responding to chat' },
      { value: 'CHANGE_OF_PLANS', label: 'Change of plans' },
      { value: 'OTHER_STUDENT', label: 'Other reason' },
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
        await api.post('/rides/user/cancel', { rideId, reason: selectedReason })
        toast.success('Ride cancelled')
        modal.remove()
        router.push('/user/dashboard')
      } catch (error: any) {
        toast.error(error.response?.data?.error || 'Failed to cancel ride')
      }
    }
  }

  const handleSOS = async () => {
    // Emergency SOS - send immediately without confirmation for faster response
    try {
      // Get current location for emergency services
      let location = null
      try {
        const position = await new Promise<GeolocationPosition>((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 5000 })
        })
        location = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude
        }
      } catch (locationError) {
        console.warn('Could not get location for SOS:', locationError)
      }

      await api.post('/sos', {
        rideId,
        message: 'Emergency SOS from passenger during ride',
        latitude: location?.latitude,
        longitude: location?.longitude
      })
      setSosActive(true)
      toast.success('🚨 SOS ALERT SENT! Emergency services have been notified. Help is on the way.')
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to send SOS alert. Please try again or call emergency services directly.')
      console.error('SOS error:', error)
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

  const markers: Array<{
    position: { lat: number; lng: number };
    title: string;
    type: 'pickup' | 'dropoff' | 'driver';
  }> = [
    {
      position: { lat: ride.pickupLatitude, lng: ride.pickupLongitude },
      title: 'Pickup',
      type: 'pickup',
    },
    {
      position: { lat: ride.dropoffLatitude, lng: ride.dropoffLongitude },
      title: 'Dropoff',
      type: 'dropoff',
    },
  ]

  if (driverLocation) {
    markers.push({
      position: { lat: driverLocation.lat, lng: driverLocation.lng },
      title: `Driver Location - Last updated: ${lastLocationUpdate ? lastLocationUpdate.toLocaleTimeString() : 'Just now'}`,
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
        return 'Trip completed successfully'
      case 'CANCELLED':
        return 'Trip was cancelled - no driver available within 5 minutes'
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
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold">🚗 Live Driver Tracking</h2>
                <div className="text-right">
                  <div className="text-sm font-medium text-primary">
                    {driverLocation ? '🟢 LIVE TRACKING ACTIVE' : '⏳ Waiting for driver location...'}
                  </div>
                  {lastLocationUpdate && (
                    <div className="text-xs text-secondary">
                      Last update: {lastLocationUpdate.toLocaleTimeString()}
                    </div>
                  )}
                </div>
              </div>

              <div className="mb-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="flex items-center space-x-2 text-sm text-blue-800">
                  <span>📍</span>
                  <span>Driver location updates every 5 seconds</span>
                  {driverLocation && (
                    <>
                      <span>•</span>
                      <span className="font-medium">Currently at: {driverLocation.lat.toFixed(4)}, {driverLocation.lng.toFixed(4)}</span>
                    </>
                  )}
                </div>
              </div>

              <MapView
                key={mapKey}
                markers={markers}
                showRoute={ride.status === 'IN_PROGRESS'}
                height="500px"
              />

              {driverLocation && (
                <div className="mt-3 p-2 bg-green-50 border border-green-200 rounded text-center">
                  <span className="text-sm text-green-800 font-medium">
                    🎯 Driver is {calculateDistance(
                      driverLocation.lat,
                      driverLocation.lng,
                      ride.status === 'IN_PROGRESS' ? ride.dropoffLatitude : ride.pickupLatitude,
                      ride.status === 'IN_PROGRESS' ? ride.dropoffLongitude : ride.pickupLongitude
                    ).toFixed(1)} km away
                  </span>
                </div>
              )}
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
                  <span className="text-secondary">Vehicle:</span>
                  <span className="font-medium">
                    {ride.vehicle?.make} {ride.vehicle?.model} - {ride.vehicle?.color} ({ride.vehicle?.licensePlate})
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-secondary">Cost:</span>
                  <span className="font-medium">{ride.costPerPassenger.toFixed(2)} ر.س</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-secondary">Payment:</span>
                  <span className="font-medium">{ride.paymentMethod}</span>
                </div>
              </div>

              <div className="flex gap-2 mt-4">
                {(ride.status === 'PENDING' || ride.status === 'ACCEPTED' || ride.status === 'DRIVER_ARRIVED') && (
                  <button
                    onClick={handleCancelRide}
                    className="btn btn-outline flex-1 text-red-500 border-red-500 hover:bg-red-500 hover:text-white"
                  >
                    Cancel Ride
                  </button>
                )}
                {(ride.status === 'ACCEPTED' || ride.status === 'DRIVER_ARRIVED' || ride.status === 'IN_PROGRESS') && !sosActive && (
                  <button
                    onClick={handleSOS}
                    className="btn flex-1 bg-red-600 hover:bg-red-700 text-white font-bold"
                  >
                    🚨 SOS Emergency
                  </button>
                )}
                {sosActive && (
                  <div className="flex-1 p-3 bg-red-100 border border-red-300 rounded-lg text-center">
                    <p className="text-red-800 font-bold">SOS ACTIVE</p>
                    <p className="text-sm text-red-600">Help is on the way</p>
                  </div>
                )}
                {(ride.status === 'COMPLETED' || ride.status === 'CANCELLED') && (
                  <button
                    onClick={() => router.push('/user/book-ride')}
                    className="btn btn-primary flex-1"
                  >
                    Book Another Ride
                  </button>
                )}
              </div>
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
export default function TrackRide() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <TrackRideContent />
    </Suspense>
  )
}