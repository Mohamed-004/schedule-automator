"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { CheckCircle, Clock, User, MapPin, CalendarIcon, RotateCcw, X } from "lucide-react"

// This would typically come from URL params or API
const mockJobData = {
  id: 1,
  client: "Sarah Johnson",
  service: "Plumbing Repair",
  date: "December 5, 2024",
  time: "8:00 AM",
  technician: "Mike Chen",
  address: "123 Oak Street",
  estimatedDuration: "2 hours",
  status: "scheduled",
}

const availableSlots = [
  { date: "2024-12-06", time: "09:00 AM", available: true },
  { date: "2024-12-06", time: "11:00 AM", available: true },
  { date: "2024-12-06", time: "02:00 PM", available: false },
  { date: "2024-12-07", time: "08:00 AM", available: true },
  { date: "2024-12-07", time: "10:30 AM", available: true },
  { date: "2024-12-07", time: "03:00 PM", available: true },
]

export function ClientPortal() {
  const [jobStatus, setJobStatus] = useState(mockJobData.status)
  const [isRescheduleOpen, setIsRescheduleOpen] = useState(false)
  const [isCancelOpen, setIsCancelOpen] = useState(false)
  const [selectedSlot, setSelectedSlot] = useState<typeof availableSlots[0] | null>(null)
  const [cancelReason, setCancelReason] = useState("")

  const handleConfirm = () => {
    setJobStatus("confirmed")
    alert("Appointment confirmed! You'll receive a confirmation message shortly.")
  }

  const handleReschedule = () => {
    if (selectedSlot) {
      setJobStatus("rescheduled")
      setIsRescheduleOpen(false)
      alert(`Appointment rescheduled to ${selectedSlot.date} at ${selectedSlot.time}`)
    }
  }

  const handleCancel = () => {
    setJobStatus("cancelled")
    setIsCancelOpen(false)
    alert("Appointment cancelled. Our system will automatically adjust schedules.")
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-2xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Your Appointment</h1>
          <p className="text-gray-600">Review and manage your scheduled service</p>
        </div>

        {/* Job Information Card */}
        <Card className="mb-6">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg sm:text-xl">Service Details</CardTitle>
              <Badge
                className={
                  jobStatus === "confirmed"
                    ? "bg-green-100 text-green-800"
                    : jobStatus === "rescheduled"
                      ? "bg-yellow-100 text-yellow-800"
                      : jobStatus === "cancelled"
                        ? "bg-red-100 text-red-800"
                        : "bg-blue-100 text-blue-800"
                }
              >
                {jobStatus.charAt(0).toUpperCase() + jobStatus.slice(1)}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-3">
                <div>
                  <h3 className="font-semibold text-gray-900">{mockJobData.service}</h3>
                  <p className="text-gray-600">for {mockJobData.client}</p>
                </div>

                <div className="flex items-center gap-2 text-gray-600">
                  <CalendarIcon className="h-4 w-4" />
                  <span>{mockJobData.date}</span>
                </div>

                <div className="flex items-center gap-2 text-gray-600">
                  <Clock className="h-4 w-4" />
                  <span>
                    {mockJobData.time} ({mockJobData.estimatedDuration})
                  </span>
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-center gap-2 text-gray-600">
                  <User className="h-4 w-4" />
                  <span>Technician: {mockJobData.technician}</span>
                </div>

                <div className="flex items-center gap-2 text-gray-600">
                  <MapPin className="h-4 w-4" />
                  <span>{mockJobData.address}</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Action Buttons */}
        {jobStatus === "scheduled" && (
          <div className="space-y-4">
            <Button
              onClick={handleConfirm}
              className="w-full bg-green-600 hover:bg-green-700 text-white py-2 sm:py-3 text-base sm:text-lg"
            >
              <CheckCircle className="mr-2 h-4 sm:h-5 w-4 sm:w-5" />
              Confirm Appointment
            </Button>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Dialog open={isRescheduleOpen} onOpenChange={setIsRescheduleOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline" className="w-full py-2 sm:py-3">
                    <RotateCcw className="mr-2 h-4 w-4" />
                    Need to Reschedule?
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-md">
                  <DialogHeader>
                    <DialogTitle>Reschedule Appointment</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <p className="text-sm text-gray-600">Select a new time slot from the available options:</p>

                    <div className="space-y-2 max-h-60 overflow-y-auto">
                      {availableSlots.map((slot, index) => (
                        <div
                          key={index}
                          className={`p-3 border rounded-md cursor-pointer transition-colors ${
                            !slot.available
                              ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                              : selectedSlot === slot
                                ? "bg-blue-100 border-blue-300"
                                : "hover:bg-gray-50"
                          }`}
                          onClick={() => slot.available && setSelectedSlot(slot)}
                        >
                          <div className="flex justify-between items-center">
                            <div>
                              <div className="font-medium">{slot.date}</div>
                              <div className="text-sm text-gray-600">{slot.time}</div>
                            </div>
                            {!slot.available && (
                              <Badge variant="outline" className="text-xs">
                                Unavailable
                              </Badge>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="flex flex-col sm:flex-row gap-2">
                      <Button variant="outline" onClick={() => setIsRescheduleOpen(false)} className="flex-1">
                        Cancel
                      </Button>
                      <Button onClick={handleReschedule} disabled={!selectedSlot} className="flex-1">
                        Confirm Reschedule
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>

              <Dialog open={isCancelOpen} onOpenChange={setIsCancelOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline" className="w-full py-2 sm:py-3 text-red-600 border-red-200 hover:bg-red-50">
                    <X className="mr-2 h-4 w-4" />
                    Cancel Appointment
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Cancel Appointment</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <p className="text-sm text-gray-600">
                      We're sorry to see you need to cancel. This will help us improve our service.
                    </p>

                    <div className="space-y-2">
                      <Label htmlFor="reason">Reason for cancellation (optional)</Label>
                      <Textarea
                        id="reason"
                        placeholder="Let us know why you need to cancel..."
                        value={cancelReason}
                        onChange={(e) => setCancelReason(e.target.value)}
                      />
                    </div>

                    <div className="flex flex-col sm:flex-row gap-2">
                      <Button variant="outline" onClick={() => setIsCancelOpen(false)} className="flex-1">
                        Keep Appointment
                      </Button>
                      <Button onClick={handleCancel} variant="destructive" className="flex-1">
                        Cancel Appointment
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </div>
        )}

        {/* Status Messages */}
        {jobStatus === "confirmed" && (
          <Card className="bg-green-50 border-green-200">
            <CardContent className="p-6 text-center">
              <CheckCircle className="h-12 w-12 text-green-600 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-green-900 mb-2">Appointment Confirmed!</h3>
              <p className="text-green-700">
                Thank you for confirming. We'll send you a reminder before your appointment.
              </p>
            </CardContent>
          </Card>
        )}

        {jobStatus === "rescheduled" && (
          <Card className="bg-yellow-50 border-yellow-200">
            <CardContent className="p-6 text-center">
              <RotateCcw className="h-12 w-12 text-yellow-600 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-yellow-900 mb-2">Appointment Rescheduled</h3>
              <p className="text-yellow-700">
                Your appointment has been successfully rescheduled. You'll receive a confirmation shortly.
              </p>
            </CardContent>
          </Card>
        )}

        {jobStatus === "cancelled" && (
          <Card className="bg-red-50 border-red-200">
            <CardContent className="p-6 text-center">
              <X className="h-12 w-12 text-red-600 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-red-900 mb-2">Appointment Cancelled</h3>
              <p className="text-red-700">
                Your appointment has been cancelled. Our system will automatically adjust schedules.
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
