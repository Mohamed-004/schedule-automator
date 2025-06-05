"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Clock, Calendar } from "lucide-react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"

const mockWorkers = [
  {
    id: 1,
    name: "Mike Chen",
    skills: ["Plumbing", "General Maintenance"],
    availability: "Available",
    todayJobs: 3,
    weeklyHours: 32,
    status: "active",
    phone: "(555) 123-4567",
    email: "mike.chen@company.com",
  },
  {
    id: 2,
    name: "Lisa Rodriguez",
    skills: ["HVAC", "Electrical"],
    availability: "Busy",
    todayJobs: 4,
    weeklyHours: 38,
    status: "active",
    phone: "(555) 234-5678",
    email: "lisa.rodriguez@company.com",
  },
  {
    id: 3,
    name: "David Kim",
    skills: ["Electrical", "Smart Home"],
    availability: "Available",
    todayJobs: 2,
    weeklyHours: 28,
    status: "active",
    phone: "(555) 345-6789",
    email: "david.kim@company.com",
  },
  {
    id: 4,
    name: "Anna Thompson",
    skills: ["General Maintenance", "Painting"],
    availability: "Off Duty",
    todayJobs: 0,
    weeklyHours: 0,
    status: "inactive",
    phone: "(555) 456-7890",
    email: "anna.thompson@company.com",
  },
]

const getAvailabilityColor = (availability: string) => {
  switch (availability) {
    case "Available":
      return "bg-green-100 text-green-800 border-green-200"
    case "Busy":
      return "bg-yellow-100 text-yellow-800 border-yellow-200"
    case "Off Duty":
      return "bg-gray-100 text-gray-800 border-gray-200"
    default:
      return "bg-gray-100 text-gray-800 border-gray-200"
  }
}

export function WorkersPanel() {
  const [selectedWorker, setSelectedWorker] = useState(null)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold text-gray-900">Workers Management</h2>
          <p className="text-gray-600">Monitor worker availability and assignments</p>
        </div>
        <div className="flex gap-2">
          <Badge variant="outline" className="bg-green-50 text-green-700">
            {mockWorkers.filter((w) => w.availability === "Available").length} Available
          </Badge>
          <Badge variant="outline" className="bg-yellow-50 text-yellow-700">
            {mockWorkers.filter((w) => w.availability === "Busy").length} Busy
          </Badge>
          <Badge variant="outline" className="bg-gray-50 text-gray-700">
            {mockWorkers.filter((w) => w.availability === "Off Duty").length} Off Duty
          </Badge>
        </div>
      </div>

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        {mockWorkers.map((worker) => (
          <Card key={worker.id} className="hover:shadow-md transition-shadow">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-3">
                <Avatar>
                  <AvatarFallback>
                    {worker.name
                      .split(" ")
                      .map((n) => n[0])
                      .join("")}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <CardTitle className="text-lg">{worker.name}</CardTitle>
                  <Badge className={getAvailabilityColor(worker.availability)}>{worker.availability}</Badge>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h4 className="text-sm font-medium text-gray-700 mb-2">Skills</h4>
                <div className="flex flex-wrap gap-1">
                  {worker.skills.map((skill) => (
                    <Badge key={skill} variant="outline" className="text-xs">
                      {skill}
                    </Badge>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <div className="flex items-center gap-1 text-gray-600">
                    <Calendar className="h-3 w-3" />
                    Today's Jobs
                  </div>
                  <div className="font-semibold">{worker.todayJobs}</div>
                </div>
                <div>
                  <div className="flex items-center gap-1 text-gray-600">
                    <Clock className="h-3 w-3" />
                    Weekly Hours
                  </div>
                  <div className="font-semibold">{worker.weeklyHours}h</div>
                </div>
              </div>

              <Dialog>
                <DialogTrigger asChild>
                  <Button className="w-full" variant="outline">
                    View Details
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>{worker.name} - Worker Details</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-sm font-medium">Status</label>
                        <p className="text-sm text-gray-600">{worker.availability}</p>
                      </div>
                      <div>
                        <label className="text-sm font-medium">Today's Jobs</label>
                        <p className="text-sm text-gray-600">{worker.todayJobs}</p>
                      </div>
                    </div>
                    <div>
                      <label className="text-sm font-medium">Contact</label>
                      <p className="text-sm text-gray-600">{worker.phone}</p>
                      <p className="text-sm text-gray-600">{worker.email}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium">Skills</label>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {worker.skills.map((skill) => (
                          <Badge key={skill} variant="outline">
                            {skill}
                          </Badge>
                        ))}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm">View Schedule</Button>
                      <Button size="sm" variant="outline">
                        Edit Worker
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
