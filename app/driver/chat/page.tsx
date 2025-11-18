// Driver chat page - secure live chat with riders
'use client'

import { useState, useEffect, useRef } from 'react'
import { useSearchParams } from 'next/navigation'
import AuthGuard from '@/components/AuthGuard'
import api from '@/lib/api'
import toast from 'react-hot-toast'

export default function DriverChat() {
  const searchParams = useSearchParams()
  const rideId = searchParams.get('rideId')
  const [messages, setMessages] = useState<any[]>([])
  const [newMessage, setNewMessage] = useState('')
  const [loading, setLoading] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (rideId) {
      loadMessages()
      // Poll for new messages every 2 seconds
      const interval = setInterval(loadMessages, 2000)
      return () => clearInterval(interval)
    }
  }, [rideId])

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  const loadMessages = async () => {
    try {
      const response = await api.get(`/chat/messages?rideId=${rideId}`)
      setMessages(response.data.messages)
    } catch (error) {
      console.error('Failed to load messages')
    }
  }

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newMessage.trim()) return

    setLoading(true)
    try {
      await api.post('/chat/messages', {
        rideId,
        message: newMessage,
      })
      setNewMessage('')
      loadMessages()
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to send message')
    } finally {
      setLoading(false)
    }
  }

  if (!rideId) {
    return (
      <AuthGuard requiredRole="driver">
        <div className="min-h-screen bg-background flex items-center justify-center">
          <div className="text-secondary">No ride ID provided</div>
        </div>
      </AuthGuard>
    )
  }

  return (
    <AuthGuard requiredRole="driver">
      <div className="min-h-screen bg-background flex flex-col">
        <div className="bg-white shadow-sm p-4">
          <h2 className="text-xl font-bold text-primary">Chat with Riders</h2>
        </div>
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex ${msg.driverId ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-xs p-3 rounded-lg ${
                  msg.driverId
                    ? 'bg-primary text-white'
                    : 'bg-white border'
                }`}
              >
                <p className="text-sm font-medium mb-1">
                  {msg.driverId
                    ? `${msg.driver?.firstName} ${msg.driver?.lastName}`
                    : `${msg.user?.firstName} ${msg.user?.lastName}`}
                </p>
                <p>{msg.message}</p>
                <p className="text-xs mt-1 opacity-70">
                  {new Date(msg.createdAt).toLocaleTimeString()}
                </p>
              </div>
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>
        <form onSubmit={handleSend} className="bg-white border-t p-4">
          <div className="flex gap-2">
            <input
              type="text"
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              className="input flex-1"
              placeholder="Type a message..."
              disabled={loading}
            />
            <button
              type="submit"
              className="btn btn-primary"
              disabled={loading || !newMessage.trim()}
            >
              Send
            </button>
          </div>
        </form>
      </div>
    </AuthGuard>
  )
}

