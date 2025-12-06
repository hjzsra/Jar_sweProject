// Enhanced booking page with interactive map
'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import dynamic from 'next/dynamic'
import AuthGuard from '@/components/AuthGuard'
import AddressAutocomplete from '@/components/AddressAutocomplete'
import api from '@/lib/api'
import { PRICING } from '@/lib/constants'
import toast from 'react-hot-toast'

const MapView = dynamic(() => import('@/components/MapView'), {
  ssr: false,
  loading: () => <div className="h-[500px] bg-gray-200 animate-pulse rounded-lg flex items-center justify-center">Loading map...</div>
})

export default function BookRide() {
  const router = useRouter()
  const [step, setStep] = useState<'location' | 'passengers' | 'confirm'>('location')
  const [pickupLocation, setPickupLocation] = useState<{ lat: number; lng: number } | null>(null)
  const [dropoffLocation, setDropoffLocation] = useState<{ lat: number; lng: number } | null>(null)
  const [pickupAddress, setPickupAddress] = useState('')
  const [dropoffAddress, setDropoffAddress] = useState('')
  // Removed driver selection
  const [passengers, setPassengers] = useState<any[]>([])
  const [passengerEmails, setPassengerEmails] = useState<string[]>([])
  const [formData, setFormData] = useState({
    isPreBooked: false,
    scheduledTime: '',
    paymentMethod: 'cash',
  })
  const [loading, setLoading] = useState(false)
  const [estimatedCost, setEstimatedCost] = useState(0)
  const [costPerPassenger, setCostPerPassenger] = useState(0)

  useEffect(() => {
    if (pickupLocation && dropoffLocation) {
      calculateEstimatedCost()
    }
  }, [pickupLocation, dropoffLocation, passengers])

  const getCurrentLocation = () => {
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setPickupLocation({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        })
        reverseGeocode(position.coords.latitude, position.coords.longitude, 'pickup')
      },
      () => {
        toast.error('Please enable location services')
      }
    )
  }

  const reverseGeocode = async (lat: number, lng: number, type: 'pickup' | 'dropoff') => {
    try {
      // Use Nominatim for reverse geocoding (consistent with AddressAutocomplete)
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&addressdetails=1`
      )
      const data = await response.json()
      if (data && data.display_name) {
        const address = data.display_name
        if (type === 'pickup') {
          setPickupAddress(address)
        } else {
          setDropoffAddress(address)
        }
      }
    } catch (error) {
      console.error('Geocoding error:', error)
    }
  }

  const calculateEstimatedCost = () => {
    if (!pickupLocation || !dropoffLocation) return

    const R = 6371 // Earth's radius in km
    const dLat = ((dropoffLocation.lat - pickupLocation.lat) * Math.PI) / 180
    const dLng = ((dropoffLocation.lng - pickupLocation.lng) * Math.PI) / 180
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((pickupLocation.lat * Math.PI) / 180) *
        Math.cos((dropoffLocation.lat * Math.PI) / 180) *
        Math.sin(dLng / 2) *
        Math.sin(dLng / 2)
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
    const distance = R * c

    const totalCost = distance * PRICING.BASE_RATE_PER_KM
    const passengerCount = Math.max(passengers.length + 1, 1) // +1 for current user
    const perPassengerCost = totalCost / passengerCount

    setEstimatedCost(totalCost)
    setCostPerPassenger(perPassengerCost)
  }


  const addPassenger = async () => {
    const email = passengerEmails[passengerEmails.length - 1]?.trim()
    if (!email) return

    // Check if already added
    if (passengers.some(p => p.email === email)) {
      toast.error('Passenger already added')
      return
    }

    setLoading(true)
    try {
      // For now, we'll assume we have an API to search users by email
      // In a real implementation, you'd have an API endpoint for this
      const response = await api.get('/user/search', { params: { email } })
      const user = response.data.user

      if (!user) {
        toast.error('User not found')
        return
      }

      setPassengers([...passengers, user])
      setPassengerEmails([...passengerEmails.slice(0, -1), '']) // Clear the input
      toast.success('Passenger added!')
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to add passenger')
    } finally {
      setLoading(false)
    }
  }

  const handleBookRide = async () => {
    if (!pickupLocation || !dropoffLocation) return

    if (!pickupAddress.trim() || !dropoffAddress.trim()) {
      toast.error('Please provide valid pickup and dropoff addresses')
      return
    }

    setLoading(true)
    try {
      const passengerIds = passengers.map(p => p.id)
      const response = await api.post('/rides/create', {
        pickupLatitude: pickupLocation.lat,
        pickupLongitude: pickupLocation.lng,
        dropoffLatitude: dropoffLocation.lat,
        dropoffLongitude: dropoffLocation.lng,
        pickupAddress,
        dropoffAddress,
        passengerIds: passengerIds.length > 0 ? passengerIds : undefined,
        ...formData,
      })
      toast.success('Ride request created!')
      router.push(`/user/track-ride?rideId=${response.data.ride.id}`)
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to create ride')
    } finally {
      setLoading(false)
    }
  }

  const markers = []
  if (pickupLocation) {
    markers.push({
      position: pickupLocation,
      title: 'Pickup',
      type: 'pickup' as const,
    })
  }
  if (dropoffLocation) {
    markers.push({
      position: dropoffLocation,
      title: 'Dropoff',
      type: 'dropoff' as const,
    })
  }

  return (
    <AuthGuard requiredRole="user">
      <div className="min-h-screen bg-background">
        <nav className="bg-white shadow-sm p-4">
          <div className="max-w-7xl mx-auto flex justify-between items-center">
            <h1 className="text-xl font-bold text-primary">Request a Ride</h1>
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
          <div className="lg:col-span-2">
            <div className="card">
              <h2 className="text-xl font-bold mb-4">Select Locations</h2>
              <MapView
                markers={markers}
                showRoute={pickupLocation && dropoffLocation ? true : false}
                height="500px"
                onLocationSelect={(lat, lng, address) => {
                  if (!pickupLocation) {
                    setPickupLocation({ lat, lng })
                    if (address) setPickupAddress(address)
                    toast.success('Pickup location set')
                  } else if (!dropoffLocation) {
                    setDropoffLocation({ lat, lng })
                    if (address) setDropoffAddress(address)
                    toast.success('Dropoff location set')
                  } else {
                    toast('Reset locations to set new ones', { icon: 'ℹ️' })
                  }
                }}
              />
              <div className="mt-4 flex gap-2">
                <button onClick={getCurrentLocation} className="btn btn-primary">
                  Use Current Location as Pickup
                </button>
                <button
                  onClick={() => {
                    setPickupLocation(null)
                    setDropoffLocation(null)
                    setPickupAddress('')
                    setDropoffAddress('')
                  }}
                  className="btn btn-outline"
                >
                  Reset Locations
                </button>
              </div>
            </div>
          </div>

          {/* Booking Form Section */}
          <div className="card">
            <h3 className="text-xl font-bold mb-4">Booking Details</h3>

            {step === 'location' && (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Pickup Location</label>
                  <AddressAutocomplete
                    value={pickupAddress}
                    onChange={setPickupAddress}
                    onPlaceSelect={(lat, lng, address) => {
                      setPickupLocation({ lat, lng })
                      setPickupAddress(address)
                      toast.success('Pickup location selected')
                    }}
                    placeholder="Search or click on map"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Dropoff Location</label>
                  <AddressAutocomplete
                    value={dropoffAddress}
                    onChange={setDropoffAddress}
                    onPlaceSelect={(lat, lng, address) => {
                      setDropoffLocation({ lat, lng })
                      setDropoffAddress(address)
                      toast.success('Dropoff location selected')
                    }}
                    placeholder="Search or click on map"
                  />
                </div>

                {estimatedCost > 0 && (
                  <div className="p-4 bg-primary text-white rounded-lg">
                    <p className="text-sm">Estimated Total Cost</p>
                    <p className="text-2xl font-bold">{estimatedCost.toFixed(2)} ر.س</p>
                    <p className="text-sm opacity-90">
                      ({costPerPassenger.toFixed(2)} ر.س per passenger)
                    </p>
                  </div>
                )}

                <button
                  onClick={() => setStep('passengers')}
                  className="btn btn-primary w-full"
                  disabled={!pickupLocation || !dropoffLocation}
                >
                  Continue to Ride Request
                </button>
              </div>
            )}

            {step === 'passengers' && (
              <div className="space-y-4">
                <h4 className="font-medium">Add Passengers (Optional)</h4>
                <p className="text-sm text-secondary">
                  Add friends to share this ride. Cost will be split equally.
                </p>

                <div className="space-y-2">
                  <div className="flex gap-2">
                    <input
                      type="email"
                      placeholder="Enter passenger email"
                      className="input flex-1"
                      value={passengerEmails[passengerEmails.length - 1] || ''}
                      onChange={(e) => {
                        const newEmails = [...passengerEmails]
                        newEmails[newEmails.length - 1] = e.target.value
                        setPassengerEmails(newEmails)
                      }}
                    />
                    <button
                      onClick={addPassenger}
                      className="btn btn-outline"
                      disabled={!passengerEmails[passengerEmails.length - 1]?.trim() || loading}
                    >
                      {loading ? 'Adding...' : 'Add'}
                    </button>
                  </div>

                  {passengers.length > 0 && (
                    <div className="space-y-2">
                      <p className="text-sm font-medium">Added Passengers:</p>
                      {passengers.map((passenger, index) => (
                        <div key={passenger.id} className="flex justify-between items-center p-2 bg-gray-50 rounded">
                          <span>{passenger.firstName} {passenger.lastName} ({passenger.email})</span>
                          <button
                            onClick={() => {
                              setPassengers(passengers.filter((_, i) => i !== index))
                            }}
                            className="text-red-500 hover:text-red-700"
                          >
                            Remove
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {estimatedCost > 0 && (
                  <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                    <p className="text-sm font-medium text-green-800">Cost Breakdown</p>
                    <p className="text-lg font-bold text-green-900">
                      Total: {estimatedCost.toFixed(2)} ر.س
                    </p>
                    <p className="text-sm text-green-700">
                      Per passenger: {costPerPassenger.toFixed(2)} ر.س ({passengers.length + 1} passengers)
                    </p>
                  </div>
                )}

                <div className="flex gap-2">
                  <button onClick={() => setStep('location')} className="btn btn-outline flex-1">
                    Back
                  </button>
                  <button
                    onClick={() => setStep('confirm')}
                    className="btn btn-primary flex-1"
                  >
                    Continue
                  </button>
                </div>
              </div>
            )}


            {step === 'confirm' && (
              <div className="space-y-4">
                <div>
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={formData.isPreBooked}
                      onChange={(e) =>
                        setFormData({ ...formData, isPreBooked: e.target.checked })
                      }
                    />
                    <span>Pre-book this ride</span>
                  </label>
                </div>

                {formData.isPreBooked && (
                  <div>
                    <label className="block text-sm font-medium mb-2">Scheduled Time</label>
                    <input
                      type="datetime-local"
                      value={formData.scheduledTime}
                      onChange={(e) =>
                        setFormData({ ...formData, scheduledTime: e.target.value })
                      }
                      className="input"
                      required={formData.isPreBooked}
                    />
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium mb-2">Payment Method</label>
                  <select
                    value={formData.paymentMethod}
                    onChange={(e) =>
                      setFormData({ ...formData, paymentMethod: e.target.value })
                    }
                    className="input"
                  >
                    <option value="cash">Cash</option>
                    <option value="apple_pay">Apple Pay</option>
                  </select>
                </div>

                <div className="p-4 bg-gray-50 rounded-lg space-y-2">
                   <h4 className="font-medium">Ride Request Summary</h4>
                   <div className="text-sm space-y-1">
                     <p>
                       <span className="text-secondary">From:</span> {pickupAddress}
                     </p>
                     <p>
                       <span className="text-secondary">To:</span> {dropoffAddress}
                     </p>
                     <p>
                       <span className="text-secondary">Passengers:</span> {passengers.length + 1}
                     </p>
                     <p>
                       <span className="text-secondary">Estimated Total Cost:</span>{' '}
                       {estimatedCost.toFixed(2)} ر.س
                     </p>
                     <p>
                       <span className="text-secondary">Cost per passenger:</span>{' '}
                       {costPerPassenger.toFixed(2)} ر.س
                     </p>
                     {passengers.length > 0 && (
                       <div className="mt-2">
                         <p className="text-secondary text-xs">Passengers:</p>
                         <ul className="text-xs ml-4">
                           {passengers.map((p, i) => (
                             <li key={i}>• {p.firstName} {p.lastName}</li>
                           ))}
                         </ul>
                       </div>
                     )}
                   </div>
                 </div>

                <div className="flex gap-2">
                  <button onClick={() => setStep('passengers')} className="btn btn-outline flex-1">
                    Back
                  </button>
                  <button
                    onClick={handleBookRide}
                    className="btn btn-primary flex-1"
                    disabled={loading}
                  >
                    {loading ? 'Requesting...' : 'Request Ride'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </AuthGuard>
  )
}