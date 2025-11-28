// User dashboard page
'use client'

import { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import dynamic from 'next/dynamic'
import api from '@/lib/api'
import toast from 'react-hot-toast'
import AuthGuard from '@/components/AuthGuard'
import Wallet from '@/components/Wallet'
import {
  FaUser,
  FaMapMarkerAlt,
  FaCar,
  FaWallet as FaWalletIcon,
  FaHistory,
} from 'react-icons/fa'
import { LatLng } from 'leaflet'

const MapComponent = dynamic(() => import('@/components/MapComponent'), {
  ssr: false,
})

type Location = {
  lat: number
  lng: number
  address: string
}

type Driver = {
  id: string
  firstName: string
  lastName: string
  latitude: number
  longitude: number
  distance: number
}

type Ride = {
  id: string
  status: string
  driver: {
    firstName: string
    lastName: string
  }
  pickupAddress: string
  dropoffAddress: string
  createdAt: string
}

export default function UserDashboard() {
  const router = useRouter()
  const [user, setUser] = useState<any>(null)
  const [activeTab, setActiveTab] = useState('book')
  const [pickupLocation, setPickupLocation] = useState<Location | null>(null)
  const [dropoffLocation, setDropoffLocation] = useState<Location | null>(null)
  const [nearbyDrivers, setNearbyDrivers] = useState<Driver[]>([])
  const [selectedDriver, setSelectedDriver] = useState<Driver | null>(null)
  const [loading, setLoading] = useState(false)
  const [rideHistory, setRideHistory] = useState<Ride[]>([])
  const [userLocation, setUserLocation] = useState<[number, number] | null>(null);
  const [profileData, setProfileData] = useState({
    firstName: '',
    lastName: '',
    phone: '',
  });
  const [otp, setOtp] = useState('');
  const [otpSent, setOtpSent] = useState(false);

  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      const parsedUser = JSON.parse(storedUser);
      setUser(parsedUser);
      setProfileData({
        firstName: parsedUser.firstName || '',
        lastName: parsedUser.lastName || '',
        phone: parsedUser.phone || '',
      });
    }

    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          setUserLocation([latitude, longitude]);
          setPickupLocation({
            lat: latitude,
            lng: longitude,
            address: 'Current Location',
          });
          toast.success('Your location has been set as pickup.');
        },
        () => {
          toast.error('Could not get your location. Please allow location access and refresh.');
        }
      );
    }
  }, [])

  useEffect(() => {
    if (activeTab === 'history') {
      fetchRideHistory()
    }
  }, [activeTab])

  const handleLocationSelect = (location: Location, type: 'pickup' | 'dropoff') => {
    if (type === 'pickup') {
      setPickupLocation(location)
    } else {
      setDropoffLocation(location)
    }
  }

  const handleMapClick = async (latlng: LatLng) => {
    setLoading(true);
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latlng.lat}&lon=${latlng.lng}`
      );
      const data = await response.json();
      const address = data.display_name || 'Selected Location';

      const newLocation = { lat: latlng.lat, lng: latlng.lng, address };

      if (!pickupLocation) {
        setPickupLocation(newLocation);
        toast.success('Pickup location set.');
      } else {
        setDropoffLocation(newLocation);
        toast.success('Dropoff location set.');
      }
    } catch (error) {
      toast.error('Could not get address for the selected location.');
    } finally {
      setLoading(false);
    }
  };

  const handleFindRide = async () => {
    if (!pickupLocation) {
      toast.error('Please select a pickup location')
      return
    }
    setLoading(true)
    try {
      const { data } = await api.get('/rides/nearby-drivers', {
        params: {
          latitude: pickupLocation.lat,
          longitude: pickupLocation.lng,
          radius: 5000, // 5km radius
        },
      })
      setNearbyDrivers(data.drivers)
      if (data.drivers.length === 0) {
        toast('No drivers found nearby.', { icon: '🤷' })
      }
    } catch (error) {
      toast.error('Failed to find nearby drivers')
    } finally {
      setLoading(false)
    }
  }

  const handleBookRide = async () => {
    if (!selectedDriver || !pickupLocation || !dropoffLocation) {
      toast.error('Please select a driver and locations.')
      return
    }
    setLoading(true)
    try {
      const response = await api.post('/rides/create', {
        driverId: selectedDriver.id,
        pickupLatitude: pickupLocation.lat,
        pickupLongitude: pickupLocation.lng,
        pickupAddress: pickupLocation.address,
        dropoffLatitude: dropoffLocation.lat,
        dropoffLongitude: dropoffLocation.lng,
        dropoffAddress: dropoffLocation.address,
        paymentMethod: 'cash', // Or get from UI
      })
      toast.success('Ride booked successfully!')
      setActiveTab('history')
    } catch (error) {
      toast.error('Failed to book ride.')
    } finally {
      setLoading(false)
    }
  }

  const fetchRideHistory = async () => {
    setLoading(true)
    try {
      const { data } = await api.get('/user/trip-history')
      setRideHistory(data)
    } catch (error) {
      toast.error('Failed to fetch ride history')
    } finally {
      setLoading(false)
    }
  }

  const handleLogout = () => {
    localStorage.removeItem('token')
    localStorage.removeItem('role')
    localStorage.removeItem('user')
    router.push('/user/login')
  }

  const handleProfileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setProfileData({ ...profileData, [e.target.name]: e.target.value });
  };

  const handleUpdateProfile = async () => {
    setLoading(true);
    try {
      const { data } = await api.put('/user/profile', profileData);
      toast.success('Profile updated successfully');
      setUser(data.user);
      localStorage.setItem('user', JSON.stringify(data.user));
    } catch (error) {
      toast.error('Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  const handleSendOtp = async () => {
    setLoading(true);
    try {
      await api.post('/auth/user/send-otp', { phone: profileData.phone });
      setOtpSent(true);
      toast.success('OTP sent to your phone');
    } catch (error) {
      toast.error('Failed to send OTP');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async () => {
    setLoading(true);
    try {
      await api.post('/auth/user/verify-otp', { otp });
      toast.success('Phone number verified successfully');
      const { data } = await api.get('/user/profile');
      setUser(data.user);
      localStorage.setItem('user', JSON.stringify(data.user));
      setOtpSent(false);
    } catch (error) {
      toast.error('Invalid or expired OTP');
    } finally {
      setLoading(false);
    }
  };

  const mapCenter = useMemo((): [number, number] => {
    if (userLocation) {
      return userLocation;
    }
    if (pickupLocation) {
      return [pickupLocation.lat, pickupLocation.lng]
    }
    return [24.7136, 46.6753] // Default to Riyadh
  }, [pickupLocation, userLocation])

  const mapMarkers = useMemo(() => {
    const markers = []
    if (pickupLocation) {
      markers.push({
        position: [pickupLocation.lat, pickupLocation.lng] as [number, number],
        popupText: `Pickup: ${pickupLocation.address}`,
      })
    }
    if (dropoffLocation) {
      markers.push({
        position: [dropoffLocation.lat, dropoffLocation.lng] as [number, number],
        popupText: `Dropoff: ${dropoffLocation.address}`,
      })
    }
    nearbyDrivers.forEach((driver) => {
      if (driver.latitude && driver.longitude) {
        markers.push({
          position: [driver.latitude, driver.longitude] as [number, number],
          popupText: `${driver.firstName} ${driver.lastName}`,
        })
      }
    })
    return markers
  }, [pickupLocation, dropoffLocation, nearbyDrivers])

  const renderContent = () => {
    switch (activeTab) {
      case 'profile':
        return user ? (
          <div className="card">
            <h3 className="text-xl font-bold mb-4">My Profile</h3>
            <div className="space-y-4">
              <div>
                <label className="label">First Name</label>
                <input
                  type="text"
                  name="firstName"
                  value={profileData.firstName}
                  onChange={handleProfileChange}
                  className="input"
                />
              </div>
              <div>
                <label className="label">Last Name</label>
                <input
                  type="text"
                  name="lastName"
                  value={profileData.lastName}
                  onChange={handleProfileChange}
                  className="input"
                />
              </div>
              <div>
                <label className="label">Phone Number</label>
                <input
                  type="text"
                  name="phone"
                  value={profileData.phone}
                  onChange={handleProfileChange}
                  className="input"
                />
              </div>
              <button onClick={handleUpdateProfile} className="btn btn-primary" disabled={loading}>
                {loading ? 'Saving...' : 'Save Profile'}
              </button>

              <hr className="my-6" />

              <h4 className="text-lg font-bold">Phone Verification</h4>
              {user.phoneVerified ? (
                <p className="text-success">Your phone number is verified.</p>
              ) : (
                <div>
                  <p>Your phone number is not verified.</p>
                  {!otpSent ? (
                    <button onClick={handleSendOtp} className="btn btn-secondary mt-2" disabled={loading}>
                      {loading ? 'Sending...' : 'Send Verification Code'}
                    </button>
                  ) : (
                    <div className="flex gap-2 mt-2">
                      <input
                        type="text"
                        value={otp}
                        onChange={(e) => setOtp(e.target.value)}
                        placeholder="Enter OTP"
                        className="input"
                      />
                      <button onClick={handleVerifyOtp} className="btn btn-primary" disabled={loading}>
                        {loading ? 'Verifying...' : 'Verify'}
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        ) : (
          <p>Loading profile...</p>
        )
      case 'wallet':
        return <Wallet />
      case 'history':
        return (
          <div className="card">
            <h3 className="text-xl font-bold mb-4">Ride History</h3>
            {loading && <p>Loading history...</p>}
            {!loading && rideHistory.length === 0 && <p>No rides yet.</p>}
            <div className="space-y-4">
              {rideHistory.map((ride) => (
                <div key={ride.id} className="border p-4 rounded-lg">
                  <p>
                    <strong>Driver:</strong> {ride.driver.firstName} {ride.driver.lastName}
                  </p>
                  <p>
                    <strong>From:</strong> {ride.pickupAddress}
                  </p>
                  <p>
                    <strong>To:</strong> {ride.dropoffAddress}
                  </p>
                  <p>
                    <strong>Status:</strong> {ride.status}
                  </p>
                  <p>
                    <strong>Date:</strong> {new Date(ride.createdAt).toLocaleString()}
                  </p>
                  {ride.status === 'IN_PROGRESS' && (
                    <button
                      onClick={() => router.push(`/user/chat?rideId=${ride.id}`)}
                      className="btn btn-secondary mt-2"
                    >
                      Chat with Driver
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        )
      case 'book':
      default:
        return (
          <div className="flex flex-col lg:flex-row gap-4">
            <div className="lg:w-1/3 card">
              <LocationSearch
                onLocationSelect={(loc) => handleLocationSelect(loc, 'pickup')}
                placeholder="Pickup Location"
                value={pickupLocation?.address}
              />
              <LocationSearch
                onLocationSelect={(loc) => handleLocationSelect(loc, 'dropoff')}
                placeholder="Dropoff Location"
                value={dropoffLocation?.address}
              />
              <button
                onClick={handleFindRide}
                className="btn btn-primary w-full mt-4"
                disabled={loading || !pickupLocation}
              >
                {loading ? 'Finding...' : 'Find a Ride'}
              </button>

              {nearbyDrivers.length > 0 && (
                <div className="mt-4">
                  <h4 className="font-bold">Nearby Drivers:</h4>
                  <ul className="space-y-2 mt-2">
                    {nearbyDrivers.map((driver) => (
                      <li
                        key={driver.id}
                        onClick={() => setSelectedDriver(driver)}
                        className={`p-2 rounded cursor-pointer ${
                          selectedDriver?.id === driver.id ? 'bg-primary text-white' : 'bg-gray-100'
                        }`}
                      >
                        {driver.firstName} ({driver.distance ? driver.distance.toFixed(2) + 'km away' : ''})
                      </li>
                    ))}
                  </ul>
                  <button
                    onClick={handleBookRide}
                    className="btn btn-accent w-full mt-4"
                    disabled={loading || !selectedDriver || !dropoffLocation}
                  >
                    {loading ? 'Booking...' : 'Book Ride'}
                  </button>
                </div>
              )}
            </div>
            <div className="lg:w-2/3 h-96 lg:h-auto card">
              <MapComponent
                center={mapCenter}
                markers={mapMarkers}
                onMapClick={handleMapClick}
              />
            </div>
          </div>
        )
    }
  }

  return (
    <AuthGuard requiredRole="user">
      <div className="min-h-screen bg-background">
        <nav className="bg-white shadow-sm p-4 flex justify-between items-center">
          <h1 className="text-xl font-bold text-primary">Dashboard</h1>
          <button onClick={handleLogout} className="btn btn-outline">
            Logout
          </button>
        </nav>
        <div className="p-4">
          <div className="flex space-x-4 mb-4 border-b">
            <button
              onClick={() => setActiveTab('book')}
              className={`pb-2 ${activeTab === 'book' ? 'border-b-2 border-primary' : ''}`}
            >
              <FaCar className="inline mr-2" />
              Book a Ride
            </button>
            <button
              onClick={() => setActiveTab('profile')}
              className={`pb-2 ${activeTab === 'profile' ? 'border-b-2 border-primary' : ''}`}
            >
              <FaUser className="inline mr-2" />
              Profile
            </button>
            <button
              onClick={() => setActiveTab('wallet')}
              className={`pb-2 ${activeTab === 'wallet' ? 'border-b-2 border-primary' : ''}`}
            >
              <FaWalletIcon className="inline mr-2" />
              Wallet
            </button>
            <button
              onClick={() => setActiveTab('history')}
              className={`pb-2 ${activeTab === 'history' ? 'border-b-2 border-primary' : ''}`}
            >
              <FaHistory className="inline mr-2" />
              History
            </button>
          </div>
          {renderContent()}
        </div>
      </div>
    </AuthGuard>
  )
}

function LocationSearch({
  onLocationSelect,
  placeholder,
  value,
}: {
  onLocationSelect: (location: Location) => void
  placeholder: string
  value?: string
}) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<any[]>([])

  useEffect(() => {
    if (value) {
      setQuery(value)
    }
  }, [value])

  const handleSearch = async () => {
    if (!query) return
    // Using OpenStreetMap's Nominatim, bounded to Riyadh
    const riyadhViewbox = '46.620,24.820,46.820,24.620'; // lng,lat,lng,lat (left,top,right,bottom)
    const response = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&q=${query}&viewbox=${riyadhViewbox}&bounded=1`
    )
    const data = await response.json()
    setResults(data)
  }

  return (
    <div className="relative">
      <input
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder={placeholder}
        className="input w-full"
      />
      <button onClick={handleSearch} className="absolute right-2 top-2 text-primary">
        Search
      </button>
      {results.length > 0 && (
        <ul className="absolute z-10 bg-white border rounded w-full mt-1 max-h-48 overflow-y-auto">
          {results.map((item) => (
            <li
              key={item.place_id}
              onClick={() => {
                onLocationSelect({
                  lat: parseFloat(item.lat),
                  lng: parseFloat(item.lon),
                  address: item.display_name,
                })
                setQuery(item.display_name)
                setResults([])
              }}
              className="p-2 cursor-pointer hover:bg-gray-100"
            >
              {item.display_name}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}