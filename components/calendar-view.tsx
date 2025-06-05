"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ChevronLeft, ChevronRight, Plus } from "lucide-react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"

const mockWeeklyJobs = {
  Monday: [
    { id: 1, time: "08:00", worker: "Mike Chen", client: "Sarah Johnson", service: "Plumbing" },
    { id: 2, time: "10:30", worker: "Lisa Rodriguez", client: "Robert Davis", service: "HVAC" },
  ],
  Tuesday: [
    { id: 3, time: "09:00", worker: "David Kim", client: "Emily Wilson", service: "Electrical" },
    { id: 4, time: "14:00", worker: "Anna Thompson", client: "Michael Brown", service: "Maintenance" },
  ],
  Wednesday: [{ id: 5, time: "11:00", worker: "Mike Chen", client: "Jennifer Lee", service: "Plumbing" }],
  Thursday: [
    { id: 6, time: "08:30", worker: "Lisa Rodriguez", client: "James Wilson", service: "HVAC" },
    { id: 7, time: "13:00", worker: "David Kim", client: "Maria Garcia", service: "Electrical" },
  ],
  Friday: [
    { id: 8, time: "10:00", worker: "Anna Thompson", client: "John Smith", service: "Maintenance" },
    { id: 9, time: "15:30", worker: "Mike Chen", client: "Lisa Davis", service: "Plumbing" },
  ],
  Saturday: [],
  Sunday: [],
}

const weekDays = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]

export function CalendarView() {
  const [selectedJob, setSelectedJob] = useState(null)
  const [currentWeek, setCurrentWeek] = useState("Dec 2-8, 2024")

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold text-gray-900">Weekly Calendar</h2>
          <p className="text-gray-600">View and manage job schedules</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Button variant="outline" size="icon">
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="font-medium">{currentWeek}</span>
            <Button variant="outline" size="icon">
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            Add Job
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-4">
        {weekDays.map((day) => (
          <Card key={day} className="min-h-[400px]">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-center">
                {day}
                <Badge variant="outline" className="ml-2">
                  {mockWeeklyJobs[day].length}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {mockWeeklyJobs[day].map((job) => (
                <Dialog key={job.id}>
                  <DialogTrigger asChild>
                    <div className="p-2 bg-blue-50 border border-blue-200 rounded-md cursor-pointer hover:bg-blue-100 transition-colors">
                      <div className="text-xs font-medium text-blue-900">{job.time}</div>
                      <div className="text-xs text-blue-700">{job.worker}</div>
                      <div className="text-xs text-blue-600 truncate">{job.client}</div>
                      <div className="text-xs text-blue-500">{job.service}</div>
                    </div>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Job Details</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div>
                        <label className="text-sm font-medium">Client</label>
                        <p className="text-sm text-gray-600">{job.client}</p>
                      </div>
                      <div>
                        <label className="text-sm font-medium">Service</label>
                        <p className="text-sm text-gray-600">{job.service}</p>
                      </div>
                      <div>
                        <label className="text-sm font-medium">Worker</label>
                        <p className="text-sm text-gray-600">{job.worker}</p>
                      </div>
                      <div>
                        <label className="text-sm font-medium">Time</label>
                        <p className="text-sm text-gray-600">{job.time}</p>
                      </div>
                      <div className="flex gap-2">
                        <Button size="sm">Edit</Button>
                        <Button size="sm" variant="outline">
                          Reschedule
                        </Button>
                        <Button size="sm" variant="destructive">
                          Cancel
                        </Button>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>
              ))}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
