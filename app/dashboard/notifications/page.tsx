'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { LoadingSpinner } from '@/components/ui/loading-spinner'
import { 
  Bell, 
  MessageSquare, 
  Mail, 
  CheckCircle, 
  XCircle, 
  Clock, 
  Send,
  Filter,
  Download,
  Search,
  Calendar,
  User,
  Briefcase,
  Phone,
  AlertCircle
} from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'

interface NotificationRecord {
  id: string
  job_id: string
  notification_type: 'sms' | 'email' | 'system'
  recipient_contact: string
  message_content: string
  status: 'sent' | 'failed' | 'pending' | 'delivered'
  sent_at: string | null
  created_at: string
  // Direct fields from SQL JOIN
  client_name?: string
  worker_name?: string
  job_title?: string
}

interface NotificationStats {
  total: number
  sent: number
  failed: number
  pending: number
  sms: number
  email: number
  system: number
  todayCount: number
  weekCount: number
}

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<NotificationRecord[]>([])
  const [filteredNotifications, setFilteredNotifications] = useState<NotificationRecord[]>([])
  const [stats, setStats] = useState<NotificationStats>({
    total: 0,
    sent: 0,
    failed: 0,
    pending: 0,
    sms: 0,
    email: 0,
    system: 0,
    todayCount: 0,
    weekCount: 0
  })
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [typeFilter, setTypeFilter] = useState<string>('all')
  const [dateFilter, setDateFilter] = useState<string>('all')
  const [selectedNotification, setSelectedNotification] = useState<NotificationRecord | null>(null)

  const supabase = createClient()

  useEffect(() => {
    fetchNotifications()
  }, [])

  useEffect(() => {
    applyFilters()
  }, [notifications, searchTerm, statusFilter, typeFilter, dateFilter])

  const fetchNotifications = async () => {
    try {
      setIsLoading(true)
      setError(null)
      
      // First, get all notifications
      const { data: notifications, error: notificationsError } = await supabase
        .from('reschedule_notifications')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100)

      if (notificationsError) {
        throw notificationsError
      }

      if (!notifications || notifications.length === 0) {
        setNotifications([])
        return
      }

      // Get unique job IDs to fetch job details
      const jobIds = [...new Set(notifications.map(n => n.job_id))]

      // Fetch job details with client and worker info
      const { data: jobs, error: jobsError } = await supabase
        .from('jobs')
        .select(`
          id,
          title,
          client_id,
          worker_id,
          clients!jobs_client_id_fkey (
            id,
            name
          ),
          workers!jobs_worker_id_fkey (
            id,
            name
          )
        `)
        .in('id', jobIds)

      if (jobsError) {
        console.error('Jobs query error:', jobsError)
        // Continue without job details rather than failing completely
      }

      // Create a map of job details for quick lookup
      const jobsMap = new Map()
      if (jobs) {
        jobs.forEach(job => {
          jobsMap.set(job.id, {
            title: job.title,
            client_name: (job.clients as any)?.name || 'Unknown Client',
            worker_name: (job.workers as any)?.name || 'Unknown Worker'
          })
        })
      }

      // Combine notifications with job details
      const processedNotifications = notifications.map(notification => {
        const jobDetails = jobsMap.get(notification.job_id) || {
          title: 'Unknown Job',
          client_name: 'Unknown Client',
          worker_name: 'Unknown Worker'
        }

        return {
          ...notification,
          job_title: jobDetails.title,
          client_name: jobDetails.client_name,
          worker_name: jobDetails.worker_name
        }
      })

      setNotifications(processedNotifications)
      calculateStats(processedNotifications)

    } catch (error) {
      console.error('Error in fetchNotifications:', error)
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'
      setError(`Database query failed: ${errorMessage}`)
    } finally {
      setIsLoading(false)
    }
  }

  const calculateStats = (data: NotificationRecord[]) => {
    const now = new Date()
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)

    const stats = data.reduce((acc, notification) => {
      const createdAt = new Date(notification.created_at)
      
      acc.total++
      
      if (notification.status === 'sent' || notification.status === 'delivered') acc.sent++
      if (notification.status === 'failed') acc.failed++
      if (notification.status === 'pending') acc.pending++
      
      if (notification.notification_type === 'sms') acc.sms++
      if (notification.notification_type === 'email') acc.email++
      if (notification.notification_type === 'system') acc.system++
      
      if (createdAt >= today) acc.todayCount++
      if (createdAt >= weekAgo) acc.weekCount++
      
      return acc
    }, {
      total: 0,
      sent: 0,
      failed: 0,
      pending: 0,
      sms: 0,
      email: 0,
      system: 0,
      todayCount: 0,
      weekCount: 0
    })

    setStats(stats)
  }

  const applyFilters = () => {
    let filtered = [...notifications]

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(notification =>
        notification.message_content.toLowerCase().includes(searchTerm.toLowerCase()) ||
        notification.recipient_contact.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (notification.job_title && notification.job_title.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (notification.client_name && notification.client_name.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (notification.worker_name && notification.worker_name.toLowerCase().includes(searchTerm.toLowerCase()))
      )
    }

    // Status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(notification => notification.status === statusFilter)
    }

    // Type filter
    if (typeFilter !== 'all') {
      filtered = filtered.filter(notification => notification.notification_type === typeFilter)
    }

    // Date filter
    if (dateFilter !== 'all') {
      const now = new Date()
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
      const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
      const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)

      filtered = filtered.filter(notification => {
        const createdAt = new Date(notification.created_at)
        switch (dateFilter) {
          case 'today':
            return createdAt >= today
          case 'week':
            return createdAt >= weekAgo
          case 'month':
            return createdAt >= monthAgo
          default:
            return true
        }
      })
    }

    setFilteredNotifications(filtered)
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'sent':
      case 'delivered':
        return <CheckCircle className="w-4 h-4 text-green-500" />
      case 'failed':
        return <XCircle className="w-4 h-4 text-red-500" />
      case 'pending':
        return <Clock className="w-4 h-4 text-yellow-500" />
      default:
        return <AlertCircle className="w-4 h-4 text-gray-500" />
    }
  }

  const getStatusBadge = (status: string) => {
    const config = {
      sent: { label: 'Sent', className: 'bg-green-100 text-green-800 border-green-200' },
      delivered: { label: 'Delivered', className: 'bg-green-100 text-green-800 border-green-200' },
      failed: { label: 'Failed', className: 'bg-red-100 text-red-800 border-red-200' },
      pending: { label: 'Pending', className: 'bg-yellow-100 text-yellow-800 border-yellow-200' }
    }

    const statusConfig = config[status as keyof typeof config] || { 
      label: status, 
      className: 'bg-gray-100 text-gray-800 border-gray-200' 
    }

    return (
      <Badge variant="outline" className={`${statusConfig.className} text-xs font-medium`}>
        {getStatusIcon(status)}
        <span className="ml-1">{statusConfig.label}</span>
      </Badge>
    )
  }

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'sms':
        return <MessageSquare className="w-4 h-4" />
      case 'email':
        return <Mail className="w-4 h-4" />
      case 'system':
        return <AlertCircle className="w-4 h-4" />
      default:
        return <Bell className="w-4 h-4" />
    }
  }

  const exportNotifications = () => {
    const csvContent = [
      ['Date', 'Type', 'Status', 'Recipient', 'Job Title', 'Client', 'Worker', 'Message'].join(','),
      ...filteredNotifications.map(notification => [
        formatDate(notification.created_at),
        notification.notification_type,
        notification.status,
        notification.recipient_contact,
        notification.job_title || '',
        notification.client_name || '',
        notification.worker_name || '',
        `"${notification.message_content.replace(/"/g, '""')}"`
      ].join(','))
    ].join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `notifications-${new Date().toISOString().split('T')[0]}.csv`
    a.click()
    window.URL.revokeObjectURL(url)
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString()
  }

  const getRecipientInfo = (notification: NotificationRecord) => {
    // Determine if this is a client or worker notification based on message content patterns
    const messageContent = notification.message_content.toLowerCase()
    
    // Worker messages contain "job update:" at the beginning
    // Client messages start with "hi [name]! your [job] appointment"
    const isWorkerNotification = messageContent.includes('job update:') || 
                                messageContent.includes('please update your schedule')
    
    if (isWorkerNotification) {
      return {
        name: notification.worker_name || 'Unknown Worker',
        type: 'worker',
        icon: '👷',
        bgColor: 'bg-purple-50 border-purple-200',
        textColor: 'text-purple-700'
      }
    } else {
      return {
        name: notification.client_name || 'Unknown Client',
        type: 'client',
        icon: '👤',
        bgColor: 'bg-blue-50 border-blue-200',
        textColor: 'text-blue-700'
      }
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <LoadingSpinner />
      </div>
    )
  }

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Notifications Log</h1>
          <p className="text-gray-600 mt-1">
            Track all SMS and email notifications sent to clients and workers
          </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={fetchNotifications} variant="outline" size="sm">
            <Bell className="w-4 h-4 mr-2" />
            Refresh
          </Button>
          <Button onClick={exportNotifications} variant="outline" size="sm">
            <Download className="w-4 h-4 mr-2" />
            Export CSV
          </Button>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-red-800">
              <XCircle className="w-5 h-5" />
              <span className="font-medium">Error:</span>
              <span>{error}</span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Bell className="w-4 h-4 text-blue-500" />
              <div>
                <p className="text-2xl font-bold">{stats.total}</p>
                <p className="text-xs text-gray-600">Total</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <CheckCircle className="w-4 h-4 text-green-500" />
              <div>
                <p className="text-2xl font-bold">{stats.sent}</p>
                <p className="text-xs text-gray-600">Sent</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <XCircle className="w-4 h-4 text-red-500" />
              <div>
                <p className="text-2xl font-bold">{stats.failed}</p>
                <p className="text-xs text-gray-600">Failed</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Clock className="w-4 h-4 text-yellow-500" />
              <div>
                <p className="text-2xl font-bold">{stats.pending}</p>
                <p className="text-xs text-gray-600">Pending</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <MessageSquare className="w-4 h-4 text-blue-500" />
              <div>
                <p className="text-2xl font-bold">{stats.sms}</p>
                <p className="text-xs text-gray-600">SMS</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Mail className="w-4 h-4 text-purple-500" />
              <div>
                <p className="text-2xl font-bold">{stats.email}</p>
                <p className="text-xs text-gray-600">Email</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <AlertCircle className="w-4 h-4 text-gray-500" />
              <div>
                <p className="text-2xl font-bold">{stats.system}</p>
                <p className="text-xs text-gray-600">System</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Calendar className="w-4 h-4 text-orange-500" />
              <div>
                <p className="text-2xl font-bold">{stats.todayCount}</p>
                <p className="text-xs text-gray-600">Today</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="w-5 h-5" />
            Filters
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Search</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  placeholder="Search messages, contacts, jobs..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Status</label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="sent">✅ Sent</SelectItem>
                  <SelectItem value="failed">❌ Failed</SelectItem>
                  <SelectItem value="pending">⏰ Pending</SelectItem>
                  <SelectItem value="delivered">📨 Delivered</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Type</label>
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="sms">📱 SMS</SelectItem>
                  <SelectItem value="email">📧 Email</SelectItem>
                  <SelectItem value="system">🔧 System Logs</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Date Range</label>
              <Select value={dateFilter} onValueChange={setDateFilter}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Time</SelectItem>
                  <SelectItem value="today">Today</SelectItem>
                  <SelectItem value="week">This Week</SelectItem>
                  <SelectItem value="month">This Month</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Notifications List */}
      <Card>
        <CardHeader>
          <CardTitle>
            Notifications ({filteredNotifications.length})
          </CardTitle>
          <CardDescription>
            Detailed log of all notification attempts
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {filteredNotifications.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <Bell className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                <p>No notifications found matching your filters</p>
              </div>
            ) : (
              filteredNotifications.map((notification) => {
                const recipientInfo = getRecipientInfo(notification)
                const typeColor = {
                  sms: 'bg-blue-50 border-blue-200',
                  email: 'bg-purple-50 border-purple-200',
                  system: 'bg-gray-50 border-gray-200'
                }[notification.notification_type]

                return (
                  <div 
                    key={notification.id} 
                    className="cursor-pointer hover:shadow-md transition-shadow"
                    onClick={() => setSelectedNotification(notification)}
                  >
                    <Card className={typeColor}>
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <div className="flex items-center gap-2">
                              {getTypeIcon(notification.notification_type)}
                              <span className="font-medium text-sm uppercase tracking-wide">
                                {notification.notification_type}
                              </span>
                            </div>
                            {getStatusBadge(notification.status)}
                            <div className={`px-2 py-1 rounded-full text-xs font-medium border ${recipientInfo.bgColor} ${recipientInfo.textColor}`}>
                              <span className="mr-1">{recipientInfo.icon}</span>
                              {recipientInfo.name}
                            </div>
                          </div>
                          
                          <div className="space-y-1">
                            <p className="text-sm text-gray-900 line-clamp-2">
                              {notification.message_content}
                            </p>
                            <div className="flex items-center gap-4 text-xs text-gray-500">
                              <span className="flex items-center gap-1">
                                <Phone className="w-3 h-3" />
                                {notification.recipient_contact}
                              </span>
                              <span className="flex items-center gap-1">
                                <Briefcase className="w-3 h-3" />
                                {notification.job_title || `Job #${notification.job_id.slice(0, 8)}`}
                              </span>
                            </div>
                          </div>
                        </div>
                        
                        <div className="text-right text-xs text-gray-500 ml-4">
                          <div>{formatDate(notification.created_at)}</div>
                          {notification.sent_at && (
                            <div className="text-green-600">
                              Sent: {formatDate(notification.sent_at)}
                            </div>
                          )}
                        </div>
                                              </div>
                      </CardContent>
                    </Card>
                  </div>
                  )
                })
            )}
          </div>
        </CardContent>
      </Card>

      {/* Notification Detail Modal */}
      <Dialog open={!!selectedNotification} onOpenChange={() => setSelectedNotification(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {selectedNotification && getTypeIcon(selectedNotification.notification_type)}
              Notification Details
            </DialogTitle>
          </DialogHeader>
          
          {selectedNotification && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-500">Type</label>
                  <p className="capitalize">{selectedNotification.notification_type}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Status</label>
                  <div className="mt-1">
                    {getStatusBadge(selectedNotification.status)}
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Recipient</label>
                  <p>{selectedNotification.recipient_contact}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Created</label>
                  <p>{formatDate(selectedNotification.created_at)}</p>
                </div>
              </div>
              
              <div>
                <label className="text-sm font-medium text-gray-500">Job Details</label>
                <p className="mt-1">{selectedNotification.job_title || `Job ID: ${selectedNotification.job_id.slice(0, 8)}...`}</p>
                <p className="text-sm text-gray-500">
                  Client: {selectedNotification.client_name || `Contact: ${selectedNotification.recipient_contact}`}
                </p>
              </div>
              
              <div>
                <label className="text-sm font-medium text-gray-500">Message Content</label>
                <div className="mt-1 p-3 bg-gray-50 rounded-lg">
                  <p className="text-sm whitespace-pre-wrap">{selectedNotification.message_content}</p>
                </div>
              </div>
              
              {selectedNotification.sent_at && (
                <div>
                  <label className="text-sm font-medium text-gray-500">Sent At</label>
                  <p>{formatDate(selectedNotification.sent_at)}</p>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
} 