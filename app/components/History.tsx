'use client'

import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import api from '../../lib/api';
import RideHistoryCard from './RideHistoryCard';

const History = () => {
    const [rides, setRides] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    const loadHistory = async () => {
        setLoading(true);
        try {
        const response = await api.get('/api/user/trip-history');
        setRides(response.data.rides);
        } catch (error) {
        toast.error('Failed to load ride history');
        } finally {
        setLoading(false);
        }
    };

    useEffect(() => {
        loadHistory();
    }, []);

    if (loading) return <p>Loading history...</p>;

    return (
        <div className="space-y-4">
        <h2 className="text-2xl font-bold mb-4">Ride History</h2>
        {rides.length === 0 ? (
            <p>No past rides.</p>
        ) : (
            rides.map(ride => <RideHistoryCard key={ride.id} ride={ride} onUpdate={loadHistory} />)
        )}
        </div>
    );
}

export default History;