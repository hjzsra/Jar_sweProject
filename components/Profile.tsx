'use client'

import { useState } from 'react';
import api from '../lib/api';
import toast from 'react-hot-toast';

const Profile = ({ user, onUpdate }: { user: any, onUpdate: (user: any) => void }) => {
  const [formData, setFormData] = useState({
    firstName: user?.firstName || '',
    lastName: user?.lastName || '',
    phone: user?.phone || '',
  });
  const [loading, setLoading] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const response = await api.put('/user/profile', formData);
      onUpdate(response.data.user);
      localStorage.setItem('user', JSON.stringify(response.data.user));
      toast.success('Profile updated successfully!');
    } catch (error) {
      toast.error('Failed to update profile.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="card">
      <h2 className="text-2xl font-bold mb-4">Profile</h2>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="label">First Name</label>
          <input
            type="text"
            name="firstName"
            className="input"
            value={formData.firstName}
            onChange={handleChange}
          />
        </div>
        <div>
          <label className="label">Last Name</label>
          <input
            type="text"
            name="lastName"
            className="input"
            value={formData.lastName}
            onChange={handleChange}
          />
        </div>
        <div>
          <label className="label">Phone</label>
          <input
            type="text"
            name="phone"
            className="input"
            value={formData.phone}
            onChange={handleChange}
          />
        </div>
        <button type="submit" className="btn btn-primary w-full" disabled={loading}>
          {loading ? 'Saving...' : 'Save Changes'}
        </button>
      </form>
    </div>
  );
};

export default Profile;