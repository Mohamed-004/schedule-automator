"use client"

import { useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Clock, User, MapPin, AlertTriangle, MoreHorizontal } from "lucide-react"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"

const mockJobs = [
  {
    id: 1,
    time: "08:00 AM",
    client: "Sarah Johnson",
    service: "Plumbing Repair",
    worker: "Mike Chen",
    status: "scheduled",
    address: "123 Oak Street",
    emergency: false,
    duration: "2 hours",
  },
  {
    id: 2,
    time: "10:30 AM",
    client: "Robert Davis",
    service: "HVAC Maintenance",
    worker: "Lisa Rodriguez",
    status: "scheduled",
    address: "456 Pine Avenue",
    emergency: true,
    duration: "3 hours",
  },
  {
    id: 3,
    time: "02:00 PM",
    client: "Emily Wilson",
    service: "Electrical Installation",
    worker: "David Kim",
    status: "rescheduled",
    address: "789 Maple Drive",
    emergency: false,
    duration: "4 hours",
  },
  {
    id: 4,
    time: "04:30 PM",
    client: "Michael Brown",
    service: "General Maintenance",
    worker: "Anna Thompson",
    status: "cancelled",
    address: "321 Elm Street",
    emergency: false,
    duration: "1.5 hours",
  },
]

const getStatusColor = (status: string) => {
  switch (status) {
    case "scheduled":
      return "bg-green-100 text-green-800 border-green-200"
    case "rescheduled":
      return "bg-yellow-100 text-yellow-800 border-yellow-200"
    case "cancelled":
      return "bg-red-100 text-red-800 border-red-200"
    default:
      return "bg-gray-100 text-gray-800 border-gray-200"
  }
}

export function TodaysSchedule() {
  const [jobs, setJobs] = useState(mockJobs)

  const handleStatusChange = (jobId: number, newStatus: string) => {
    setJobs(jobs.map((job) => (job.id === jobId ? { ...job, status: newStatus } : job)))
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold text-gray-900">Today's Schedule</h2>
          <p className="text-gray-600">Monday, December 5, 2024</p>
        </div>
        <div className="flex gap-2">
          <Badge variant="outline" className="bg-green-50 text-green-700">
            {jobs.filter((j) => j.status === "scheduled").length} Scheduled
          </Badge>
          <Badge variant="outline" className="bg-yellow-50 text-yellow-700">
            {jobs.filter((j) => j.status === "rescheduled").length} Rescheduled
          </Badge>
          <Badge variant="outline" className="bg-red-50 text-red-700">
            {jobs.filter((j) => j.status === "cancelled").length} Cancelled
          </Badge>
        </div>
      </div>

      <div className="grid gap-4">
        {jobs.map((job) => (
          <Card key={job.id} className="hover:shadow-md transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-gray-500" />
                      <span className="font-semibold text-lg">{job.time}</span>
                    </div>
                    <Badge className={getStatusColor(job.status)}>
                      {job.status.charAt(0).toUpperCase() + job.status.slice(1)}
                    </Badge>
                    {job.emergency && (
                      <Badge className="bg-red-100 text-red-800 border-red-200">
                        <AlertTriangle className="h-3 w-3 mr-1" />
                        Emergency
                      </Badge>
                    )}
                  </div>

                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <h3 className="font-semibold text-gray-900 mb-1">{job.client}</h3>
                      <p className="text-gray-600 mb-2">{job.service}</p>
                      <div className="flex items-center gap-2 text-sm text-gray-500">
                        <MapPin className="h-4 w-4" />
                        {job.address}
                      </div>
                    </div>

                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <User className="h-4 w-4 text-gray-500" />
                        <span className="font-medium">{job.worker}</span>
                      </div>
                      <div className="text-sm text-gray-500">Duration: {job.duration}</div>
                    </div>
                  </div>
                </div>

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => handleStatusChange(job.id, "scheduled")}>
                      Mark as Scheduled
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleStatusChange(job.id, "rescheduled")}>
                      Reschedule
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleStatusChange(job.id, "cancelled")}>
                      Cancel Job
                    </DropdownMenuItem>
                    <DropdownMenuItem>View Details</DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
