// Admin dashboard page
'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import AuthGuard from '@/components/AuthGuard'
import api from '@/lib/api'
import toast from 'react-hot-toast'

export default function AdminDashboard() {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState<'overview' | 'documents' | 'live-rides' | 'safety' | 'sos' | 'analytics'>('overview')
  const [stats, setStats] = useState<any>(null)
  const [recentRides, setRecentRides] = useState<any[]>([])
  const [filteredRides, setFilteredRides] = useState<any[]>([])
  const [supportTickets, setSupportTickets] = useState<any[]>([])
  const [documents, setDocuments] = useState<any[]>([])
  const [liveRides, setLiveRides] = useState<any[]>([])
  const [safetyReports, setSafetyReports] = useState<any[]>([])
  const [sosLogs, setSosLogs] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [ridesLoading, setRidesLoading] = useState(false)
  const [ticketsLoading, setTicketsLoading] = useState(false)
  const [documentsLoading, setDocumentsLoading] = useState(false)
  const [liveRidesLoading, setLiveRidesLoading] = useState(false)
  const [safetyLoading, setSafetyLoading] = useState(false)
  const [sosLoading, setSosLoading] = useState(false)

  // Filters
  const [rideStartDate, setRideStartDate] = useState('')
  const [rideEndDate, setRideEndDate] = useState('')
  const [ticketStatus, setTicketStatus] = useState('open')

  // Reply modal
  const [replyModal, setReplyModal] = useState(false)
  const [selectedTicket, setSelectedTicket] = useState<any>(null)
  const [replyMessage, setReplyMessage] = useState('')
  const [replyStatus, setReplyStatus] = useState('')

  useEffect(() => {
    loadDashboardData()
  }, [])

  const loadDashboardData = async () => {
    try {
      const response = await api.get('/admin/dashboard')
      setStats(response.data.stats)
      setRecentRides(response.data.recentRides)
    } catch (error) {
      toast.error('Failed to load dashboard data')
    } finally {
      setLoading(false)
    }
  }

  const loadFilteredRides = async () => {
    setRidesLoading(true)
    try {
      const params = new URLSearchParams()
      if (rideStartDate) params.append('startDate', rideStartDate)
      if (rideEndDate) params.append('endDate', rideEndDate)
      const response = await api.get(`/admin/rides?${params}`)
      setFilteredRides(response.data.rides)
    } catch (error) {
      toast.error('Failed to load rides')
    } finally {
      setRidesLoading(false)
    }
  }

  const loadSupportTickets = async () => {
    setTicketsLoading(true)
    try {
      const response = await api.get(`/admin/support?status=${ticketStatus}`)
      setSupportTickets(response.data.tickets)
    } catch (error) {
      toast.error('Failed to load support tickets')
    } finally {
      setTicketsLoading(false)
    }
  }

  const loadDocuments = async () => {
    setDocumentsLoading(true)
    try {
      const response = await api.get('/admin/documents')
      setDocuments(response.data.documents)
    } catch (error) {
      toast.error('Failed to load documents')
    } finally {
      setDocumentsLoading(false)
    }
  }

  const loadLiveRides = async () => {
    setLiveRidesLoading(true)
    try {
      const response = await api.get('/admin/rides/live')
      setLiveRides(response.data.rides)
    } catch (error) {
      toast.error('Failed to load live rides')
    } finally {
      setLiveRidesLoading(false)
    }
  }

  const loadSafetyReports = async () => {
    setSafetyLoading(true)
    try {
      const response = await api.get('/admin/safety-reports')
      setSafetyReports(response.data.reports)
    } catch (error) {
      toast.error('Failed to load safety reports')
    } finally {
      setSafetyLoading(false)
    }
  }

  const loadSOSLogs = async () => {
    setSosLoading(true)
    try {
      const response = await api.get('/admin/sos')
      setSosLogs(response.data.sosLogs)
    } catch (error) {
      toast.error('Failed to load SOS logs')
    } finally {
      setSosLoading(false)
    }
  }

  const handleReply = async () => {
    if (!replyMessage.trim()) {
      toast.error('Reply message is required')
      return
    }

    try {
      await api.post(`/admin/support/${selectedTicket.id}/reply`, {
        message: replyMessage,
        status: replyStatus || undefined,
      })
      toast.success('Reply sent successfully')
      setReplyModal(false)
      setReplyMessage('')
      setReplyStatus('')
      setSelectedTicket(null)
      loadSupportTickets() // Refresh tickets
    } catch (error) {
      toast.error('Failed to send reply')
    }
  }

  const handleDocumentReview = async (documentId: string, action: 'approve' | 'reject', rejectionReason?: string) => {
    try {
      await api.post('/admin/documents', {
        documentId,
        action,
        rejectionReason
      })
      toast.success(`Document ${action}d successfully`)
      loadDocuments()
    } catch (error) {
      toast.error('Failed to review document')
    }
  }

  const handleRideManagement = async (rideId: string, action: 'complete' | 'cancel', reason: string) => {
    try {
      await api.post('/admin/rides/manage', {
        rideId,
        action,
        reason
      })
      toast.success(`Ride ${action}d successfully`)
      loadLiveRides()
      loadDashboardData() // Refresh stats
    } catch (error) {
      toast.error('Failed to manage ride')
    }
  }

  const handleSafetyReportAction = async (reportId: string, action: 'resolve' | 'dismiss' | 'warning' | 'ban', adminNotes?: string) => {
    try {
      await api.post('/admin/safety-reports', {
        reportId,
        action,
        adminNotes
      })
      toast.success(`Report ${action} action completed`)
      loadSafetyReports()
    } catch (error) {
      toast.error('Failed to manage safety report')
    }
  }

  const handleSOSAction = async (sosId: string, action: 'resolve' | 'false_alarm') => {
    try {
      await api.post('/admin/sos', {
        sosId,
        action
      })
      toast.success(`SOS marked as ${action === 'resolve' ? 'resolved' : 'false alarm'}`)
      loadSOSLogs()
    } catch (error) {
      toast.error('Failed to manage SOS')
    }
  }

  useEffect(() => {
    loadFilteredRides()
  }, [rideStartDate, rideEndDate])

  useEffect(() => {
    loadSupportTickets()
  }, [ticketStatus])

  useEffect(() => {
    if (activeTab === 'documents') {
      loadDocuments()
    } else if (activeTab === 'live-rides') {
      loadLiveRides()
    } else if (activeTab === 'safety') {
      loadSafetyReports()
    } else if (activeTab === 'sos') {
      loadSOSLogs()
    }
  }, [activeTab])

  const handleLogout = () => {
    localStorage.removeItem('token')
    localStorage.removeItem('role')
    localStorage.removeItem('admin')
    router.push('/')
  }

  if (loading) {
    return (
      <AuthGuard requiredRole="admin">
        <div className="min-h-screen bg-background flex items-center justify-center">
          <div className="text-secondary">Loading...</div>
        </div>
      </AuthGuard>
    )
  }

  return (
    <AuthGuard requiredRole="admin">
      <div className="min-h-screen bg-background">
        <nav className="bg-white shadow-sm p-4">
          <div className="max-w-7xl mx-auto flex justify-between items-center">
            <h1 className="text-xl font-bold text-primary">Admin Dashboard</h1>
            <button onClick={handleLogout} className="btn btn-outline">
              Logout
            </button>
          </div>
        </nav>

        <div className="max-w-7xl mx-auto p-4">
          {/* Tab Navigation */}
          <div className="flex flex-wrap gap-2 mb-6 border-b pb-4">
            <button
              onClick={() => setActiveTab('overview')}
              className={`btn ${activeTab === 'overview' ? 'btn-primary' : 'btn-outline'}`}
            >
              Overview
            </button>
            <button
              onClick={() => setActiveTab('documents')}
              className={`btn ${activeTab === 'documents' ? 'btn-primary' : 'btn-outline'}`}
            >
              Documents ({documents.filter(d => d.status === 'pending').length})
            </button>
            <button
              onClick={() => setActiveTab('live-rides')}
              className={`btn ${activeTab === 'live-rides' ? 'btn-primary' : 'btn-outline'}`}
            >
              Live Rides ({liveRides.length})
            </button>
            <button
              onClick={() => setActiveTab('safety')}
              className={`btn ${activeTab === 'safety' ? 'btn-primary' : 'btn-outline'}`}
            >
              Safety Reports ({safetyReports.filter(r => r.status === 'pending').length})
            </button>
            <button
              onClick={() => setActiveTab('sos')}
              className={`btn ${activeTab === 'sos' ? 'btn-primary' : 'btn-outline'}`}
            >
              SOS Alerts ({sosLogs.filter(s => s.status === 'active').length})
            </button>
            <button
              onClick={() => setActiveTab('analytics')}
              className={`btn ${activeTab === 'analytics' ? 'btn-primary' : 'btn-outline'}`}
            >
              Analytics
            </button>
          </div>

          {activeTab === 'overview' && (
            <>
              <h2 className="text-2xl font-bold mb-6">Overview</h2>

          {stats && (
            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-6">
              <div className="card">
                <p className="text-sm text-secondary">Total Users</p>
                <p className="text-2xl font-bold text-primary">{stats.totalUsers}</p>
              </div>
              <div className="card">
                <p className="text-sm text-secondary">Total Drivers</p>
                <p className="text-2xl font-bold text-primary">{stats.totalDrivers}</p>
              </div>
              <div className="card">
                <p className="text-sm text-secondary">Total Rides</p>
                <p className="text-2xl font-bold text-primary">{stats.totalRides}</p>
              </div>
              <div className="card">
                <p className="text-sm text-secondary">Active Rides</p>
                <p className="text-2xl font-bold text-accent">{stats.activeRides}</p>
              </div>
              <div className="card">
                <p className="text-sm text-secondary">Total Revenue</p>
                <p className="text-2xl font-bold text-accent">${stats.totalRevenue.toFixed(2)}</p>
              </div>
              <div className="card">
                <p className="text-sm text-secondary">Open Tickets</p>
                <p className="text-2xl font-bold text-secondary">{stats.openSupportTickets}</p>
              </div>
            </div>
          )}

          <div className="card">
            <h3 className="text-xl font-bold mb-4">Recent Rides</h3>
            {recentRides.length === 0 ? (
              <p className="text-secondary">No recent rides</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left p-2">ID</th>
                      <th className="text-left p-2">Driver</th>
                      <th className="text-left p-2">Passenger</th>
                      <th className="text-left p-2">Route</th>
                      <th className="text-left p-2">Cost</th>
                      <th className="text-left p-2">Status</th>
                      <th className="text-left p-2">Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentRides.map((ride) => (
                      <tr key={ride.id} className="border-b">
                        <td className="p-2 text-sm">{ride.id.substring(0, 8)}...</td>
                        <td className="p-2">
                          {ride.driver?.firstName} {ride.driver?.lastName}
                        </td>
                        <td className="p-2">
                          {ride.passengers[0]?.firstName} {ride.passengers[0]?.lastName}
                        </td>
                        <td className="p-2 text-sm">
                          {ride.pickupAddress.substring(0, 20)}... → {ride.dropoffAddress.substring(0, 20)}...
                        </td>
                        <td className="p-2">{ride.cost.toFixed(2)} ر.س</td>
                        <td className="p-2">
                          <span className={`px-2 py-1 rounded text-xs ${
                            ride.status === 'completed' ? 'bg-green-100 text-green-800' :
                            ride.status === 'in_progress' ? 'bg-blue-100 text-blue-800' :
                            'bg-gray-100 text-gray-800'
                          }`}>
                            {ride.status}
                          </span>
                        </td>
                        <td className="p-2 text-sm">
                          {new Date(ride.createdAt).toLocaleDateString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <div className="card">
            <h3 className="text-xl font-bold mb-4">All Rides</h3>
            <div className="mb-4 flex gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">Start Date</label>
                <input
                  type="date"
                  value={rideStartDate}
                  onChange={(e) => setRideStartDate(e.target.value)}
                  className="input"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">End Date</label>
                <input
                  type="date"
                  value={rideEndDate}
                  onChange={(e) => setRideEndDate(e.target.value)}
                  className="input"
                />
              </div>
            </div>
            {ridesLoading ? (
              <p className="text-secondary">Loading rides...</p>
            ) : filteredRides.length === 0 ? (
              <p className="text-secondary">No rides found</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left p-2">ID</th>
                      <th className="text-left p-2">Driver</th>
                      <th className="text-left p-2">Passenger</th>
                      <th className="text-left p-2">Route</th>
                      <th className="text-left p-2">Cost</th>
                      <th className="text-left p-2">Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredRides.map((ride) => (
                      <tr key={ride.id} className="border-b">
                        <td className="p-2 text-sm">{ride.id.substring(0, 8)}...</td>
                        <td className="p-2">
                          {ride.driver?.firstName} {ride.driver?.lastName}
                        </td>
                        <td className="p-2">
                          {ride.passengers[0]?.firstName} {ride.passengers[0]?.lastName}
                        </td>
                        <td className="p-2 text-sm">
                          {ride.pickupAddress.substring(0, 20)}... → {ride.dropoffAddress.substring(0, 20)}...
                        </td>
                        <td className="p-2">{ride.cost.toFixed(2)} ر.س</td>
                        <td className="p-2 text-sm">
                          {new Date(ride.createdAt).toLocaleDateString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

              <div className="card">
                <h3 className="text-xl font-bold mb-4">Support Tickets</h3>
            <div className="mb-4">
              <label className="block text-sm font-medium mb-2">Status</label>
              <select
                value={ticketStatus}
                onChange={(e) => setTicketStatus(e.target.value)}
                className="input"
              >
                <option value="open">Open</option>
                <option value="closed">Closed</option>
              </select>
            </div>
            {ticketsLoading ? (
              <p className="text-secondary">Loading tickets...</p>
            ) : supportTickets.length === 0 ? (
              <p className="text-secondary">No tickets found</p>
            ) : (
              <div className="space-y-4">
                {supportTickets.map((ticket) => (
                  <div key={ticket.id} className="border rounded p-4">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <h4 className="font-bold">{ticket.subject}</h4>
                        <p className="text-sm text-secondary">
                          From: {ticket.user?.firstName} {ticket.user?.lastName} ({ticket.email})
                        </p>
                        <p className="text-sm text-secondary">
                          Status: {ticket.status} | {new Date(ticket.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                      <button
                        onClick={() => {
                          setSelectedTicket(ticket)
                          setReplyModal(true)
                        }}
                        className="btn btn-primary"
                      >
                        Reply
                      </button>
                    </div>
                    <p className="text-sm">{ticket.message}</p>
                    {ticket.messages.length > 1 && (
                      <div className="mt-2">
                        <p className="text-sm font-medium">Replies:</p>
                        {ticket.messages.slice(1).map((msg: any) => (
                          <div key={msg.id} className="ml-4 mt-1 p-2 bg-gray-50 rounded text-sm">
                            <p className="font-medium">
                              {msg.sender ? `${msg.sender.firstName} ${msg.sender.lastName}` : 'Support'}
                            </p>
                            <p>{msg.message}</p>
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
            </>
          )}

          {activeTab === 'documents' && (
            <DocumentsTab
              documents={documents}
              loading={documentsLoading}
              onReview={handleDocumentReview}
            />
          )}

          {activeTab === 'live-rides' && (
            <LiveRidesTab
              rides={liveRides}
              loading={liveRidesLoading}
              onManage={handleRideManagement}
            />
          )}

          {activeTab === 'safety' && (
            <SafetyReportsTab
              reports={safetyReports}
              loading={safetyLoading}
              onAction={handleSafetyReportAction}
            />
          )}

          {activeTab === 'sos' && (
            <SOSTab
              sosLogs={sosLogs}
              loading={sosLoading}
              onAction={handleSOSAction}
            />
          )}

          {activeTab === 'analytics' && (
            <AnalyticsTab stats={stats} />
          )}
        </div>
      </div>

      {/* Reply Modal */}
      {replyModal && selectedTicket && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full max-h-[80vh] overflow-y-auto">
            <h3 className="text-xl font-bold mb-4">Reply to Support Ticket</h3>
            <div className="mb-4">
              <h4 className="font-bold">{selectedTicket.subject}</h4>
              <p className="text-sm text-secondary mb-2">
                From: {selectedTicket.user?.firstName} {selectedTicket.user?.lastName}
              </p>
              <p className="text-sm">{selectedTicket.message}</p>
            </div>
            <div className="mb-4">
              <label className="block text-sm font-medium mb-2">Reply Message</label>
              <textarea
                value={replyMessage}
                onChange={(e) => setReplyMessage(e.target.value)}
                className="input"
                rows={4}
                required
              />
            </div>
            <div className="mb-4">
              <label className="block text-sm font-medium mb-2">Update Status (optional)</label>
              <select
                value={replyStatus}
                onChange={(e) => setReplyStatus(e.target.value)}
                className="input"
              >
                <option value="">Keep current</option>
                <option value="IN_PROGRESS">In Progress</option>
                <option value="RESOLVED">Resolved</option>
                <option value="CLOSED">Closed</option>
              </select>
            </div>
            <div className="flex gap-2">
              <button onClick={handleReply} className="btn btn-primary">
                Send Reply
              </button>
              <button
                onClick={() => {
                  setReplyModal(false)
                  setSelectedTicket(null)
                  setReplyMessage('')
                  setReplyStatus('')
                }}
                className="btn btn-outline"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </AuthGuard>
  )
}

// Documents Tab Component
function DocumentsTab({ documents, loading, onReview }: {
  documents: any[],
  loading: boolean,
  onReview: (documentId: string, action: 'approve' | 'reject', rejectionReason?: string) => void
}) {
  return (
    <div>
      <h2 className="text-2xl font-bold mb-6">Document Verification</h2>
      {loading ? (
        <p className="text-secondary">Loading documents...</p>
      ) : documents.length === 0 ? (
        <p className="text-secondary">No pending documents</p>
      ) : (
        <div className="space-y-4">
          {documents.map((doc) => (
            <div key={doc.id} className="card">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="font-bold">{doc.documentType.replace('_', ' ').toUpperCase()}</h3>
                  <p className="text-sm text-secondary">
                    Submitted by: {doc.user ? `${doc.user.firstName} ${doc.user.lastName} (Student)` :
                      `${doc.driver.firstName} ${doc.driver.lastName} (Driver)`}
                  </p>
                  <p className="text-sm text-secondary">
                    Submitted: {new Date(doc.createdAt).toLocaleString()}
                  </p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => onReview(doc.id, 'approve')}
                    className="btn btn-primary"
                  >
                    Approve
                  </button>
                  <button
                    onClick={() => {
                      const reason = prompt('Rejection reason:');
                      if (reason) onReview(doc.id, 'reject', reason);
                    }}
                    className="btn btn-outline text-red-500 border-red-500"
                  >
                    Reject
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// Live Rides Tab Component
function LiveRidesTab({ rides, loading, onManage }: {
  rides: any[],
  loading: boolean,
  onManage: (rideId: string, action: 'complete' | 'cancel', reason: string) => void
}) {
  return (
    <div>
      <h2 className="text-2xl font-bold mb-6">Live Rides Monitoring</h2>
      {loading ? (
        <p className="text-secondary">Loading rides...</p>
      ) : rides.length === 0 ? (
        <p className="text-secondary">No active rides</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b">
                <th className="text-left p-2">Ride ID</th>
                <th className="text-left p-2">Driver</th>
                <th className="text-left p-2">Passenger</th>
                <th className="text-left p-2">Status</th>
                <th className="text-left p-2">Started</th>
                <th className="text-left p-2">Actions</th>
              </tr>
            </thead>
            <tbody>
              {rides.map((ride) => (
                <tr key={ride.id} className="border-b">
                  <td className="p-2 text-sm">{ride.id.substring(0, 8)}...</td>
                  <td className="p-2">{ride.driver?.firstName} {ride.driver?.lastName}</td>
                  <td className="p-2">{ride.passengers[0]?.firstName} {ride.passengers[0]?.lastName}</td>
                  <td className="p-2">
                    <span className={`px-2 py-1 rounded text-xs ${
                      ride.status === 'IN_PROGRESS' ? 'bg-blue-100 text-blue-800' :
                      'bg-yellow-100 text-yellow-800'
                    }`}>
                      {ride.status}
                    </span>
                  </td>
                  <td className="p-2 text-sm">{new Date(ride.createdAt).toLocaleTimeString()}</td>
                  <td className="p-2">
                    <div className="flex gap-1">
                      <button
                        onClick={() => {
                          const reason = prompt('Completion reason:');
                          if (reason) onManage(ride.id, 'complete', reason);
                        }}
                        className="btn btn-primary text-xs"
                      >
                        Complete
                      </button>
                      <button
                        onClick={() => {
                          const reason = prompt('Cancellation reason:');
                          if (reason) onManage(ride.id, 'cancel', reason);
                        }}
                        className="btn btn-outline text-red-500 text-xs"
                      >
                        Cancel
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

// Safety Reports Tab Component
function SafetyReportsTab({ reports, loading, onAction }: {
  reports: any[],
  loading: boolean,
  onAction: (reportId: string, action: 'resolve' | 'dismiss' | 'warning' | 'ban', adminNotes?: string) => void
}) {
  return (
    <div>
      <h2 className="text-2xl font-bold mb-6">Safety Reports</h2>
      {loading ? (
        <p className="text-secondary">Loading reports...</p>
      ) : reports.length === 0 ? (
        <p className="text-secondary">No safety reports</p>
      ) : (
        <div className="space-y-4">
          {reports.map((report) => (
            <div key={report.id} className="card">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="font-bold">{report.reportType.replace('_', ' ').toUpperCase()}</h3>
                  <p className="text-sm">
                    <strong>Reporter:</strong> {report.reporter.firstName} {report.reporter.lastName}
                  </p>
                  <p className="text-sm">
                    <strong>Reported:</strong> {report.reported.firstName} {report.reported.lastName}
                  </p>
                  <p className="text-sm text-secondary">{report.description}</p>
                  <p className="text-xs text-secondary">
                    Status: {report.status} | {new Date(report.createdAt).toLocaleString()}
                  </p>
                </div>
                {report.status === 'pending' && (
                  <div className="flex gap-2">
                    <button
                      onClick={() => onAction(report.id, 'resolve')}
                      className="btn btn-primary text-xs"
                    >
                      Resolve
                    </button>
                    <button
                      onClick={() => onAction(report.id, 'warning')}
                      className="btn btn-outline text-xs"
                    >
                      Warning
                    </button>
                    <button
                      onClick={() => onAction(report.id, 'ban')}
                      className="btn btn-outline text-red-500 text-xs"
                    >
                      Ban User
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// SOS Tab Component
function SOSTab({ sosLogs, loading, onAction }: {
  sosLogs: any[],
  loading: boolean,
  onAction: (sosId: string, action: 'resolve' | 'false_alarm') => void
}) {
  return (
    <div>
      <h2 className="text-2xl font-bold mb-6">SOS Emergency Alerts</h2>
      {loading ? (
        <p className="text-secondary">Loading SOS logs...</p>
      ) : sosLogs.length === 0 ? (
        <p className="text-secondary">No SOS alerts</p>
      ) : (
        <div className="space-y-4">
          {sosLogs.map((sos) => (
            <div key={sos.id} className="card border-red-200 bg-red-50">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="font-bold text-red-800">🚨 SOS ALERT</h3>
                  <p className="text-sm">
                    <strong>User:</strong> {sos.user.firstName} {sos.user.lastName}
                  </p>
                  <p className="text-sm">
                    <strong>Ride:</strong> {sos.ride.pickupAddress} → {sos.ride.dropoffAddress}
                  </p>
                  {sos.message && (
                    <p className="text-sm text-secondary">"{sos.message}"</p>
                  )}
                  <p className="text-xs text-secondary">
                    {new Date(sos.createdAt).toLocaleString()}
                  </p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => onAction(sos.id, 'resolve')}
                    className="btn btn-primary text-xs"
                  >
                    Resolve
                  </button>
                  <button
                    onClick={() => onAction(sos.id, 'false_alarm')}
                    className="btn btn-outline text-xs"
                  >
                    False Alarm
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// Analytics Tab Component
function AnalyticsTab({ stats }: { stats: any }) {
  return (
    <div>
      <h2 className="text-2xl font-bold mb-6">Financial Analytics</h2>
      {stats ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <div className="card">
            <h3 className="text-lg font-bold mb-4">Today's Revenue</h3>
            <p className="text-3xl font-bold text-accent">${stats.totalRevenue?.toFixed(2) || '0.00'}</p>
          </div>
          <div className="card">
            <h3 className="text-lg font-bold mb-4">Active Rides</h3>
            <p className="text-3xl font-bold text-primary">{stats.activeRides || 0}</p>
          </div>
          <div className="card">
            <h3 className="text-lg font-bold mb-4">Total Rides</h3>
            <p className="text-3xl font-bold text-secondary">{stats.totalRides || 0}</p>
          </div>
          <div className="card">
            <h3 className="text-lg font-bold mb-4">Total Users</h3>
            <p className="text-3xl font-bold text-primary">{stats.totalUsers || 0}</p>
          </div>
          <div className="card">
            <h3 className="text-lg font-bold mb-4">Total Drivers</h3>
            <p className="text-3xl font-bold text-primary">{stats.totalDrivers || 0}</p>
          </div>
          <div className="card">
            <h3 className="text-lg font-bold mb-4">Open Support Tickets</h3>
            <p className="text-3xl font-bold text-secondary">{stats.openSupportTickets || 0}</p>
          </div>
        </div>
      ) : (
        <p className="text-secondary">Loading analytics...</p>
      )}
    </div>
  )
}

