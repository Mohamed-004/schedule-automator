'use client'

import React, { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Calendar, Clock, User, Zap } from 'lucide-react'
import { SmartAssignmentModal } from '@/components/timeline/SmartAssignmentModal'
import { format } from 'date-fns'

/**
 * Test page for Smart Assignment functionality
 * Demonstrates clickable available slots with full job assignment interface
 */
export default function TestSmartAssignmentPage() {
  const [showModal, setShowModal] = useState(false)
  const [selectedSlot, setSelectedSlot] = useState<{ startTime: string; endTime: string } | null>(null)

  // Mock data for testing
  const mockWorker = {
    id: '1b46dfc1-3dfa-4036-8d05-2a9218fc6524',
    name: 'John Smith'
  }

  const availableSlots = [
    { startTime: '09:00', endTime: '11:00', label: 'Morning Slot' },
    { startTime: '13:00', endTime: '15:00', label: 'Afternoon Slot' },
    { startTime: '16:00', endTime: '18:00', label: 'Evening Slot' }
  ]

  const handleSlotClick = (slot: { startTime: string; endTime: string }) => {
    setSelectedSlot(slot)
    setShowModal(true)
  }

  const handleJobCreated = (jobData: any) => {
    console.log('Job created:', jobData)
    setShowModal(false)
    setSelectedSlot(null)
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="text-center">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Smart Assignment Demo
          </h1>
          <p className="text-gray-600">
            Click on any available time slot to create and assign a job instantly
          </p>
        </div>

        {/* Demo Card */}
        <Card className="border-2 border-blue-200 bg-blue-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-blue-800">
              <Zap className="w-5 h-5" />
              Interactive Timeline Demo
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {/* Worker Info */}
              <div className="flex items-center gap-3 p-3 bg-white rounded-lg border">
                <div className="w-10 h-10 rounded-full bg-blue-500 text-white flex items-center justify-center font-medium">
                  JS
                </div>
                <div>
                  <h3 className="font-medium text-gray-900">{mockWorker.name}</h3>
                  <p className="text-sm text-gray-600">Available for assignment</p>
                </div>
                <Badge className="ml-auto bg-emerald-100 text-emerald-800 border-emerald-200">
                  <div className="w-2 h-2 bg-emerald-500 rounded-full mr-2"></div>
                  Available
                </Badge>
              </div>

              {/* Date Context */}
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Calendar className="w-4 h-4" />
                <span>Today - {format(new Date(), 'EEEE, MMMM d, yyyy')}</span>
              </div>

              {/* Available Time Slots */}
              <div className="space-y-2">
                <h4 className="font-medium text-gray-900 flex items-center gap-2">
                  <Clock className="w-4 h-4" />
                  Available Time Slots
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {availableSlots.map((slot, index) => (
                    <Button
                      key={index}
                      variant="outline"
                      className="h-auto p-4 border-2 border-emerald-200 bg-emerald-50 hover:bg-emerald-100 hover:border-emerald-300 transition-all duration-200"
                      onClick={() => handleSlotClick(slot)}
                    >
                      <div className="text-center">
                        <div className="font-medium text-emerald-800">
                          {slot.label}
                        </div>
                        <div className="text-sm text-emerald-600 mt-1">
                          {slot.startTime} - {slot.endTime}
                        </div>
                        <div className="text-xs text-emerald-500 mt-2 opacity-75">
                          Click to assign job
                        </div>
                      </div>
                    </Button>
                  ))}
                </div>
              </div>

              {/* Instructions */}
              <div className="bg-blue-100 border border-blue-200 rounded-lg p-4">
                <h4 className="font-medium text-blue-800 mb-2">How it works:</h4>
                <ol className="text-sm text-blue-700 space-y-1 list-decimal list-inside">
                  <li>Click on any available time slot above</li>
                  <li>The Smart Assignment Modal will open with pre-filled context</li>
                  <li>Fill in job details (title, client, description, tasks)</li>
                  <li>Submit to create and assign the job instantly</li>
                </ol>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Features Overview */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Smart Pre-filling</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="text-sm text-gray-600 space-y-2">
                <li>• Worker automatically selected</li>
                <li>• Date and time pre-filled from slot</li>
                <li>• Duration calculated from slot length</li>
                <li>• Context-aware suggestions</li>
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Full Assignment Interface</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="text-sm text-gray-600 space-y-2">
                <li>• Complete job creation form</li>
                <li>• Client selection with search</li>
                <li>• Work items checklist</li>
                <li>• Real-time validation</li>
              </ul>
            </CardContent>
          </Card>
        </div>

        {/* Technical Details */}
        <Card className="border-gray-200">
          <CardHeader>
            <CardTitle className="text-lg text-gray-800">Technical Implementation</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-sm text-gray-600 space-y-2">
              <p><strong>Components:</strong> SmartAssignmentModal, EmbeddedAssignmentForm, AvailabilityTrack</p>
              <p><strong>Features:</strong> Context-aware pre-filling, inline job creation, real-time validation</p>
              <p><strong>Integration:</strong> Works with existing timeline components (WorkerRow, WorkerCard, TimelineGrid)</p>
              <p><strong>API:</strong> Uses existing /api/jobs and /api/clients endpoints</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Smart Assignment Modal */}
      {showModal && selectedSlot && (
        <SmartAssignmentModal
          isOpen={showModal}
          onClose={() => {
            setShowModal(false)
            setSelectedSlot(null)
          }}
          workerId={mockWorker.id}
          workerName={mockWorker.name}
          selectedDate={new Date()}
          selectedTimeSlot={selectedSlot}
          onJobCreated={handleJobCreated}
        />
      )}
    </div>
  )
} 