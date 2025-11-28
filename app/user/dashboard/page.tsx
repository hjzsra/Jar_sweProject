'use client'

import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import AuthGuard from '../../components/AuthGuard';
import Profile from '../../components/Profile';
import Wallet from '../../components/Wallet';
import History from '../../components/History';
import TrackRide from '../../components/TrackRide';
import BookRide from '../../components/BookRide';
import api from '../../lib/api';

export default function UserDashboard() {
  const [activeTab, setActiveTab] = useState<'profile' | 'wallet' | 'history' | 'book'>('book');
  const [user, setUser] = useState<any>(null);
  const [location, setLocation] = useState<any>(null);
  const [activeRide, setActiveRide] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      try {
        const userData = JSON.parse(localStorage.getItem('user') || '{}');
        setUser(userData);

        navigator.geolocation.getCurrentPosition(
          (position) => {
            setLocation({
              lat: position.coords.latitude,
              lng: position.coords.longitude,
            });
          },
          () => {
            toast.error('Please enable location services.');
          }
        );
      } catch (error) {
        toast.error('Failed to load user data.');
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

  useEffect(() => {
    const fetchActiveRide = async () => {
      try {
        const response = await api.get('/rides/user');
        setActiveRide(response.data);
      } catch (error) {
        // It's okay if this fails, it just means no active ride
        setActiveRide(null);
        console.error("Could not fetch active ride", error);
      }
    };

    fetchActiveRide(); // Fetch immediately
    const interval = setInterval(fetchActiveRide, 10000); // And then every 10 seconds

    return () => clearInterval(interval); // Cleanup on unmount
  }, []);


  const handleRideBooked = (rideDetails: any) => {
    setActiveRide(rideDetails);
    setActiveTab('book');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-secondary">Loading...</div>
      </div>
    );
  }

  return (
    <AuthGuard requiredRole="user">
      <div className="min-h-screen bg-background">
        <div className="max-w-4xl mx-auto p-4">
          <div className="flex gap-4 mb-6 border-b">
            <button onClick={() => setActiveTab('book')} className={`pb-2 ${activeTab === 'book' ? 'border-b-2 border-primary' : ''}`}>Book a Ride</button>
            <button onClick={() => setActiveTab('profile')} className={`pb-2 ${activeTab === 'profile' ? 'border-b-2 border-primary' : ''}`}>Profile</button>
            <button onClick={() => setActiveTab('wallet')} className={`pb-2 ${activeTab === 'wallet' ? 'border-b-2 border-primary' : ''}`}>Wallet</button>
            <button onClick={() => setActiveTab('history')} className={`pb-2 ${activeTab === 'history' ? 'border-b-2 border-primary' : ''}`}>History</button>
          </div>

          <div>
            {activeTab === 'profile' && <Profile user={user} onUpdate={setUser} />}
            {activeTab === 'wallet' && <Wallet />}
            {activeTab === 'history' && <History />}
            {activeTab === 'book' && (
              activeRide ? (
                <TrackRide ride={activeRide} />
              ) : (
                <BookRide userLocation={location} onRideBooked={handleRideBooked} />
              )
            )}
          </div>
        </div>
      </div>
    </AuthGuard>
  );
}