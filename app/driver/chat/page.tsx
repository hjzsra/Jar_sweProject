'use client'

// Driver chat page - secure live chat with riders
export const dynamic = 'force-dynamic';

import { useState, useEffect, useRef, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import AuthGuard from '@/components/AuthGuard'
import api from '@/lib/api'
import toast from 'react-hot-toast'

function DriverChatContent() {
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
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 max-h-[80vh] flex flex-col">
          <div className="bg-primary text-white p-4 rounded-t-lg">
            <h2 className="text-lg font-bold">Chat with Riders</h2>
            <button
              onClick={() => window.history.back()}
              className="absolute top-4 right-4 text-white hover:text-gray-200"
            >
              ✕
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-3 max-h-96">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex ${msg.driverId ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[200px] p-2 rounded-lg text-sm ${
                    msg.driverId
                      ? 'bg-primary text-white'
                      : 'bg-gray-100 border'
                  }`}
                >
                  <p className="font-medium text-xs mb-1">
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

          <form onSubmit={handleSend} className="border-t p-3">
            <div className="flex gap-2">
              <input
                type="text"
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                className="input flex-1 text-sm py-2"
                placeholder="Type a message..."
                disabled={loading}
              />
              <button
                type="submit"
                className="btn btn-primary text-sm px-3 py-2"
                disabled={loading || !newMessage.trim()}
              >
                Send
              </button>
            </div>
          </form>
        </div>
      </div>
    </AuthGuard>
  )
}


export default function DriverChat() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <DriverChatContent />
    </Suspense>
  )
}
