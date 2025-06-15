'use client'

import React, { useState } from 'react'
import { ChevronDown, ChevronRight, Clock } from 'lucide-react'
import { cn } from '@/lib/utils'
import { WorkerTimelineData, TimelineConfig } from '@/lib/types'
import { JobBlock } from './JobBlock'
import { AvailabilityTrack } from './AvailabilityTrack'
import { UtilizationBadge, calculateUtilization, getTotalScheduledTime, getTotalAvailableTime } from './UtilizationBadge'

interface WorkerCardProps {
  workerData: WorkerTimelineData
  timelineConfig: TimelineConfig
  onJobClick?: (job: any) => void
  onJobReassign?: (job: any) => void
  className?: string
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
  className
}: WorkerCardProps) {
  const { worker, jobs, status, totalJobs, timeRange, availability } = workerData
  const { hourWidth, minJobWidth } = timelineConfig
  const [isExpanded, setIsExpanded] = useState(true)

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

  return (
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
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                <h3 className="text-lg font-semibold text-gray-900 truncate">
                  {worker.name}
                </h3>
                <div className="flex items-center gap-2 mt-1 text-sm text-gray-600">
                  <div className={cn('w-2 h-2 rounded-full', getStatusDot(status))} />
                  <span className="capitalize">{status}</span>
                  <Clock className="h-3 w-3 text-gray-400 ml-1" />
                  <span>{formatWorkingHours()}</span>
                </div>
              </div>

              {/* Utilization Badge */}
              <UtilizationBadge 
                percentage={utilizationPercentage}
                size="md"
                showLabel={true}
                className="flex-shrink-0"
              />
            </div>

            {/* Job Count and Capacity */}
            <div className="flex items-center justify-between mt-2">
              <button
                onClick={() => setIsExpanded(!isExpanded)}
                className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 transition-colors"
              >
                <span>{totalJobs} jobs today</span>
                {isExpanded ? (
                  <ChevronDown className="h-3 w-3" />
                ) : (
                  <ChevronRight className="h-3 w-3" />
                )}
              </button>

              <span className="text-xs text-gray-500">
                {getRemainingCapacity()}
              </span>
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
              />
              
              {/* Job blocks */}
              {jobs.map(job => {
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
          {jobs.length > 0 && (
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
          )}
        </div>
      )}
    </div>
  )
} 