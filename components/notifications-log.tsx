"use client"

import { useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Search, MessageSquare, Mail, Phone, CheckCircle, XCircle, Clock } from "lucide-react"

const mockNotifications = [
  {
    id: 1,
    type: "SMS",
    recipient: "Sarah Johnson",
    message: "Reminder: Your plumbing appointment is tomorrow at 8:00 AM",
    sentAt: "2024-12-04 10:30 AM",
    status: "Delivered",
    jobId: 1,
    messageType: "Reminder",
  },
  {
    id: 2,
    type: "Email",
    recipient: "Robert Davis",
    message: "Your HVAC maintenance is scheduled for today at 10:30 AM",
    sentAt: "2024-12-05 07:00 AM",
    status: "Confirmed",
    jobId: 2,
    messageType: "Same Day Reminder",
  },
  {
    id: 3,
    type: "SMS",
    recipient: "Emily Wilson",
    message: "Your appointment has been rescheduled to Dec 6 at 2:00 PM",
    sentAt: "2024-12-04 03:15 PM",
    status: "Delivered",
    jobId: 3,
    messageType: "Reschedule Notice",
  },
  {
    id: 4,
    type: "Phone",
    recipient: "Michael Brown",
    message: "Emergency job notification - technician will arrive in 30 minutes",
    sentAt: "2024-12-05 11:45 AM",
    status: "Failed",
    jobId: 4,
    messageType: "Emergency Alert",
  },
  {
    id: 5,
    type: "Email",
    recipient: "Jennifer Lee",
    message: "Reminder: Your appointment is in 2 days (Dec 6 at 11:00 AM)",
    sentAt: "2024-12-04 09:00 AM",
    status: "Delivered",
    jobId: 5,
    messageType: "2-Day Reminder",
  },
]

const getStatusIcon = (status: string) => {
  switch (status) {
    case "Delivered":
      return <CheckCircle className="h-4 w-4 text-green-600" />
    case "Confirmed":
      return <CheckCircle className="h-4 w-4 text-blue-600" />
    case "Failed":
      return <XCircle className="h-4 w-4 text-red-600" />
    case "Pending":
      return <Clock className="h-4 w-4 text-yellow-600" />
    default:
      return <Clock className="h-4 w-4 text-gray-600" />
  }
}

const getStatusColor = (status: string) => {
  switch (status) {
    case "Delivered":
      return "bg-green-100 text-green-800 border-green-200"
    case "Confirmed":
      return "bg-blue-100 text-blue-800 border-blue-200"
    case "Failed":
      return "bg-red-100 text-red-800 border-red-200"
    case "Pending":
      return "bg-yellow-100 text-yellow-800 border-yellow-200"
    default:
      return "bg-gray-100 text-gray-800 border-gray-200"
  }
}

const getTypeIcon = (type: string) => {
  switch (type) {
    case "SMS":
      return <MessageSquare className="h-4 w-4" />
    case "Email":
      return <Mail className="h-4 w-4" />
    case "Phone":
      return <Phone className="h-4 w-4" />
    default:
      return <MessageSquare className="h-4 w-4" />
  }
}

export function NotificationsLog() {
  const [notifications, setNotifications] = useState(mockNotifications)
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [typeFilter, setTypeFilter] = useState("all")

  const filteredNotifications = notifications.filter((notification) => {
    const matchesSearch =
      notification.recipient.toLowerCase().includes(searchTerm.toLowerCase()) ||
      notification.message.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesStatus = statusFilter === "all" || notification.status.toLowerCase() === statusFilter
    const matchesType = typeFilter === "all" || notification.type.toLowerCase() === typeFilter

    return matchesSearch && matchesStatus && matchesType
  })

  const stats = {
    total: notifications.length,
    delivered: notifications.filter((n) => n.status === "Delivered").length,
    confirmed: notifications.filter((n) => n.status === "Confirmed").length,
    failed: notifications.filter((n) => n.status === "Failed").length,
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold text-gray-900">Notifications Log</h2>
          <p className="text-gray-600">Track all client communications and delivery status</p>
        </div>
        <div className="flex gap-2">
          <Badge variant="outline" className="bg-green-50 text-green-700">
            {stats.delivered} Delivered
          </Badge>
          <Badge variant="outline" className="bg-blue-50 text-blue-700">
            {stats.confirmed} Confirmed
          </Badge>
          <Badge variant="outline" className="bg-red-50 text-red-700">
            {stats.failed} Failed
          </Badge>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search notifications..."
                  className="pl-10"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="delivered">Delivered</SelectItem>
                <SelectItem value="confirmed">Confirmed</SelectItem>
                <SelectItem value="failed">Failed</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
              </SelectContent>
            </Select>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Filter by type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="sms">SMS</SelectItem>
                <SelectItem value="email">Email</SelectItem>
                <SelectItem value="phone">Phone</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Notifications List */}
      <div className="space-y-4">
        {filteredNotifications.map((notification) => (
          <Card key={notification.id} className="hover:shadow-md transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="flex items-center gap-2">
                      {getTypeIcon(notification.type)}
                      <span className="font-medium">{notification.type}</span>
                    </div>
                    <Badge variant="outline" className="text-xs">
                      {notification.messageType}
                    </Badge>
                    <Badge className={getStatusColor(notification.status)}>
                      <div className="flex items-center gap-1">
                        {getStatusIcon(notification.status)}
                        {notification.status}
                      </div>
                    </Badge>
                  </div>

                  <div className="space-y-2">
                    <div>
                      <span className="text-sm font-medium text-gray-700">To: </span>
                      <span className="text-sm">{notification.recipient}</span>
                    </div>
                    <div>
                      <span className="text-sm font-medium text-gray-700">Message: </span>
                      <span className="text-sm text-gray-600">{notification.message}</span>
                    </div>
                    <div>
                      <span className="text-sm font-medium text-gray-700">Sent: </span>
                      <span className="text-sm text-gray-500">{notification.sentAt}</span>
                    </div>
                  </div>
                </div>

                <div className="flex gap-2">
                  <Button size="sm" variant="outline">
                    View Job
                  </Button>
                  {notification.status === "Failed" && <Button size="sm">Resend</Button>}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredNotifications.length === 0 && (
        <Card>
          <CardContent className="p-12 text-center">
            <MessageSquare className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No notifications found</h3>
            <p className="text-gray-600">Try adjusting your search or filter criteria.</p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
