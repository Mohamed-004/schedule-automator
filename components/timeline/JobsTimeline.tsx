'use client'

import React, { useState, useMemo } from 'react'
import { cn } from '@/lib/utils'
import { WorkerCard } from './WorkerCard'
import { TimelineHeader } from './TimelineHeader'
import { TimelineModal } from './TimelineModal'
import { WorkerTimelineData, TimelineConfig } from '@/lib/types'
import { calculateUtilization, getTotalScheduledTime, getTotalAvailableTime } from './UtilizationBadge'


interface JobsTimelineProps {
  className?: string
}

/**
 * Enhanced JobsTimeline component with calendar, stats, and real-time data
 * Features: Date selection, utilization tracking, responsive design
 */
export function JobsTimeline({ className }: JobsTimelineProps) {
  const [selectedDate, setSelectedDate] = useState(new Date())
  const [selectedJob, setSelectedJob] = useState<any>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)

  // Timeline configuration
  const timelineConfig: TimelineConfig = {
    hourWidth: 60,
    minJobWidth: 40,
    workerColumnWidth: 200,
    timeRange: { startHour: 6, endHour: 20 }
  }

  // Use demo data for now (can be replaced with real data hook later)
  const workersData: WorkerTimelineData[] = [
    {
      worker: {
        id: '1',
        name: 'Ameer Gailan',
        email: 'ameer@example.com',
        phone: '+1234567890',
        skills: ['cleaning', 'maintenance'],
        hourlyRate: 25
      },
      jobs: [
        {
          id: '1',
          business_id: 'demo-business',
          client_id: 'client-1',
          worker_id: '1',
          title: 'Office Cleaning',
          description: 'Complete office cleaning service',
          status: 'scheduled',
          priority: 'high',
          scheduled_at: new Date(selectedDate.getFullYear(), selectedDate.getMonth(), selectedDate.getDate(), 9, 0).toISOString(),
          completed_at: null,
          location: 'Downtown Office',
          client_name: 'Tech Corp',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          duration: 120,
          startTime: new Date(selectedDate.getFullYear(), selectedDate.getMonth(), selectedDate.getDate(), 9, 0),
          endTime: new Date(selectedDate.getFullYear(), selectedDate.getMonth(), selectedDate.getDate(), 11, 0)
        },
        {
          id: '2',
          business_id: 'demo-business',
          client_id: 'client-2',
          worker_id: '1',
          title: 'Window Cleaning',
          description: 'Clean all storefront windows',
          status: 'in_progress',
          priority: 'medium',
          scheduled_at: new Date(selectedDate.getFullYear(), selectedDate.getMonth(), selectedDate.getDate(), 14, 0).toISOString(),
          completed_at: null,
          location: 'Shopping Mall',
          client_name: 'Retail Store',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          duration: 90,
          startTime: new Date(selectedDate.getFullYear(), selectedDate.getMonth(), selectedDate.getDate(), 14, 0),
          endTime: new Date(selectedDate.getFullYear(), selectedDate.getMonth(), selectedDate.getDate(), 15, 30)
        }
      ],
      status: 'busy',
      totalJobs: 2,
      timeRange: { start: 6, end: 20 },
      availability: [
        { start: '06:00', end: '20:00', type: 'available' }
      ]
    },
    {
      worker: {
        id: '2',
        name: 'Test Worker',
        email: 'test@example.com',
        phone: '+1234567891',
        skills: ['maintenance'],
        hourlyRate: 20
      },
      jobs: [
        {
          id: '3',
          business_id: 'demo-business',
          client_id: 'client-3',
          worker_id: '2',
          title: 'Maintenance Check',
          description: 'Routine maintenance inspection',
          status: 'completed',
          priority: 'low',
          scheduled_at: new Date(selectedDate.getFullYear(), selectedDate.getMonth(), selectedDate.getDate(), 10, 30).toISOString(),
          completed_at: new Date(selectedDate.getFullYear(), selectedDate.getMonth(), selectedDate.getDate(), 11, 30).toISOString(),
          location: 'Apartment Complex',
          client_name: 'Property Co',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          duration: 60,
          startTime: new Date(selectedDate.getFullYear(), selectedDate.getMonth(), selectedDate.getDate(), 10, 30),
          endTime: new Date(selectedDate.getFullYear(), selectedDate.getMonth(), selectedDate.getDate(), 11, 30)
        }
      ],
      status: 'scheduled',
      totalJobs: 1,
      timeRange: { start: 6, end: 20 },
      availability: [
        { start: '08:00', end: '17:00', type: 'available' }
      ]
    },
    {
      worker: {
        id: '3',
        name: 'Part Time Worker',
        email: 'parttime@example.com',
        phone: '+1234567892',
        skills: ['cleaning'],
        hourlyRate: 18
      },
      jobs: [],
      status: 'available',
      totalJobs: 0,
      timeRange: { start: 6, end: 20 },
      availability: [
        { start: '12:00', end: '18:00', type: 'available' }
      ]
    }
  ]

  // Calculate comprehensive stats
  const stats = useMemo(() => {
    const allJobs = workersData.flatMap(w => w.jobs)
    const totalJobs = allJobs.length
    const completedJobs = allJobs.filter(j => j.status === 'completed').length
    const remainingJobs = totalJobs - completedJobs
    const totalWorkers = workersData.length

    // Calculate total scheduled and available hours
    let totalScheduledMinutes = 0
    let totalAvailableMinutes = 0
    
    workersData.forEach(workerData => {
      totalScheduledMinutes += getTotalScheduledTime(workerData.jobs)
      totalAvailableMinutes += getTotalAvailableTime(workerData.availability)
    })

    const totalScheduledHours = totalScheduledMinutes / 60
    const totalAvailableHours = totalAvailableMinutes / 60
    
    // Calculate average utilization
    const utilizationPercentages = workersData.map(workerData => {
      const scheduledMinutes = getTotalScheduledTime(workerData.jobs)
      const availableMinutes = getTotalAvailableTime(workerData.availability)
      return calculateUtilization(scheduledMinutes, availableMinutes)
    })
    
    const averageUtilization = utilizationPercentages.length > 0
      ? utilizationPercentages.reduce((sum, util) => sum + util, 0) / utilizationPercentages.length
      : 0

    return {
      totalJobs,
      completedJobs,
      remainingJobs,
      totalWorkers,
      averageUtilization,
      totalScheduledHours,
      totalAvailableHours
    }
  }, [workersData])

  // Handle job interactions
  const handleJobClick = (job: any) => {
    setSelectedJob(job)
    setIsModalOpen(true)
  }

  const handleJobReassign = (job: any) => {
    // TODO: Implement job reassignment logic
    console.log('Reassigning job:', job)
  }

  const handleModalClose = () => {
    setIsModalOpen(false)
    setSelectedJob(null)
  }

  return (
    <div className={cn('flex flex-col h-full bg-gray-50', className)}>
      {/* Enhanced Header with Calendar and Stats */}
      <TimelineHeader
        selectedDate={selectedDate}
        onDateChange={setSelectedDate}
        stats={stats}
      />

      {/* Timeline Content */}
      <div className="flex-1 overflow-auto">
        <div className="p-4 space-y-4">
          {/* Workers Timeline Cards */}
          {workersData.map(workerData => (
            <WorkerCard
              key={workerData.worker.id}
              workerData={workerData}
              timelineConfig={timelineConfig}
              onJobClick={handleJobClick}
              onJobReassign={handleJobReassign}
            />
          ))}

          {/* Empty State */}
          {workersData.length === 0 && (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="w-16 h-16 bg-gray-200 rounded-full flex items-center justify-center mb-4">
                <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4" />
                </svg>
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">No Workers Available</h3>
              <p className="text-gray-500 max-w-sm">
                Add workers to your team to start scheduling jobs and managing your timeline.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Job Details Modal */}
      {selectedJob && (
        <TimelineModal
          job={selectedJob}
          isOpen={isModalOpen}
          onClose={handleModalClose}
          onEdit={(job) => {
            console.log('Editing job:', job)
            handleModalClose()
          }}
          onReassign={(job) => {
            handleJobReassign(job)
            handleModalClose()
          }}
          onCancel={(job) => {
            console.log('Cancelling job:', job)
            handleModalClose()
          }}
        />
      )}
    </div>
  )
} 