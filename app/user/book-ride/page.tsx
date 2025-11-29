// Enhanced booking page with interactive map
'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import AuthGuard from '@/components/AuthGuard'
import MapView from '@/components/MapView'
import AddressAutocomplete from '@/components/AddressAutocomplete'
import api from '@/lib/api'
import toast from 'react-hot-toast'

export default function BookRide() {
  const router = useRouter()
  const [step, setStep] = useState<'location' | 'driver' | 'confirm'>('location')
  const [pickupLocation, setPickupLocation] = useState<{ lat: number; lng: number } | null>(null)
  const [dropoffLocation, setDropoffLocation] = useState<{ lat: number; lng: number } | null>(null)
  const [pickupAddress, setPickupAddress] = useState('')
  const [dropoffAddress, setDropoffAddress] = useState('')
  const [nearbyDrivers, setNearbyDrivers] = useState<any[]>([])
  const [selectedDriver, setSelectedDriver] = useState<any>(null)
  const [formData, setFormData] = useState({
    isPreBooked: false,
    scheduledTime: '',
    paymentMethod: 'cash',
  })
  const [loading, setLoading] = useState(false)
  const [estimatedCost, setEstimatedCost] = useState(0)

  useEffect(() => {
    if (pickupLocation && dropoffLocation) {
      calculateEstimatedCost()
    }
  }, [pickupLocation, dropoffLocation])

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
      const response = await fetch(
        `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=AIzaSyBFw0Qbyq9zTFTd-tUY6dZWTgaQzuU17R8`
      )
      const data = await response.json()
      if (data.results && data.results[0]) {
        const address = data.results[0].formatted_address
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

    setEstimatedCost(distance * 1) // $1 per km
  }

  const loadNearbyDrivers = async () => {
    if (!pickupLocation) return

    setLoading(true)
    try {
      const response = await api.get('/rides/nearby-drivers', {
        params: {
          latitude: pickupLocation.lat,
          longitude: pickupLocation.lng,
          radius: 10,
        },
      })
      setNearbyDrivers(response.data.drivers)
      setStep('driver')
    } catch (error) {
      toast.error('Failed to load nearby drivers')
    } finally {
      setLoading(false)
    }
  }

  const handleBookRide = async () => {
    if (!selectedDriver || !pickupLocation || !dropoffLocation) return

    setLoading(true)
    try {
      const response = await api.post('/rides/create', {
        driverId: selectedDriver.id,
        pickupLatitude: pickupLocation.lat,
        pickupLongitude: pickupLocation.lng,
        dropoffLatitude: dropoffLocation.lat,
        dropoffLongitude: dropoffLocation.lng,
        pickupAddress,
        dropoffAddress,
        ...formData,
      })
      toast.success('Ride request created!')
      router.push(`/user/track-ride?rideId=${response.data.rideId}`)
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
            <h1 className="text-xl font-bold text-primary">Book a Ride</h1>
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
                    <p className="text-sm">Estimated Cost</p>
                    <p className="text-2xl font-bold">{estimatedCost.toFixed(2)} ر.س</p>
                  </div>
                )}

                <button
                  onClick={loadNearbyDrivers}
                  className="btn btn-primary w-full"
                  disabled={!pickupLocation || !dropoffLocation || loading}
                >
                  {loading ? 'Loading...' : 'Find Drivers'}
                </button>
              </div>
            )}

            {step === 'driver' && (
              <div className="space-y-4">
                <h4 className="font-medium">Available Drivers ({nearbyDrivers.length})</h4>
                {nearbyDrivers.length === 0 ? (
                  <p className="text-secondary">No drivers available in your area</p>
                ) : (
                  <div className="space-y-2 max-h-[400px] overflow-y-auto">
                    {nearbyDrivers.map((driver) => (
                      <div
                        key={driver.id}
                        className={`p-3 border rounded-lg cursor-pointer hover:bg-gray-50 ${
                          selectedDriver?.id === driver.id ? 'border-primary bg-blue-50' : ''
                        }`}
                        onClick={() => setSelectedDriver(driver)}
                      >
                        <div className="flex justify-between items-start">
                          <div>
                            <p className="font-medium">
                              {driver.firstName} {driver.lastName}
                            </p>
                            <p className="text-sm text-secondary">
                              {driver.carModel} - {driver.carColor}
                            </p>
                            <p className="text-xs text-secondary">
                              {driver.distance?.toFixed(2)} km away
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="text-sm">⭐ {driver.averageRating?.toFixed(1) || 'N/A'}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                <div className="flex gap-2">
                  <button onClick={() => setStep('location')} className="btn btn-outline flex-1">
                    Back
                  </button>
                  <button
                    onClick={() => setStep('confirm')}
                    className="btn btn-primary flex-1"
                    disabled={!selectedDriver}
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
                  <h4 className="font-medium">Ride Summary</h4>
                  <div className="text-sm space-y-1">
                    <p>
                      <span className="text-secondary">Driver:</span> {selectedDriver?.firstName}{' '}
                      {selectedDriver?.lastName}
                    </p>
                    <p>
                      <span className="text-secondary">From:</span> {pickupAddress}
                    </p>
                    <p>
                      <span className="text-secondary">To:</span> {dropoffAddress}
                    </p>
                    <p>
                      <span className="text-secondary">Estimated Cost:</span>{' '}
                      {estimatedCost.toFixed(2)} ر.س
                    </p>
                  </div>
                </div>

                <div className="flex gap-2">
                  <button onClick={() => setStep('driver')} className="btn btn-outline flex-1">
                    Back
                  </button>
                  <button
                    onClick={handleBookRide}
                    className="btn btn-primary flex-1"
                    disabled={loading}
                  >
                    {loading ? 'Booking...' : 'Confirm Booking'}
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
