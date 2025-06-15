'use client'

import React, { useState } from 'react'
import { ChevronDown, ChevronRight, Clock } from 'lucide-react'
import { cn } from '@/lib/utils'
import { JobBlock } from './JobBlock'
import { AvailabilityTrack } from './AvailabilityTrack'
import { SmartAssignmentModal } from './SmartAssignmentModal'
import { UtilizationBadge, calculateUtilization, getTotalScheduledTime, getTotalAvailableTime } from './UtilizationBadge'

interface WorkerCardProps {
  workerData: any
  timelineConfig: any
  onJobClick?: (job: any) => void
  onJobReassign?: (job: any) => void
  className?: string
  selectedDate?: Date
}

/**
 * WorkerCard component with unified stacked layout for all screen sizes
 * Shows worker info above timeline consistently
 */
export function WorkerCard({
  workerData,
  timelineConfig,
  onJobClick,
  onJobReassign,
  className,
  selectedDate = new Date()
}: WorkerCardProps) {
  const { worker, jobs, status, totalJobs, timeRange, availability } = workerData
  const { hourWidth, minJobWidth } = timelineConfig
  const [isExpanded, setIsExpanded] = useState(true)
  const [showSmartAssignment, setShowSmartAssignment] = useState(false)
  const [selectedTimeSlot, setSelectedTimeSlot] = useState<{ startTime: string; endTime: string } | null>(null)

  // Calculate timeline dimensions
  const totalHours = timeRange.end - timeRange.start
  const timelineWidth = totalHours * hourWidth

  // Calculate utilization
  const scheduledMinutes = getTotalScheduledTime(jobs)
  const availableMinutes = getTotalAvailableTime(availability)
  const utilizationPercentage = calculateUtilization(scheduledMinutes, availableMinutes)

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

  // Format working hours display
  const formatWorkingHours = () => {
    if (!availability || availability.length === 0) {
      return 'No schedule'
    }
    const firstSlot = availability[0]
    return `${firstSlot.start} - ${firstSlot.end}`
  }

  // Get remaining capacity
  const getRemainingCapacity = () => {
    if (availableMinutes === 0) return 'No availability'
    const remainingMinutes = availableMinutes - scheduledMinutes
    if (remainingMinutes <= 0) return 'Fully booked'
    
    const hours = Math.floor(remainingMinutes / 60)
    const minutes = remainingMinutes % 60
    
    if (hours > 0) {
      return minutes > 0 ? `${hours}h ${minutes}m available` : `${hours}h available`
    }
    return `${minutes}m available`
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
      <div className={cn('bg-white border border-gray-200 rounded-lg overflow-hidden', className)}>
        {/* Worker Information Header */}
        <div className="p-4 border-b border-gray-100">
          <div className="flex items-start gap-3">
            {/* Avatar */}
            <div className="w-12 h-12 rounded-full bg-blue-500 text-white flex items-center justify-center font-medium text-sm flex-shrink-0">
              {getInitials(worker.name)}
            </div>

            {/* Worker Details */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-lg text-gray-900 truncate">{worker.name}</h3>
                <button
                  onClick={() => setIsExpanded(!isExpanded)}
                  className="p-1 hover:bg-gray-100 rounded transition-colors"
                >
                  {isExpanded ? (
                    <ChevronDown className="w-4 h-4 text-gray-500" />
                  ) : (
                    <ChevronRight className="w-4 h-4 text-gray-500" />
                  )}
                </button>
              </div>
              
              <div className="flex items-center gap-2 mt-1">
                <div className={cn('w-2 h-2 rounded-full', getStatusDot(status))} />
                <span className="text-sm text-gray-600 capitalize">{status}</span>
                <span className="text-sm text-gray-400">•</span>
                <span className="text-sm text-gray-600">{totalJobs} jobs</span>
              </div>

              <div className="flex items-center gap-4 mt-2">
                <div className="flex items-center gap-1 text-sm text-gray-600">
                  <Clock className="w-3 h-3" />
                  <span>{formatWorkingHours()}</span>
                </div>
                <UtilizationBadge percentage={utilizationPercentage} />
              </div>

              <div className="mt-2">
                <span className="text-sm text-gray-500">{getRemainingCapacity()}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Timeline Section */}
        {isExpanded && (
          <div className="p-4">
            <div 
              className="relative h-20 bg-gray-50 rounded-lg overflow-x-auto"
              style={{ minWidth: '100%' }}
            >
              <div 
                className="relative h-full"
                style={{ width: Math.max(timelineWidth, 400) }}
              >
                {/* Availability background blocks */}
                <AvailabilityTrack
                  availability={availability}
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

                {/* Empty state when no jobs */}
                {jobs.length === 0 && (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="text-center text-gray-500">
                      <div className="text-sm">No jobs scheduled</div>
                      <div className="text-xs mt-1 opacity-75">
                        {availableMinutes > 0 ? 'Fully available' : 'No availability set'}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Timeline legend (optional) */}
            <div className="flex items-center gap-4 mt-3 text-xs text-gray-500">
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 bg-green-100 border border-green-200 rounded" />
                <span>Available</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 bg-gray-200 rounded" />
                <span>Unavailable</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 bg-blue-100 border border-blue-300 rounded" />
                <span>Scheduled</span>
              </div>
            </div>
          </div>
        )}
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