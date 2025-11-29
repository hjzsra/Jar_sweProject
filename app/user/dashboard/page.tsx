// User dashboard page
'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import AuthGuard from '@/components/AuthGuard'
import api from '@/lib/api'
import toast from 'react-hot-toast'

export default function UserDashboard() {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState<'home' | 'profile' | 'wallet' | 'history' | 'book'>('home')
  const [user, setUser] = useState<any>(null)
  const [walletBalance, setWalletBalance] = useState(0)
  const [tripHistory, setTripHistory] = useState<any[]>([])
  const [nearbyDrivers, setNearbyDrivers] = useState<any[]>([])
  const [activeRide, setActiveRide] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadUserData()
    // Check for active ride periodically
    const interval = setInterval(loadActiveRide, 10000) // Every 10 seconds
    return () => clearInterval(interval)
  }, [])

  const loadUserData = async () => {
    try {
      const [profileRes, walletRes] = await Promise.all([
        api.get('/user/profile'),
        api.get('/user/wallet'),
      ])
      setUser(profileRes.data.user)
      setWalletBalance(walletRes.data.balance)
      loadActiveRide()
    } catch (error) {
      toast.error('Failed to load user data')
    } finally {
      setLoading(false)
    }
  }

  const loadActiveRide = async () => {
    try {
      const response = await api.get('/user/active-ride')
      setActiveRide(response.data.ride)
    } catch (error) {
      // Silently fail - user might not have an active ride
      console.error('Failed to load active ride')
    }
  }

  const loadTripHistory = async () => {
    try {
      const response = await api.get('/user/trip-history')
      setTripHistory(response.data.rides)
    } catch (error) {
      toast.error('Failed to load trip history')
    }
  }

  const loadNearbyDrivers = async () => {
    try {
      // Get user location (in production, use geolocation API)
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const response = await api.get('/rides/nearby-drivers', {
            params: {
              latitude: position.coords.latitude,
              longitude: position.coords.longitude,
              radius: 5,
            },
          })
          setNearbyDrivers(response.data.drivers)
        },
        () => {
          toast.error('Please enable location services')
        }
      )
    } catch (error) {
      toast.error('Failed to load nearby drivers')
    }
  }

  const handleLogout = () => {
    localStorage.removeItem('token')
    localStorage.removeItem('role')
    localStorage.removeItem('user')
    router.push('/')
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

  return (
    <AuthGuard requiredRole="user">
      <div className="min-h-screen bg-background">
        <nav className="bg-white shadow-sm p-4">
          <div className="max-w-7xl mx-auto flex justify-between items-center">
            <h1 className="text-xl font-bold text-primary">Student Ride Sharing</h1>
            <div className="flex gap-4 items-center">
              <span className="text-secondary">{user?.firstName} {user?.lastName}</span>
              <button onClick={handleLogout} className="btn btn-outline">
                Logout
              </button>
            </div>
          </div>
        </nav>

        <div className="max-w-7xl mx-auto p-4">
          <div className="flex gap-4 mb-6 flex-wrap">
            <button
              onClick={() => setActiveTab('home')}
              className={`btn ${activeTab === 'home' ? 'btn-primary' : 'btn-outline'}`}
            >
              Home
            </button>
            <button
              onClick={() => router.push('/user/book-ride')}
              className="btn bg-accent text-white hover:bg-green-700"
            >
              Book Ride with Map
            </button>
            <button
              onClick={() => {
                setActiveTab('profile')
                loadUserData()
              }}
              className={`btn ${activeTab === 'profile' ? 'btn-primary' : 'btn-outline'}`}
            >
              Profile
            </button>
            <button
              onClick={() => {
                setActiveTab('wallet')
                loadUserData()
              }}
              className={`btn ${activeTab === 'wallet' ? 'btn-primary' : 'btn-outline'}`}
            >
              Wallet
            </button>
            <button
              onClick={() => {
                setActiveTab('history')
                loadTripHistory()
              }}
              className={`btn ${activeTab === 'history' ? 'btn-primary' : 'btn-outline'}`}
            >
              Trip History
            </button>
            <button
              onClick={() => router.push('/support')}
              className="btn btn-outline"
            >
              Support
            </button>
          </div>

          {activeTab === 'home' && (
            <div className="space-y-4">
              {activeRide && (
                <div className="card bg-accent text-white">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h3 className="text-xl font-bold">Active Ride</h3>
                      <p className="text-sm opacity-90">Status: {activeRide.status}</p>
                    </div>
                    <button
                      onClick={() => router.push(`/user/track-ride?rideId=${activeRide.id}`)}
                      className="btn bg-white text-accent hover:bg-gray-100"
                    >
                      Track Ride
                    </button>
                  </div>
                  <div className="space-y-2">
                    <p className="text-sm">From: {activeRide.pickupAddress}</p>
                    <p className="text-sm">To: {activeRide.dropoffAddress}</p>
                    <p className="text-sm">
                      Driver: {activeRide.driver?.firstName} {activeRide.driver?.lastName} -{' '}
                      {activeRide.driver?.carModel} ({activeRide.driver?.carPlateNumber})
                    </p>
                  </div>
                </div>
              )}

              <div className="card">
                <h2 className="text-2xl font-bold mb-4">Welcome, {user?.firstName}!</h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="p-4 bg-primary text-white rounded-lg">
                    <p className="text-sm">Wallet Balance</p>
                    <p className="text-2xl font-bold">{walletBalance.toFixed(2)} ر.س</p>
                  </div>
                  <div className="p-4 bg-accent text-white rounded-lg">
                    <p className="text-sm">Total Trips</p>
                    <p className="text-2xl font-bold">{tripHistory.length}</p>
                  </div>
                  <div className="p-4 bg-secondary text-white rounded-lg">
                    <p className="text-sm">Status</p>
                    <p className="text-lg font-bold">{activeRide ? 'In Ride' : 'Available'}</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'book' && (
            <div className="card">
              <h2 className="text-2xl font-bold mb-4">Book a Ride</h2>
              <BookRideForm nearbyDrivers={nearbyDrivers} />
            </div>
          )}

          {activeTab === 'profile' && (
            <div className="card">
              <h2 className="text-2xl font-bold mb-4">Profile</h2>
              <UserProfile user={user} onUpdate={loadUserData} />
            </div>
          )}

          {activeTab === 'wallet' && (
            <div className="card">
              <h2 className="text-2xl font-bold mb-4">Wallet</h2>
              <WalletSection balance={walletBalance} onUpdate={loadUserData} />
            </div>
          )}

          {activeTab === 'history' && (
            <div className="card">
              <h2 className="text-2xl font-bold mb-4">Trip History</h2>
              <TripHistory rides={tripHistory} />
            </div>
          )}
        </div>
      </div>
    </AuthGuard>
  )
}

// Book Ride Form Component
function BookRideForm({ nearbyDrivers }: { nearbyDrivers: any[] }) {
  const [formData, setFormData] = useState({
    driverId: '',
    pickupAddress: '',
    dropoffAddress: '',
    isPreBooked: false,
    scheduledTime: '',
    paymentMethod: 'cash',
  })
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      // Get coordinates from addresses (simplified - in production use geocoding)
      const response = await api.post('/rides/create', {
        ...formData,
        pickupLatitude: 0, // Replace with geocoding
        pickupLongitude: 0,
        dropoffLatitude: 0,
        dropoffLongitude: 0,
      })
      toast.success('Ride request created!')
      setFormData({
        driverId: '',
        pickupAddress: '',
        dropoffAddress: '',
        isPreBooked: false,
        scheduledTime: '',
        paymentMethod: 'cash',
      })
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to create ride')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium mb-2">Select Driver</label>
        <select
          value={formData.driverId}
          onChange={(e) => setFormData({ ...formData, driverId: e.target.value })}
          className="input"
          required
        >
          <option value="">Choose a driver</option>
          {nearbyDrivers.map((driver) => (
            <option key={driver.id} value={driver.id}>
              {driver.firstName} {driver.lastName} - {driver.carModel} ({driver.distance?.toFixed(2)} km away) ⭐ {driver.averageRating?.toFixed(1) || 'N/A'}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label className="block text-sm font-medium mb-2">Pickup Address</label>
        <input
          type="text"
          value={formData.pickupAddress}
          onChange={(e) => setFormData({ ...formData, pickupAddress: e.target.value })}
          className="input"
          required
        />
      </div>
      <div>
        <label className="block text-sm font-medium mb-2">Dropoff Address</label>
        <input
          type="text"
          value={formData.dropoffAddress}
          onChange={(e) => setFormData({ ...formData, dropoffAddress: e.target.value })}
          className="input"
          required
        />
      </div>
      <div>
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={formData.isPreBooked}
            onChange={(e) => setFormData({ ...formData, isPreBooked: e.target.checked })}
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
            onChange={(e) => setFormData({ ...formData, scheduledTime: e.target.value })}
            className="input"
            required={formData.isPreBooked}
          />
        </div>
      )}
      <div>
        <label className="block text-sm font-medium mb-2">Payment Method</label>
        <select
          value={formData.paymentMethod}
          onChange={(e) => setFormData({ ...formData, paymentMethod: e.target.value })}
          className="input"
        >
          <option value="cash">Cash</option>
          <option value="apple_pay">Apple Pay</option>
        </select>
      </div>
      <button type="submit" className="btn btn-primary w-full" disabled={loading}>
        {loading ? 'Creating...' : 'Book Ride'}
      </button>
    </form>
  )
}

// User Profile Component
function UserProfile({ user, onUpdate }: { user: any; onUpdate: () => void }) {
  const [formData, setFormData] = useState({
    firstName: user?.firstName || '',
    lastName: user?.lastName || '',
    phone: user?.phone || '',
  })
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      await api.put('/user/profile', formData)
      toast.success('Profile updated!')
      onUpdate()
    } catch (error) {
      toast.error('Failed to update profile')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium mb-2">Email</label>
        <input type="email" value={user?.email} className="input" disabled />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium mb-2">First Name</label>
          <input
            type="text"
            value={formData.firstName}
            onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
            className="input"
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-2">Last Name</label>
          <input
            type="text"
            value={formData.lastName}
            onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
            className="input"
            required
          />
        </div>
      </div>
      <div>
        <label className="block text-sm font-medium mb-2">Phone</label>
        <input
          type="tel"
          value={formData.phone}
          onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
          className="input"
          required
        />
      </div>
      <button type="submit" className="btn btn-primary" disabled={loading}>
        {loading ? 'Updating...' : 'Update Profile'}
      </button>
    </form>
  )
}

// Wallet Section Component
function WalletSection({ balance, onUpdate }: { balance: number; onUpdate: () => void }) {
  const [amount, setAmount] = useState('')
  const [loading, setLoading] = useState(false)

  const handleAddFunds = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      await api.post('/user/wallet', { amount: parseFloat(amount) })
      toast.success('Funds added!')
      setAmount('')
      onUpdate()
    } catch (error) {
      toast.error('Failed to add funds')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-4">
      <div className="p-6 bg-primary text-white rounded-lg">
        <p className="text-sm">Current Balance</p>
        <p className="text-3xl font-bold">{balance.toFixed(2)} ر.س</p>
      </div>
      <form onSubmit={handleAddFunds} className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-2">Add Funds (Apple Pay)</label>
          <input
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="input"
            placeholder="Enter amount"
            min="1"
            step="0.01"
            required
          />
        </div>
        <button type="submit" className="btn btn-primary" disabled={loading}>
          {loading ? 'Processing...' : 'Add Funds'}
        </button>
      </form>
    </div>
  )
}

// Trip History Component
function TripHistory({ rides }: { rides: any[] }) {
  if (rides.length === 0) {
    return <p className="text-secondary">No trip history yet.</p>
  }

  return (
    <div className="space-y-4">
      {rides.map((ride) => (
        <div key={ride.id} className="p-4 border rounded-lg">
          <div className="flex justify-between items-start">
            <div>
              <p className="font-medium">
                {ride.pickupAddress} → {ride.dropoffAddress}
              </p>
              <p className="text-sm text-secondary">
                Driver: {ride.driver?.firstName} {ride.driver?.lastName} ⭐ {ride.driver?.averageRating?.toFixed(1) || 'N/A'}
              </p>
              <p className="text-sm text-secondary">
                Cost: {ride.costPerPassenger.toFixed(2)} ر.س | Status: {ride.status}
              </p>
            </div>
            {ride.status === 'completed' && ride.ratings.length === 0 && (
              <RateRideButton rideId={ride.id} />
            )}
          </div>
        </div>
      ))}
    </div>
  )
}

// Rate Ride Button Component
function RateRideButton({ rideId }: { rideId: string }) {
  const [showModal, setShowModal] = useState(false)
  const [ratings, setRatings] = useState({ rideRating: 5, driverRating: 5, comment: '' })
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      await api.post('/rides/rate', { rideId, ...ratings })
      toast.success('Rating submitted!')
      setShowModal(false)
      window.location.reload()
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to submit rating')
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <button onClick={() => setShowModal(true)} className="btn btn-outline">
        Rate Ride
      </button>
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg max-w-md w-full">
            <h3 className="text-xl font-bold mb-4">Rate Your Ride</h3>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Ride Rating (1-5)</label>
                <input
                  type="number"
                  min="1"
                  max="5"
                  value={ratings.rideRating}
                  onChange={(e) => setRatings({ ...ratings, rideRating: parseInt(e.target.value) })}
                  className="input"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Driver Rating (1-5)</label>
                <input
                  type="number"
                  min="1"
                  max="5"
                  value={ratings.driverRating}
                  onChange={(e) => setRatings({ ...ratings, driverRating: parseInt(e.target.value) })}
                  className="input"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Comment (optional)</label>
                <textarea
                  value={ratings.comment}
                  onChange={(e) => setRatings({ ...ratings, comment: e.target.value })}
                  className="input"
                  rows={3}
                />
              </div>
              <div className="flex gap-2">
                <button type="submit" className="btn btn-primary flex-1" disabled={loading}>
                  {loading ? 'Submitting...' : 'Submit'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="btn btn-outline"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  )
}

