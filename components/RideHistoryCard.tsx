'use client'

import { useState } from 'react';
import toast from 'react-hot-toast';
import api from '../lib/api';

const RideHistoryCard = ({ ride, onUpdate }: { ride: any; onUpdate: () => void }) => {
    const [loading, setLoading] = useState(false);
    const [rating, setRating] = useState(0);
    const [comment, setComment] = useState("");

    const handlePayment = async (paymentMethod: string) => {
        setLoading(true);
        try {
        await api.post('/rides/pay', { rideId: ride.id, paymentMethod });
        toast.success('Payment successful!');
        onUpdate();
        } catch (error: any) {
        toast.error(error.response?.data?.error || 'Payment failed');
        } finally {
        setLoading(false);
        }
    };

    const handleRating = async () => {
        if (rating === 0) {
        toast.error("Please select a rating.");
        return;
        }
        setLoading(true);
        try {
        await api.post('/rides/rate', { rideId: ride.id, rating, comment });
        toast.success('Thanks for your feedback!');
        onUpdate();
        } catch (error: any) {
        toast.error(error.response?.data?.error || 'Failed to submit rating');
        } finally {
        setLoading(false);
        }
    };

    return (
        <div className="p-4 border rounded-lg">
        <p>Ride on {new Date(ride.createdAt).toLocaleDateString()}</p>
        <p>From: {ride.pickupAddress}</p>
        <p>To: {ride.dropoffAddress}</p>
        <p>Cost: ${ride.cost.toFixed(2)}</p>
        <p>Status: {ride.status}</p>

        {ride.status === 'COMPLETED' && (
            <div className="mt-4">
            <h4 className="font-bold">Complete Payment</h4>
            <div className="flex gap-2 mt-2">
                <button onClick={() => handlePayment('wallet')} className="btn btn-primary" disabled={loading}>Pay with Wallet</button>
                <button onClick={() => handlePayment('cash')} className="btn btn-secondary" disabled={loading}>Pay with Cash</button>
                <button onClick={() => handlePayment('applepay')} className="btn btn-accent" disabled={loading}>Pay with Apple Pay</button>
            </div>
            </div>
        )}

        {ride.status === 'COMPLETED' && !ride.rating && (
            <div className="mt-4">
            <h4 className="font-bold">Rate Driver</h4>
            <div className="flex items-center gap-2 mt-2">
                {[1, 2, 3, 4, 5].map(star => (
                <button key={star} onClick={() => setRating(star)} className={`text-2xl ${rating >= star ? 'text-yellow-400' : 'text-gray-300'}`}>★</button>
                ))}
            </div>
            <textarea
                className="textarea w-full mt-2"
                placeholder="Add a comment..."
                value={comment}
                onChange={(e) => setComment(e.target.value)}
            />
            <button onClick={handleRating} className="btn btn-primary mt-2" disabled={loading}>Submit Rating</button>
            </div>
        )}
        {ride.rating && (
            <div className="mt-4">
                <p>You rated this ride: {ride.rating.rating}/5</p>
            </div>
        )}
        </div>
    );
}

export default RideHistoryCard;