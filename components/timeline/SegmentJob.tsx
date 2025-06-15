'use client'

import React from 'react'
import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { Clock, MapPin, AlertTriangle, CheckCircle2, PlayCircle, XCircle } from 'lucide-react'
import { formatGridTime, GRID_CONFIG, TimeRange } from '@/lib/timeline-grid'
import { useTimelineCoordinates } from '@/hooks/use-timeline-coordinates'

interface Job {
  id: string
  title: string
  client_name?: string
  location?: string
  scheduled_at: string
  duration: number // in minutes
  duration_hours?: number
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled'
  priority: 'low' | 'medium' | 'high' | 'urgent'
  notes?: string
}

interface SegmentJobProps {
  job: Job
  timeRange: TimeRange
  onClick?: () => void
  hasConflict?: boolean
  className?: string
  style?: React.CSSProperties
}

/**
 * SegmentJob - Job component that positions within timeline segments
 * This replaces width-based positioning with segment-based architecture
 */
export function SegmentJob({ 
  job, 
  timeRange,
  onClick, 
  hasConflict = false,
  className,
  style
}: SegmentJobProps) {
  // Parse job timing
  const jobDate = new Date(job.scheduled_at)
  const jobHour = jobDate.getHours()
  const jobMinute = jobDate.getMinutes()
  const jobDuration = job.duration || (job.duration_hours ? job.duration_hours * 60 : 60)

  const coordinates = useTimelineCoordinates(timeRange)

  // Calculate segment-based position
  const startPosition = coordinates.getTimePosition(jobHour, jobMinute)
  const jobWidth = (jobDuration / 60) * coordinates.hourWidth

  // Status styling with proper mapping and fallbacks
  const statusConfig = {
    pending: {
      bg: 'bg-yellow-100 border-yellow-300',
      text: 'text-yellow-800',
      icon: Clock,
      iconColor: 'text-yellow-600'
    },
    scheduled: {
      bg: 'bg-blue-100 border-blue-300',
      text: 'text-blue-800',
      icon: Clock,
      iconColor: 'text-blue-600'
    },
    in_progress: {
      bg: 'bg-purple-100 border-purple-300',
      text: 'text-purple-800',
      icon: PlayCircle,
      iconColor: 'text-purple-600'
    },
    completed: {
      bg: 'bg-green-100 border-green-300',
      text: 'text-green-800',
      icon: CheckCircle2,
      iconColor: 'text-green-600'
    },
    cancelled: {
      bg: 'bg-gray-100 border-gray-300',
      text: 'text-gray-800',
      icon: XCircle,
      iconColor: 'text-gray-600'
    }
  }

  // Priority styling
  const priorityConfig = {
    low: 'border-l-gray-400',
    normal: 'border-l-blue-400',
    medium: 'border-l-blue-400',
    high: 'border-l-orange-400',
    urgent: 'border-l-red-500',
    emergency: 'border-l-red-600'
  }

  // Get config with fallback for unknown status
  const config = statusConfig[job.status as keyof typeof statusConfig] || statusConfig.pending
  const StatusIcon = config.icon

  // Format time display
  const startTime = formatGridTime(jobHour, jobMinute)
  const endHour = Math.floor((jobHour * 60 + jobMinute + jobDuration) / 60)
  const endMinute = (jobHour * 60 + jobMinute + jobDuration) % 60
  const endTime = formatGridTime(endHour, endMinute)

  return (
    <div
      className={cn(
        "absolute rounded-lg border-2 shadow-sm cursor-pointer transition-all duration-200 hover:shadow-md hover:scale-[1.02] group overflow-visible",
        config.bg,
        config.text,
        priorityConfig[job.priority as keyof typeof priorityConfig] || priorityConfig.medium,
        hasConflict && "ring-2 ring-red-400 ring-opacity-75",
        "border-l-4", // Priority indicator
        className
      )}
      style={{
        left: startPosition,
        width: Math.max(jobWidth, GRID_CONFIG.JOB_CARD_MIN_WIDTH),
        top: GRID_CONFIG.JOB_CARD_MARGIN,
        bottom: GRID_CONFIG.JOB_CARD_MARGIN,
        minWidth: GRID_CONFIG.JOB_CARD_MIN_WIDTH,
        ...style
      }}
      onClick={onClick}
      title={`${job.title} - ${startTime} to ${endTime}`}
    >
      {/* Conflict indicator */}
      {hasConflict && (
        <div className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-red-500 rounded-full border-2 border-white shadow-sm" />
      )}

      {/* Job content */}
      <div className="h-full p-2.5 flex flex-col justify-between overflow-hidden">
        {/* Header */}
        <div className="flex items-start justify-between gap-1.5 min-h-0">
          <div className="flex-1 min-w-0">
            <h4 className="font-medium text-sm leading-tight truncate">
              {job.title}
            </h4>
            {job.client_name && (
              <p className="text-xs opacity-75 truncate mt-0.5">
                {job.client_name}
              </p>
            )}
          </div>
          <StatusIcon className={cn("w-4 h-4 flex-shrink-0", config.iconColor)} />
        </div>

        {/* Time display */}
        <div className="text-xs font-medium opacity-90 flex items-center gap-1.5 mt-1">
          <Clock className="w-3.5 h-3.5" />
          <span className="truncate">
            {startTime} - {endTime}
          </span>
        </div>

        {/* Location if available */}
        {job.location && (
          <div className="text-xs opacity-75 flex items-center gap-1.5 mt-0.5">
            <MapPin className="w-3 h-3" />
            <span className="truncate">{job.location}</span>
          </div>
        )}

        {/* Priority badge for urgent/high priority */}
        {(job.priority === 'urgent' || job.priority === 'high') && (
          <Badge 
            variant="outline" 
            className={cn(
              "text-xs px-1.5 py-0.5 mt-1 w-fit",
              job.priority === 'urgent' ? "border-red-300 text-red-700 bg-red-50" : "border-orange-300 text-orange-700 bg-orange-50"
            )}
          >
            {job.priority}
          </Badge>
        )}
      </div>
    </div>
  )
}

/**
 * CompactSegmentJob - Compact version for smaller timeline views
 */
export function CompactSegmentJob(props: SegmentJobProps) {
  return (
    <SegmentJob 
      {...props} 
      className={cn("text-xs", props.className)}
      style={{
        ...props.style,
        minHeight: '40px'
      }}
    />
  )
}

/**
 * MultiSegmentJob - For jobs that span multiple segments (longer than 1 hour)
 */
interface MultiSegmentJobProps extends SegmentJobProps {
  spanSegments?: number
}

export function MultiSegmentJob({ 
  job, 
  timeRange,
  spanSegments,
  ...props 
}: MultiSegmentJobProps) {
  const jobDuration = job.duration || (job.duration_hours ? job.duration_hours * 60 : 60)
  const calculatedSpanSegments = Math.ceil(jobDuration / 60)
  const actualSpanSegments = spanSegments || calculatedSpanSegments

  return (
    <SegmentJob 
      job={job}
      timeRange={timeRange}
      {...props}
      className={cn(
        "border-dashed", // Visual indicator for multi-segment jobs
        actualSpanSegments > 1 && "shadow-lg", // Enhanced shadow for spanning jobs
        props.className
      )}
    />
  )
} 