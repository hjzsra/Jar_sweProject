'use client'

import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import api from '../../lib/api';

const BookRide = ({ userLocation, onRideBooked }: { userLocation: any, onRideBooked: (data: any) => void }) => {
    const [pickup, setPickup] = useState<any>(null);
    const [dropoff, setDropoff] = useState<any>(null);
    const [genderPreference, setGenderPreference] = useState('NONE');
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (userLocation) {
            setPickup(userLocation);
        }
    }, [userLocation]);

    const handleBookRide = async () => {
        if (!pickup || !dropoff) {
            toast.error('Please select pickup and dropoff locations.');
            return;
        }
        setLoading(true);
        try {
            const response = await api.post('/rides/create', {
                pickup,
                dropoff,
                genderPreference,
            });
            toast.success('Ride requested! Searching for drivers.');
            onRideBooked(response.data);
        } catch (error) {
            toast.error('Failed to book ride.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="card">
            <h2 className="text-2xl font-bold mb-4">Book a Ride</h2>
            <div className="space-y-4">
                <div>
                    <label className="label">Pickup Location</label>
                    {/* In a real app, this would be a map input */}
                    <input
                        type="text"
                        className="input"
                        value={pickup ? `${pickup.lat}, ${pickup.lng}` : 'Click map to set pickup'}
                        readOnly
                    />
                </div>
                <div>
                    <label className="label">Dropoff Location</label>
                    <input
                        type="text"
                        className="input"
                        placeholder="Click map to set dropoff"
                        onFocus={(e) => { /* A map interaction would happen here */ setDropoff({ lat: 21.4858, lng: 39.1925 }); }}
                        value={dropoff ? `${dropoff.lat}, ${dropoff.lng}` : ''}
                        readOnly
                    />
                </div>
                <div>
                    <label className="label">Driver Gender Preference</label>
                    <select className="select" value={genderPreference} onChange={(e) => setGenderPreference(e.target.value)}>
                        <option value="NONE">No Preference</option>
                        <option value="MALE">Male</option>
                        <option value="FEMALE">Female</option>
                    </select>
                </div>
                <button onClick={handleBookRide} className="btn btn-primary w-full" disabled={loading}>
                    {loading ? 'Searching...' : 'Find a Ride'}
                </button>
            </div>
        </div>
    );
}

export default BookRide;