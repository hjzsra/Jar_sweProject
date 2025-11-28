'use client'

import { useState, useEffect } from 'react'
import api from '@/lib/api'
import toast from 'react-hot-toast'

export default function Wallet() {
  const [balance, setBalance] = useState(0)
  const [loading, setLoading] = useState(true)
  const [amount, setAmount] = useState('')
  const [paymentMethod, setPaymentMethod] = useState('card')
  const [isAddingFunds, setIsAddingFunds] = useState(false)

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

  const handleAddFunds = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!amount || Number(amount) <= 0) {
      toast.error('Please enter a valid amount.')
      return
    }

    setIsAddingFunds(true)
    try {
      await api.post('/user/wallet', {
        amount: Number(amount),
        paymentMethod,
      })
      toast.success('Funds added successfully!')
      setAmount('')
      fetchBalance() // Refresh balance after adding funds
    } catch (error) {
      toast.error('Failed to add funds.')
    } finally {
      setIsAddingFunds(false)
    }
  }

  return (
    <div className="p-4">
      <h3 className="text-lg font-semibold mb-4">My Wallet</h3>
      {loading ? (
        <p>Loading balance...</p>
      ) : (
        <div className="bg-gray-100 p-6 rounded-lg shadow-md mb-6">
          <p className="text-gray-600 text-sm">Current Balance</p>
          <p className="text-3xl font-bold">
            {balance.toFixed(2)} <span className="text-xl">SAR</span>
          </p>
        </div>
      )}

      <form onSubmit={handleAddFunds} className="space-y-4">
        <div>
          <label
            htmlFor="amount"
            className="block text-sm font-medium text-gray-700"
          >
            Amount (SAR)
          </label>
          <input
            type="number"
            id="amount"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="input input-bordered w-full mt-1"
            placeholder="e.g., 50"
            min="1"
          />
        </div>
        <div>
          <label
            htmlFor="paymentMethod"
            className="block text-sm font-medium text-gray-700"
          >
            Payment Method
          </label>
          <select
            id="paymentMethod"
            value={paymentMethod}
            onChange={(e) => setPaymentMethod(e.target.value)}
            className="select select-bordered w-full mt-1"
          >
            <option value="card">Card</option>
            <option value="mobilePay">Mobile Pay</option>
          </select>
        </div>
        <button
          type="submit"
          className="btn btn-primary w-full"
          disabled={isAddingFunds}
        >
          {isAddingFunds ? 'Adding...' : 'Add Funds'}
        </button>
      </form>
    </div>
  )
}