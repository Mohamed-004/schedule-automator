'use client'

import React, { useState } from 'react'
import { SegmentAvailability } from './SegmentAvailability'
import { SegmentTimelineHeader } from './SegmentTimelineHeader'
import { UnifiedTimelineRow } from './UnifiedTimelineSegment'
import { generateHourLabels, TimeRange } from '@/lib/timeline-grid'
import { useTimelineCoordinates } from '@/hooks/use-timeline-coordinates'

/**
 * Demo component to showcase the new segment-based availability system
 * This demonstrates how availability blocks are now connected to actual time segments
 */
export function SegmentAvailabilityDemo() {
  const [selectedDate] = useState(new Date())
  
  // Demo time range
  const timeRange: TimeRange = {
    startHour: 8,
    endHour: 18,
    totalHours: 10
  }
  
  const coordinates = useTimelineCoordinates(timeRange)
  const hourLabels = generateHourLabels(timeRange)
  
  // Demo workers with different availability patterns
  const demoWorkers = [
    {
      id: '1',
      name: 'Ameer Gailan',
      email: 'ameer@example.com',
      status: 'available' as const,
      working_hours: [
        { start: '12:00', end: '23:00', day: 0 } // 12 AM to 11 PM (23 hours)
      ]
    },
    {
      id: '2', 
      name: 'Test Worker',
      email: 'test@example.com',
      status: 'available' as const,
      working_hours: [
        { start: '09:15', end: '17:00', day: 0 } // 9:15 AM to 5 PM
      ]
    },
    {
      id: '3',
      name: 'Part Time Worker',
      email: 'parttime@example.com', 
      status: 'busy' as const,
      working_hours: [
        { start: '10:00', end: '14:00', day: 0 } // 10 AM to 2 PM
      ]
    }
  ]

  // Demo jobs to show job integration
  const demoJobs = [
    {
      id: '1',
      title: 'Plumbing Repair',
      client_name: 'John Smith',
      location: '123 Main St',
      scheduled_at: new Date(selectedDate.getFullYear(), selectedDate.getMonth(), selectedDate.getDate(), 10, 30).toISOString(),
      duration: 120, // 2 hours
      status: 'in_progress' as const,
      priority: 'high' as const,
      worker_id: '1'
    },
    {
      id: '2',
      title: 'Kitchen Installation',
      client_name: 'Jane Doe',
      scheduled_at: new Date(selectedDate.getFullYear(), selectedDate.getMonth(), selectedDate.getDate(), 14, 0).toISOString(),
      duration: 180, // 3 hours
      status: 'pending' as const,
      priority: 'medium' as const,
      worker_id: '2'
    },
    {
      id: '3',
      title: 'Maintenance Check',
      client_name: 'Bob Wilson',
      scheduled_at: new Date(selectedDate.getFullYear(), selectedDate.getMonth(), selectedDate.getDate(), 11, 0).toISOString(),
      duration: 60, // 1 hour
      status: 'completed' as const,
      priority: 'low' as const,
      worker_id: '3'
    }
  ]

  const handleSegmentClick = (workerId: string, hour: number) => {
    console.log(`Clicked segment: Worker ${workerId}, Hour ${hour}:00`)
  }

  const handleJobClick = (job: any) => {
    console.log(`Clicked job: ${job.title}`)
  }

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            Unified Segment-Based Timeline System Demo
          </h1>
          <p className="text-gray-600">
            This demonstrates the new unified segment architecture where header labels, availability blocks, and jobs 
            are all connected within the same timeline segments. No more width calculations or floating elements!
          </p>
        </div>

        <div className="bg-white rounded-lg border overflow-hidden">
          <div className="p-6">
                         <div style={{ width: coordinates.hourWidth * timeRange.totalHours, minHeight: demoWorkers.length * 120 }}>
              {/* Segment-Based Timeline Header */}
              <SegmentTimelineHeader 
                timeRange={timeRange}
                className="mb-4"
                showBusinessHours={true}
              />

              {/* Unified Timeline Rows - Header, Availability, and Jobs all connected */}
              <div className="relative">
                {demoWorkers.map((worker, index) => (
                  <div
                    key={worker.id}
                    className="relative border-b border-gray-100 hover:bg-gray-50 transition-colors"
                    style={{ 
                      height: 120,
                      top: index * 120
                    }}
                  >
                    {/* Worker Info */}
                    <div 
                      className="absolute left-0 top-0 h-full bg-white border-r border-gray-200 p-4 flex flex-col justify-center z-20"
                      style={{ width: coordinates.workerColumnWidth }}
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                          <span className="text-blue-600 font-semibold">
                            {worker.name.split(' ').map(n => n[0]).join('')}
                          </span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="font-medium text-gray-900 truncate">
                            {worker.name}
                          </h3>
                          <div className="text-sm text-gray-600 mt-1">
                            {worker.working_hours[0]?.start} - {worker.working_hours[0]?.end}
                          </div>
                          <div className={`text-xs font-medium mt-1 px-2 py-1 rounded-full w-fit ${
                            worker.status === 'available' ? 'text-green-700 bg-green-100' :
                            worker.status === 'busy' ? 'text-yellow-700 bg-yellow-100' :
                            'text-red-700 bg-red-100'
                          }`}>
                            {worker.status}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Unified Timeline Row - Contains availability AND jobs in connected segments */}
                    <UnifiedTimelineRow
                      worker={worker}
                      timeRange={timeRange}
                      jobs={demoJobs}
                      selectedDate={selectedDate}
                      onSegmentClick={handleSegmentClick}
                      onJobClick={handleJobClick}
                      className="z-10"
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Explanation */}
        <div className="mt-6 bg-blue-50 rounded-lg border border-blue-200 p-6">
          <h3 className="font-medium text-blue-900 mb-3">How the Unified Segment System Works</h3>
          <div className="space-y-2 text-sm text-blue-800">
            <p>• <strong>Unified Architecture:</strong> Header labels, availability blocks, and jobs all exist within the same connected segments</p>
            <p>• <strong>No Width Dependencies:</strong> Everything is positioned by segment relationships, not pixel calculations</p>
            <p>• <strong>Perfect Alignment:</strong> Header 8 AM aligns exactly with availability and jobs in the 8 AM segment</p>
            <p>• <strong>Connected Layers:</strong> Each segment contains multiple layers (header, availability, jobs) that work together</p>
            <p>• <strong>Interactive Segments:</strong> Click on any segment to interact with that specific time slot and see all its content</p>
            <p>• <strong>Responsive Design:</strong> All segments scale together maintaining perfect alignment across screen sizes</p>
          </div>
        </div>

        {/* Legend */}
        <div className="mt-4 bg-white rounded-lg border p-4">
          <h3 className="font-medium text-gray-900 mb-3">Legend</h3>
          <div className="flex flex-wrap gap-6 text-sm">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-green-100/70 border border-green-300/50 rounded"></div>
              <div className="w-4 h-1 bg-green-500"></div>
              <span className="text-gray-600">Available Segments</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-yellow-100/70 border border-yellow-300/50 rounded"></div>
              <div className="w-4 h-1 bg-yellow-500"></div>
              <span className="text-gray-600">Busy Segments</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-red-100/70 border border-red-300/50 rounded"></div>
              <div className="w-4 h-1 bg-red-500"></div>
              <span className="text-gray-600">Offline Segments</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-blue-50/20 border border-gray-200 rounded"></div>
              <span className="text-gray-600">Business Hours</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
} 