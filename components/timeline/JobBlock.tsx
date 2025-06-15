'use client'

import React from 'react'
import { Clock, MapPin, User, MoreHorizontal } from 'lucide-react'
import { cn } from '@/lib/utils'
import { TimelineJob } from '@/lib/types'

interface JobBlockProps {
  job: TimelineJob
  width: number
  left: number
  onClick?: (job: TimelineJob) => void
  onReassign?: (job: TimelineJob) => void
  className?: string
}

/**
 * JobBlock component displays a single job as a horizontal block in the timeline
 * Width reflects job duration, positioned by start time
 */
export function JobBlock({ 
  job, 
  width, 
  left, 
  onClick, 
  onReassign, 
  className 
}: JobBlockProps) {
  // Status-based styling matching the image
  const getStatusColors = (status: string) => {
    switch (status) {
      case 'scheduled':
        return 'bg-yellow-100 border-yellow-300 text-yellow-800'
      case 'in_progress':
        return 'bg-blue-100 border-blue-300 text-blue-800'
      case 'completed':
        return 'bg-green-100 border-green-300 text-green-800'
      case 'cancelled':
        return 'bg-red-100 border-red-300 text-red-800'
      case 'rescheduled':
        return 'bg-orange-100 border-orange-300 text-orange-800'
      default:
        return 'bg-gray-100 border-gray-300 text-gray-800'
    }
  }

  // Priority-based left border color
  const getPriorityBorderColor = (priority?: string) => {
    switch (priority) {
      case 'low':
        return 'border-l-gray-400'
      case 'medium':
        return 'border-l-blue-500'
      case 'high':
        return 'border-l-orange-500'
      case 'urgent':
        return 'border-l-red-500'
      default:
        return 'border-l-gray-400'
    }
  }

  const formatTime = (date: Date | undefined) => {
    if (!date) return 'N/A'
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  }

  // Calculate end time from start time and duration
  const getEndTime = () => {
    if (!job.startTime) return undefined
    return new Date(job.startTime.getTime() + job.duration * 60000)
  }

  const formatDuration = (minutes: number) => {
    if (minutes < 60) return `${minutes}m`
    const hours = Math.floor(minutes / 60)
    const mins = minutes % 60
    return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`
  }

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    onClick?.(job)
  }

  const handleReassignClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    onReassign?.(job)
  }

  return (
    <div
      className={cn(
        'job-block absolute top-4 h-16 rounded-lg border-2 border-l-4 cursor-pointer',
        'flex flex-col justify-between p-2 overflow-hidden shadow-sm',
        getStatusColors(job.status),
        getPriorityBorderColor(job.priority),
        className
      )}
      style={{
        width: `${width}px`,
        left: `${left}px`,
        minWidth: '100px'
      }}
      onClick={handleClick}
      title={`${job.title} - ${job.client_name || 'Unknown Client'} (${formatTime(job.startTime)} - ${formatTime(getEndTime())})`}
    >
      {/* Top section: Title and Reassign button */}
      <div className="flex items-start justify-between gap-1">
        <div className="flex-1 min-w-0">
          <h4 className="font-semibold text-sm truncate leading-tight">
            {job.title}
          </h4>
          <p className="text-xs opacity-75 truncate">
            {job.client_name || 'Unknown Client'}
          </p>
        </div>
        
        {onReassign && (
          <button
            className="flex-shrink-0 p-1 rounded hover:bg-black/10 transition-colors"
            onClick={handleReassignClick}
            title="Reassign job"
            aria-label="Reassign job"
          >
            <MoreHorizontal className="h-3 w-3" />
          </button>
        )}
      </div>

      {/* Bottom section: Time and location */}
      <div className="flex items-center justify-between gap-1 text-xs">
        <div className="flex items-center gap-1 min-w-0">
          <Clock className="h-3 w-3 flex-shrink-0" />
          <span className="font-medium">{formatTime(job.startTime)}</span>
          <span className="opacity-60">•</span>
          <span className="opacity-75">{formatDuration(job.duration)}</span>
        </div>
        
        {job.location && (
          <div className="flex items-center gap-1 min-w-0 flex-shrink-0">
            <MapPin className="h-3 w-3 flex-shrink-0" />
            <span className="truncate text-xs opacity-75 max-w-[60px]">
              {job.location.split(',')[0]} {/* Show first part of address */}
            </span>
          </div>
        )}
      </div>

      {/* Conflict indicator */}
      {job.conflictStatus === 'outside_availability' && (
        <div className="absolute top-0 right-0 w-2 h-2 bg-red-500 rounded-full" />
      )}
      
      {job.conflictStatus === 'overlapping' && (
        <div className="absolute top-0 right-0 w-2 h-2 bg-orange-500 rounded-full" />
      )}
    </div>
  )
} 