// User dashboard page
'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import AuthGuard from '@/components/AuthGuard'
import api from '@/lib/api'
import 'leaflet/dist/leaflet.css'
import axios from 'axios'
import { Toaster, toast } from 'react-hot-toast'
import dynamic from 'next/dynamic'
import { LatLngExpression } from 'leaflet'


const MapComponent = dynamic(() => import('@/components/Map'), { 
  ssr: false ,
  loading: () => <p>Loading map...</p>
});


const BookRideForm = ({ onModeSelect, onLocationSelect, selecting, pickupLocation, dropoffLocation }: any) => (
  <div className="space-y-4">
    <h3 className="text-lg font-semibold">Book a Ride</h3>
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <button
        onClick={() => onModeSelect('pickup')}
        className={`w-full p-2 rounded text-white ${selecting === 'pickup' ? 'bg-blue-700' : 'bg-blue-500 hover:bg-blue-600'}`}
      >
        {pickupLocation ? `Pickup: ${pickupLocation.lat.toFixed(4)}, ${pickupLocation.lng.toFixed(4)}` : 'Select Pickup Location'}
      </button>
      <button
        onClick={() => onModeSelect('dropoff')}
        className={`w-full p-2 rounded text-white ${selecting === 'dropoff' ? 'bg-green-700' : 'bg-green-500 hover:bg-green-600'}`}
      >
        {dropoffLocation ? `Drop-off: ${dropoffLocation.lat.toFixed(4)}, ${dropoffLocation.lng.toFixed(4)}` : 'Select Drop-off Location'}
      </button>
    </div>

    {selecting && (
      <div className="mt-4">
        <p className="text-center font-semibold mb-2">
          Click on the map to select the {selecting} location.
        </p>
        <MapComponent
          position={[24.7136, 46.6753]} // Default to Riyadh, Saudi Arabia
          zoom={13}
          onLocationSelect={onLocationSelect}
          markerPosition={selecting === 'pickup' ? pickupLocation : dropoffLocation}
        />
      </div>
    )}

    <button
      onClick={() => console.log('Finding ride...')}
      disabled={!pickupLocation || !dropoffLocation}
      className="w-full bg-indigo-600 text-white py-2 px-4 rounded-md hover:bg-indigo-700 disabled:bg-gray-400"
    >
      Find a Ride
    </button>
  </div>
)


const UserDashboard = () => {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState('home')
  const [pickupLocation, setPickupLocation] = useState<{ lat: number; lng: number } | null>(null)
  const [dropoffLocation, setDropoffLocation] = useState<{ lat: number; lng: number } | null>(null)
  const [selecting, setSelecting] = useState<'pickup' | 'dropoff' | null>(null)
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const response = await api.get('/user/profile');
        setUser(response.data);
      } catch (error) {
        toast.error('Failed to fetch user data');
      }
    };
    fetchUser();
  }, []);

  const handleLocationSelect = (location: { lat: number; lng: number }) => {
    if (selecting === 'pickup') {
      setPickupLocation(location)
      toast.success('Pickup location selected')
    } else if (selecting === 'dropoff') {
      setDropoffLocation(location)
      toast.success('Drop-off location selected')
    }
    setSelecting(null)
  }

  const renderContent = () => {
    switch (activeTab) {
      case 'home':
        return <div>Welcome to your dashboard!, {user?.firstName}!</div>
      case 'profile':
        return <div>Profile Management</div>
      case 'wallet':
        return <div>Wallet</div>
      case 'history':
        return <div>Trip History</div>
      case 'book':
        return <BookRideForm onModeSelect={setSelecting} onLocationSelect={handleLocationSelect} selecting={selecting} pickupLocation={pickupLocation} dropoffLocation={dropoffLocation} />
      default:
        return <div>Welcome to your dashboard!</div>
    }
  }

  return (
    <AuthGuard requiredRole="user">
      <Toaster />
      <div className="min-h-screen bg-gray-100">
        <header className="bg-white shadow">
          <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8 flex justify-between items-center">
            <h1 className="text-3xl font-bold text-gray-900">User Dashboard</h1>
            <button
              onClick={() => {
                localStorage.removeItem('token')
                router.push('/user/login')
              }}
              className="bg-red-500 text-white py-2 px-4 rounded-md hover:bg-red-600"
            >
              Logout
            </button>
          </div>
        </header>
        <main>
          <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
            <div className="bg-white shadow rounded-lg">
              <div className="px-4 py-5 sm:p-6">
                <div className="border-b border-gray-200">
                  <nav className="-mb-px flex space-x-8" aria-label="Tabs">
                    <button onClick={() => setActiveTab('home')} className={`${activeTab === 'home' ? 'border-indigo-500 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'} whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}>Home</button>
                    <button onClick={() => setActiveTab('profile')} className={`${activeTab === 'profile' ? 'border-indigo-500 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'} whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}>Profile</button>
                    <button onClick={() => setActiveTab('wallet')} className={`${activeTab === 'wallet' ? 'border-indigo-500 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'} whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}>Wallet</button>
                    <button onClick={() => setActiveTab('history')} className={`${activeTab === 'history' ? 'border-indigo-500 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'} whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}>History</button>
                    <button onClick={() => setActiveTab('book')} className={`${activeTab === 'book' ? 'border-indigo-500 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'} whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}>Book a Ride</button>
                  </nav>
                </div>
                <div className="mt-6">
                  {renderContent()}
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
    </AuthGuard>
  )
}

export default UserDashboard