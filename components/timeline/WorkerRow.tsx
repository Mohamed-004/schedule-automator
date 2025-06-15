'use client'

import React, { useState } from 'react'
import { ChevronDown, ChevronRight, Clock, User } from 'lucide-react'
import { cn } from '@/lib/utils'
import { WorkerTimelineData, TimelineConfig } from '@/lib/types'
import { JobBlock } from './JobBlock'
import { AvailabilityTrack } from './AvailabilityTrack'

interface WorkerRowProps {
  workerData: WorkerTimelineData
  timelineConfig: TimelineConfig
  onJobClick?: (job: any) => void
  onJobReassign?: (job: any) => void
  isCollapsed?: boolean
  onToggleCollapse?: () => void
  className?: string
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
  className
}: WorkerRowProps) {
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

  // Format working hours display
  const formatWorkingHours = () => {
    return `${String(timeRange.start).padStart(2, '0')}:00 - ${String(timeRange.end).padStart(2, '0')}:00`
  }

  return (
    <div className={cn('border-b border-gray-200 bg-white', className)}>
      {/* Mobile: Collapsible worker card */}
      <div className="md:hidden">
        <button
          className="w-full p-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
          onClick={onToggleCollapse}
        >
          <div className="flex items-center gap-3">
            {/* Avatar */}
            <div className="w-10 h-10 rounded-full bg-blue-500 text-white flex items-center justify-center font-medium text-sm">
              {getInitials(worker.name)}
            </div>
            
            {/* Worker Info */}
            <div className="flex-1 text-left">
              <h3 className="text-lg font-semibold text-gray-900">{worker.name}</h3>
              <div className="flex items-center gap-2 text-sm text-gray-600 mt-1">
                <div className={cn('w-2 h-2 rounded-full', getStatusDot(status))} />
                <span className="capitalize">{status}</span>
                <Clock className="h-3 w-3 ml-1" />
                <span>{formatWorkingHours()}</span>
              </div>
            </div>

            {/* Jobs count and expand button */}
            <div className="flex items-center gap-2">
              <button className="flex items-center gap-1 text-sm text-gray-500">
                <span>{totalJobs} jobs today</span>
                {isCollapsed ? <ChevronRight className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
              </button>
            </div>
          </div>
        </button>

        {/* Mobile Timeline (when expanded) */}
        {!isCollapsed && (
          <div className="px-4 pb-4">
            <div className="relative h-20 bg-gray-50 rounded-lg overflow-x-auto">
              <div className="relative h-full" style={{ width: timelineWidth }}>
                {/* Availability background blocks */}
                <AvailabilityTrack
                  availability={workerData.availability}
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
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Desktop: Side-by-side layout */}
      <div className="hidden md:flex min-h-[80px]">
        {/* Left: Worker Info (Sticky) */}
        <div 
          className="flex-shrink-0 bg-gradient-to-r from-gray-50 to-gray-100 border-r border-gray-200 p-4 flex items-center gap-4"
          style={{ width: workerColumnWidth }}
        >
          {/* Avatar */}
          <div className="w-12 h-12 rounded-full bg-blue-500 text-white flex items-center justify-center font-medium">
            {getInitials(worker.name)}
          </div>

          {/* Worker Details */}
          <div className="flex-1 min-w-0">
            <h3 className="text-lg font-semibold text-gray-900 truncate">{worker.name}</h3>
            <div className="flex items-center gap-2 mt-1">
              <div className={cn('w-2 h-2 rounded-full', getStatusDot(status))} />
              <span className="text-sm text-gray-600 capitalize">{status}</span>
              <Clock className="h-3 w-3 text-gray-400 ml-1" />
              <span className="text-sm text-gray-600">{formatWorkingHours()}</span>
            </div>
            <div className="mt-2">
              <button className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 transition-colors">
                <span>{totalJobs} jobs today</span>
                <ChevronDown className="h-3 w-3" />
              </button>
            </div>
          </div>
        </div>

        {/* Right: Timeline */}
        <div className="flex-1 relative overflow-x-auto">
          <div className="relative h-20" style={{ width: timelineWidth, minWidth: '100%' }}>
            {/* Availability background blocks */}
            <AvailabilityTrack
              availability={workerData.availability}
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
          </div>
        </div>
      </div>
    </div>
  )
} 