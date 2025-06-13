'use client'

import React, { useState } from 'react'
import { addDays, subDays } from 'date-fns'
import { TimelineSchedulerGrid } from '@/components/jobs/TimelineSchedulerGrid'

// Sample data that demonstrates the grid system capabilities
const sampleJobs = [
  {
    id: '1',
    title: 'Kitchen Renovation',
    client_name: 'John Smith',
    worker_id: 'worker-1',
    scheduled_at: new Date().setHours(8, 30, 0, 0).toString(),
    duration: 120, // 2 hours
    duration_hours: 2,
    status: 'scheduled' as const,
    priority: 'high' as const,
    location: '123 Main St',
    notes: 'Bring extra tools'
  },
  {
    id: '2',
    title: 'Bathroom Plumbing',
    client_name: 'Jane Doe',
    worker_id: 'worker-1',
    scheduled_at: new Date().setHours(11, 0, 0, 0).toString(),
    duration: 90, // 1.5 hours
    duration_hours: 1.5,
    status: 'in_progress' as const,
    priority: 'urgent' as const,
    location: '456 Oak Ave'
  },
  {
    id: '3',
    title: 'Electrical Inspection',
    client_name: 'Bob Wilson',
    worker_id: 'worker-2',
    scheduled_at: new Date().setHours(9, 15, 0, 0).toString(),
    duration: 45, // 45 minutes
    duration_hours: 0.75,
    status: 'completed' as const,
    priority: 'medium' as const,
    location: '789 Pine St'
  },
  {
    id: '4',
    title: 'HVAC Maintenance',
    client_name: 'Alice Brown',
    worker_id: 'worker-2',
    scheduled_at: new Date().setHours(14, 30, 0, 0).toString(),
    duration: 180, // 3 hours
    duration_hours: 3,
    status: 'scheduled' as const,
    priority: 'low' as const,
    location: '321 Elm St'
  },
  {
    id: '5',
    title: 'Emergency Repair',
    client_name: 'Mike Davis',
    worker_id: 'worker-3',
    scheduled_at: new Date().setHours(6, 0, 0, 0).toString(),
    duration: 60, // 1 hour
    duration_hours: 1,
    status: 'scheduled' as const,
    priority: 'urgent' as const,
    location: '654 Maple Dr',
    notes: 'Early morning emergency call'
  },
  {
    id: '6',
    title: 'Routine Maintenance',
    client_name: 'Sarah Johnson',
    worker_id: 'worker-3',
    scheduled_at: new Date().setHours(16, 45, 0, 0).toString(),
    duration: 75, // 1.25 hours
    duration_hours: 1.25,
    status: 'scheduled' as const,
    priority: 'low' as const,
    location: '987 Cedar Ln'
  },
  {
    id: '7',
    title: 'Conflicting Job A',
    client_name: 'Test Client A',
    worker_id: 'worker-1',
    scheduled_at: new Date().setHours(10, 30, 0, 0).toString(),
    duration: 90, // Overlaps with job 2
    duration_hours: 1.5,
    status: 'scheduled' as const,
    priority: 'medium' as const,
    location: 'Conflict Test'
  }
]

const sampleWorkers = [
  {
    id: 'worker-1',
    name: 'Alex Thompson',
    role: 'Senior Technician',
    status: 'available' as const,
    working_hours: [
      { start: '08:00', end: '17:00', day: undefined } // Monday to Friday
    ],
    skills: ['Plumbing', 'Electrical', 'HVAC']
  },
  {
    id: 'worker-2',
    name: 'Maria Garcia',
    role: 'Electrical Specialist',
    status: 'busy' as const,
    working_hours: [
      { start: '09:00', end: '18:00', day: undefined }
    ],
    skills: ['Electrical', 'Lighting', 'Safety Inspections']
  },
  {
    id: 'worker-3',
    name: 'David Chen',
    role: 'Emergency Response',
    status: 'available' as const,
    working_hours: [
      { start: '06:00', end: '22:00', day: undefined } // Extended hours for emergencies
    ],
    skills: ['Emergency Repair', 'General Maintenance', 'Customer Service']
  },
  {
    id: 'worker-4',
    name: 'Lisa Anderson',
    role: 'HVAC Specialist',
    status: 'offline' as const,
    working_hours: [
      { start: '07:30', end: '16:30', day: undefined }
    ],
    skills: ['HVAC', 'Ventilation', 'Climate Control']
  }
]

export default function TimelineGridDemo() {
  const [selectedDate, setSelectedDate] = useState(new Date())
  const [viewMode, setViewMode] = useState<'day' | 'week'>('day')

  const handleJobUpdate = (jobId: string, updates: any) => {
    console.log('Job update:', jobId, updates)
    // In a real app, this would update the job in your state/database
  }

  const handleJobMove = (jobId: string, newWorkerId: string | null, newTime: Date) => {
    console.log('Job move:', jobId, 'to worker:', newWorkerId, 'at time:', newTime)
    // In a real app, this would move the job to the new time/worker
  }

  return (
    <div className="h-screen flex flex-col bg-gray-50">
      {/* Demo Header */}
      <div className="bg-white border-b border-gray-200 p-4">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            Grid-Based Timeline Scheduler Demo
          </h1>
          <p className="text-gray-600 mb-4">
            Demonstrating perfect grid alignment, 24-hour coverage, conflict detection, and accurate utilization calculations.
          </p>
          
          {/* Demo Features */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
            <div className="bg-green-50 p-3 rounded-lg border border-green-200">
              <h3 className="font-medium text-green-800">✓ Perfect Grid Alignment</h3>
              <p className="text-green-600">All elements snap to 15-minute boundaries</p>
            </div>
            <div className="bg-blue-50 p-3 rounded-lg border border-blue-200">
              <h3 className="font-medium text-blue-800">✓ 24-Hour Coverage</h3>
              <p className="text-blue-600">Handles early shifts (6 AM) to late shifts (10 PM)</p>
            </div>
            <div className="bg-orange-50 p-3 rounded-lg border border-orange-200">
              <h3 className="font-medium text-orange-800">✓ Conflict Detection</h3>
              <p className="text-orange-600">Automatically detects overlapping jobs</p>
            </div>
            <div className="bg-purple-50 p-3 rounded-lg border border-purple-200">
              <h3 className="font-medium text-purple-800">✓ Accurate Utilization</h3>
              <p className="text-purple-600">Real-time worker utilization calculations</p>
            </div>
          </div>
        </div>
      </div>

      {/* Timeline */}
      <div className="flex-1 overflow-hidden">
        <TimelineSchedulerGrid
          jobs={sampleJobs}
          workers={sampleWorkers}
          selectedDate={selectedDate}
          viewMode={viewMode}
          onDateChange={setSelectedDate}
          onViewModeChange={setViewMode}
          onJobUpdate={handleJobUpdate}
          onJobMove={handleJobMove}
        />
      </div>

      {/* Demo Instructions */}
      <div className="bg-white border-t border-gray-200 p-4">
        <div className="max-w-7xl mx-auto">
          <h3 className="font-medium text-gray-900 mb-2">Demo Instructions:</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-gray-600">
            <div>
              <strong>Grid System:</strong> Notice how all job cards and availability blocks are perfectly aligned to the vertical grid lines. Everything snaps to 15-minute boundaries.
            </div>
            <div>
              <strong>Worker Schedules:</strong> David Chen works 6 AM - 10 PM (emergency response), while others have standard hours. The grid accommodates all schedules.
            </div>
            <div>
              <strong>Conflicts:</strong> Job #7 "Conflicting Job A" overlaps with "Bathroom Plumbing" - both are highlighted with red conflict indicators.
            </div>
          </div>
        </div>
      </div>
    </div>
  )
} 