'use client'

import { useState, useEffect } from 'react'
import api from '@/lib/api'
import toast from 'react-hot-toast'

export default function Wallet() {
  const [balance, setBalance] = useState(0)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchBalance()
  }, [])

  const fetchBalance = async () => {
    try {
      setLoading(true)
      const response = await api.get('/user/wallet')
      setBalance(response.data.balance)
    } catch (error) {
      toast.error('Failed to fetch wallet balance.')
    } finally {
      setLoading(false)
    }
  }

  const handleAddFunds = async () => {
    // Placeholder for adding funds, e.g., via Apple Pay or other payment gateways
    toast.success('Add funds functionality to be implemented.')
  }

  return (
    <div className="p-4">
      <h3 className="text-lg font-semibold mb-4">My Wallet</h3>
      {loading ? (
        <p>Loading balance...</p>
      ) : (
        <div className="bg-gray-100 p-6 rounded-lg shadow-md">
          <p className="text-gray-600 text-sm">Current Balance</p>
          <p className="text-3xl font-bold">
            {balance.toFixed(2)} <span className="text-xl">SAR</span>
          </p>
        </div>
      )}
      <div className="mt-6">
        <button onClick={handleAddFunds} className="btn btn-primary w-full">
          Add Funds
        </button>
      </div>
    </div>
  )
}