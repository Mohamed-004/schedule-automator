"use client"

import { useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { Plus, Search, AlertTriangle } from "lucide-react"

const mockJobs = [
  {
    id: 1,
    client: "Sarah Johnson",
    service: "Plumbing Repair",
    date: "2024-12-05",
    time: "08:00 AM",
    worker: "Mike Chen",
    urgency: "Normal",
    status: "Scheduled",
    address: "123 Oak Street",
  },
  {
    id: 2,
    client: "Robert Davis",
    service: "HVAC Maintenance",
    date: "2024-12-05",
    time: "10:30 AM",
    worker: "Lisa Rodriguez",
    urgency: "High",
    status: "Scheduled",
    address: "456 Pine Avenue",
  },
  {
    id: 3,
    client: "Emily Wilson",
    service: "Electrical Installation",
    date: "2024-12-06",
    time: "02:00 PM",
    worker: "David Kim",
    urgency: "Normal",
    status: "Pending",
    address: "789 Maple Drive",
  },
]

const getUrgencyColor = (urgency: string) => {
  switch (urgency) {
    case "High":
      return "bg-red-100 text-red-800 border-red-200"
    case "Medium":
      return "bg-yellow-100 text-yellow-800 border-yellow-200"
    case "Normal":
      return "bg-green-100 text-green-800 border-green-200"
    default:
      return "bg-gray-100 text-gray-800 border-gray-200"
  }
}

export function JobsPanel() {
  const [jobs, setJobs] = useState(mockJobs)
  const [isAddJobOpen, setIsAddJobOpen] = useState(false)
  const [newJob, setNewJob] = useState({
    client: "",
    service: "",
    date: "",
    time: "",
    worker: "",
    urgency: "Normal",
    address: "",
    notes: "",
  })

  const handleAddJob = () => {
    const job = {
      id: jobs.length + 1,
      ...newJob,
      status: "Scheduled",
    }
    setJobs([...jobs, job])
    setNewJob({
      client: "",
      service: "",
      date: "",
      time: "",
      worker: "",
      urgency: "Normal",
      address: "",
      notes: "",
    })
    setIsAddJobOpen(false)
  }

  const handleCancelJob = (jobId: number) => {
    setJobs(jobs.map((job) => (job.id === jobId ? { ...job, status: "Cancelled" } : job)))
  }

  const triggerBufferReschedule = () => {
    // Logic for buffer reschedule would go here
    alert("Buffer reschedule triggered - all affected clients will be notified")
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold text-gray-900">Jobs Management</h2>
          <p className="text-gray-600">Create, manage, and track all jobs</p>
        </div>
        <div className="flex gap-2">
          <Dialog open={isAddJobOpen} onOpenChange={setIsAddJobOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Add New Job
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Add New Job</DialogTitle>
              </DialogHeader>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="client">Client Name</Label>
                  <Input
                    id="client"
                    value={newJob.client}
                    onChange={(e) => setNewJob({ ...newJob, client: e.target.value })}
                    placeholder="Enter client name"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="service">Service Type</Label>
                  <Select value={newJob.service} onValueChange={(value) => setNewJob({ ...newJob, service: value })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select service" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="plumbing">Plumbing</SelectItem>
                      <SelectItem value="hvac">HVAC</SelectItem>
                      <SelectItem value="electrical">Electrical</SelectItem>
                      <SelectItem value="maintenance">General Maintenance</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="date">Date</Label>
                  <Input
                    id="date"
                    type="date"
                    value={newJob.date}
                    onChange={(e) => setNewJob({ ...newJob, date: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="time">Time</Label>
                  <Input
                    id="time"
                    type="time"
                    value={newJob.time}
                    onChange={(e) => setNewJob({ ...newJob, time: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="worker">Assign Worker</Label>
                  <Select value={newJob.worker} onValueChange={(value) => setNewJob({ ...newJob, worker: value })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select worker" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Mike Chen">Mike Chen</SelectItem>
                      <SelectItem value="Lisa Rodriguez">Lisa Rodriguez</SelectItem>
                      <SelectItem value="David Kim">David Kim</SelectItem>
                      <SelectItem value="Anna Thompson">Anna Thompson</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="urgency">Urgency Level</Label>
                  <Select value={newJob.urgency} onValueChange={(value) => setNewJob({ ...newJob, urgency: value })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Normal">Normal</SelectItem>
                      <SelectItem value="Medium">Medium</SelectItem>
                      <SelectItem value="High">High</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="col-span-2 space-y-2">
                  <Label htmlFor="address">Address</Label>
                  <Input
                    id="address"
                    value={newJob.address}
                    onChange={(e) => setNewJob({ ...newJob, address: e.target.value })}
                    placeholder="Enter job address"
                  />
                </div>
                <div className="col-span-2 space-y-2">
                  <Label htmlFor="notes">Notes</Label>
                  <Textarea
                    id="notes"
                    value={newJob.notes}
                    onChange={(e) => setNewJob({ ...newJob, notes: e.target.value })}
                    placeholder="Additional notes or requirements"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2 mt-4">
                <Button variant="outline" onClick={() => setIsAddJobOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleAddJob}>Create Job</Button>
              </div>
            </DialogContent>
          </Dialog>
          <Button variant="outline" onClick={triggerBufferReschedule}>
            <AlertTriangle className="h-4 w-4 mr-2" />
            Buffer Reschedule
          </Button>
        </div>
      </div>

      {/* Search and Filter */}
      <Card>
        <CardContent className="p-4">
          <div className="flex gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input placeholder="Search jobs..." className="pl-10" />
              </div>
            </div>
            <Select>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="scheduled">Scheduled</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>
            <Select>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Filter by urgency" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Urgency</SelectItem>
                <SelectItem value="high">High</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="normal">Normal</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Jobs List */}
      <div className="space-y-4">
        {jobs.map((job) => (
          <Card key={job.id}>
            <CardContent className="p-6">
              <div className="flex items-start justify-between">
                <div className="flex-1 grid md:grid-cols-3 gap-4">
                  <div>
                    <h3 className="font-semibold text-lg">{job.client}</h3>
                    <p className="text-gray-600">{job.service}</p>
                    <p className="text-sm text-gray-500">{job.address}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Date & Time</p>
                    <p className="font-medium">
                      {job.date} at {job.time}
                    </p>
                    <p className="text-sm text-gray-500">Worker: {job.worker}</p>
                  </div>
                  <div className="flex flex-col gap-2">
                    <Badge className={getUrgencyColor(job.urgency)}>{job.urgency} Priority</Badge>
                    <Badge variant="outline">{job.status}</Badge>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline">
                    Edit
                  </Button>
                  <Button size="sm" variant="destructive" onClick={() => handleCancelJob(job.id)}>
                    Cancel
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
