// Support contact page
'use client'

import { useState, useEffect } from 'react'
import api from '@/lib/api'
import toast from 'react-hot-toast'

export default function SupportPage() {
  const [activeTab, setActiveTab] = useState('contact')
  const [formData, setFormData] = useState({
    email: '',
    subject: '',
    message: '',
  })
  const [loading, setLoading] = useState(false)
  const [tickets, setTickets] = useState<any[]>([])
  const [ticketsLoading, setTicketsLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      await api.post('/support/contact', formData)
      toast.success('Support ticket created! We will get back to you soon.')
      setFormData({ email: '', subject: '', message: '' })
      loadTickets() // Refresh tickets
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to create support ticket')
    } finally {
      setLoading(false)
    }
  }

  const loadTickets = async () => {
    setTicketsLoading(true)
    try {
      const response = await api.get('/support/tickets')
      setTickets(response.data.tickets)
    } catch (error) {
      // If not authenticated, just don't show tickets
      setTickets([])
    } finally {
      setTicketsLoading(false)
    }
  }

  useEffect(() => {
    loadTickets()
  }, [])

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-4xl mx-auto">
        <h2 className="text-2xl font-bold text-primary mb-6 text-center">Support Center</h2>

        {/* Tabs */}
        <div className="flex mb-6">
          <button
            onClick={() => setActiveTab('contact')}
            className={`px-4 py-2 rounded-l ${activeTab === 'contact' ? 'bg-primary text-white' : 'bg-gray-200'}`}
          >
            Contact Support
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`px-4 py-2 rounded-r ${activeTab === 'history' ? 'bg-primary text-white' : 'bg-gray-200'}`}
          >
            My Tickets
          </button>
        </div>

        {activeTab === 'contact' && (
          <div className="card">
            <h3 className="text-xl font-bold mb-4">Contact Support</h3>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Email</label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="input"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Subject</label>
                <input
                  type="text"
                  value={formData.subject}
                  onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                  className="input"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Message</label>
                <textarea
                  value={formData.message}
                  onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                  className="input"
                  rows={6}
                  required
                />
              </div>
              <button type="submit" className="btn btn-primary w-full" disabled={loading}>
                {loading ? 'Sending...' : 'Send Message'}
              </button>
            </form>
          </div>
        )}

        {activeTab === 'history' && (
          <div className="card">
            <h3 className="text-xl font-bold mb-4">My Support Tickets</h3>
            {ticketsLoading ? (
              <p className="text-secondary">Loading tickets...</p>
            ) : tickets.length === 0 ? (
              <p className="text-secondary">No support tickets found. Create one using the Contact Support tab.</p>
            ) : (
              <div className="space-y-4">
                {tickets.map((ticket) => (
                  <div key={ticket.id} className="border rounded p-4">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <h4 className="font-bold">{ticket.subject}</h4>
                        <p className="text-sm text-secondary">
                          Status: {ticket.status} | Created: {new Date(ticket.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <div className="mb-2">
                      <p className="text-sm font-medium">Your message:</p>
                      <p className="text-sm bg-gray-50 p-2 rounded">{ticket.message}</p>
                    </div>
                    {ticket.messages.length > 1 && (
                      <div>
                        <p className="text-sm font-medium mb-2">Replies:</p>
                        {ticket.messages.slice(1).map((msg: any) => (
                          <div key={msg.id} className="ml-4 mb-2 p-3 bg-blue-50 rounded">
                            <p className="text-sm font-medium">
                              {msg.sender ? `${msg.sender.firstName} ${msg.sender.lastName}` : 'Support Team'}
                            </p>
                            <p className="text-sm">{msg.message}</p>
                            <p className="text-xs text-secondary">
                              {new Date(msg.createdAt).toLocaleString()}
                            </p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

