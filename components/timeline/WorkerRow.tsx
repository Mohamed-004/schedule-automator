'use client'

import React, { useState } from 'react'
import { ChevronDown, ChevronRight, Clock, User } from 'lucide-react'
import { cn } from '@/lib/utils'
// import { WorkerTimelineData, TimelineConfig } from '@/lib/types'
import { JobBlock } from './JobBlock'
import { AvailabilityTrack } from './AvailabilityTrack'
import { SmartAssignmentModal } from './SmartAssignmentModal'

interface WorkerRowProps {
  workerData: any
  timelineConfig: any
  onJobClick?: (job: any) => void
  onJobReassign?: (job: any) => void
  isCollapsed?: boolean
  onToggleCollapse?: () => void
  className?: string
  selectedDate?: Date
}

/**
 * WorkerRow component displays worker information and their timeline of jobs
 * Left side: sticky worker info, Right side: scrollable timeline with job blocks
 */
export function WorkerRow({
  workerData,
  timelineConfig,
  onJobClick,
  onJobReassign,
  isCollapsed = false,
  onToggleCollapse,
  className,
  selectedDate = new Date()
}: WorkerRowProps) {
  const [showSmartAssignment, setShowSmartAssignment] = useState(false)
  const [selectedTimeSlot, setSelectedTimeSlot] = useState<{ startTime: string; endTime: string } | null>(null)
  
  const { worker, jobs, status, totalJobs, timeRange } = workerData
  const { hourWidth, minJobWidth, workerColumnWidth } = timelineConfig

  // Calculate timeline dimensions
  const totalHours = timeRange.end - timeRange.start
  const timelineWidth = totalHours * hourWidth

  // Generate initials for avatar
  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(part => part.charAt(0))
      .join('')
      .toUpperCase()
      .slice(0, 2)
  }

  // Status-based styling
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'busy':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200'
      case 'scheduled':
        return 'bg-blue-100 text-blue-800 border-blue-200'
      case 'available':
        return 'bg-green-100 text-green-800 border-green-200'
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  const getStatusDot = (status: string) => {
    switch (status) {
      case 'busy':
        return 'bg-yellow-500'
      case 'scheduled':
        return 'bg-blue-500'
      case 'available':
        return 'bg-green-500'
      default:
        return 'bg-gray-500'
    }
  }

  // Calculate job position and width
  const calculateJobPosition = (job: any) => {
    const jobStartHour = job.startTime.getHours() + job.startTime.getMinutes() / 60
    const position = (jobStartHour - timeRange.start) * hourWidth
    const width = Math.max((job.duration / 60) * hourWidth, minJobWidth)
    return { position, width }
  }

  // Handle availability slot click
  const handleAvailabilityClick = (timeSlot: { startTime: string; endTime: string }) => {
    setSelectedTimeSlot(timeSlot)
    setShowSmartAssignment(true)
  }

  // Handle job creation success
  const handleJobCreated = (jobData: any) => {
    setShowSmartAssignment(false)
    setSelectedTimeSlot(null)
    // Optionally refresh the timeline data here
  }

  return (
    <>
      <div className={cn('border-b border-gray-100', className)}>
        {/* Mobile: Stacked layout */}
        <div className="block lg:hidden">
          {/* Worker Header */}
          <div className="p-4 bg-white border-b border-gray-50">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-blue-500 text-white flex items-center justify-center font-medium text-sm">
                  {getInitials(worker.name)}
                </div>
                <div>
                  <h3 className="font-medium text-gray-900">{worker.name}</h3>
                  <div className="flex items-center gap-2 mt-1">
                    <div className={cn('w-2 h-2 rounded-full', getStatusDot(status))} />
                    <span className="text-sm text-gray-600 capitalize">{status}</span>
                    <span className="text-sm text-gray-400">•</span>
                    <span className="text-sm text-gray-600">{totalJobs} jobs</span>
                  </div>
                </div>
              </div>
              <button
                onClick={onToggleCollapse}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                {isCollapsed ? (
                  <ChevronRight className="w-4 h-4 text-gray-500" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-gray-500" />
                )}
              </button>
            </div>
          </div>

          {/* Timeline */}
          {!isCollapsed && (
            <div className="px-4 pb-4">
              <div className="relative h-20 bg-gray-50 rounded-lg overflow-x-auto">
                <div className="relative h-full" style={{ width: timelineWidth }}>
                  {/* Availability background blocks */}
                  <AvailabilityTrack
                    availability={workerData.availability}
                    timeRange={timeRange}
                    hourWidth={hourWidth}
                    onAvailabilityClick={handleAvailabilityClick}
                    workerId={worker.id}
                    workerName={worker.name}
                  />
                  
                  {/* Job blocks */}
                  {jobs.map((job: any) => {
                    const { position, width } = calculateJobPosition(job)
                    return (
                      <JobBlock
                        key={job.id}
                        job={job}
                        width={width}
                        left={position}
                        onClick={onJobClick}
                        onReassign={onJobReassign}
                      />
                    )
                  })}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Desktop: Side-by-side layout */}
        <div className="hidden lg:flex">
          {/* Worker Info Column */}
          <div 
            className="flex-shrink-0 bg-white border-r border-gray-100 p-4"
            style={{ width: workerColumnWidth }}
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-blue-500 text-white flex items-center justify-center font-medium text-sm">
                {getInitials(worker.name)}
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-medium text-gray-900 truncate">{worker.name}</h3>
                <div className="flex items-center gap-2 mt-1">
                  <div className={cn('w-2 h-2 rounded-full', getStatusDot(status))} />
                  <span className="text-sm text-gray-600 capitalize">{status}</span>
                  <span className="text-sm text-gray-400">•</span>
                  <span className="text-sm text-gray-600">{totalJobs} jobs</span>
                </div>
              </div>
            </div>
          </div>

          {/* Timeline Column */}
          <div className="flex-1 relative overflow-x-auto">
            <div className="relative h-20" style={{ width: timelineWidth, minWidth: '100%' }}>
              {/* Availability background blocks */}
              <AvailabilityTrack
                availability={workerData.availability}
                timeRange={timeRange}
                hourWidth={hourWidth}
                onAvailabilityClick={handleAvailabilityClick}
                workerId={worker.id}
                workerName={worker.name}
              />
              
              {/* Job blocks */}
              {jobs.map((job: any) => {
                const { position, width } = calculateJobPosition(job)
                return (
                  <JobBlock
                    key={job.id}
                    job={job}
                    width={width}
                    left={position}
                    onClick={onJobClick}
                    onReassign={onJobReassign}
                  />
                )
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Smart Assignment Modal */}
      {showSmartAssignment && selectedTimeSlot && (
        <SmartAssignmentModal
          isOpen={showSmartAssignment}
          onClose={() => {
            setShowSmartAssignment(false)
            setSelectedTimeSlot(null)
          }}
          workerId={worker.id}
          workerName={worker.name}
          selectedDate={selectedDate}
          selectedTimeSlot={selectedTimeSlot}
          onJobCreated={handleJobCreated}
        />
      )}
    </>
  )
} 