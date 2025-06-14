import React from 'react'
import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { Clock, MapPin, AlertTriangle, CheckCircle2, PlayCircle, XCircle } from 'lucide-react'
import { 
  calculateGridPosition, 
  formatGridTime,
  GRID_CONFIG,
  GridPosition 
} from '@/lib/timeline-grid'
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

interface GridAlignedJobProps {
  job: Job
  onClick?: () => void
  onMove?: (newPosition: GridPosition) => void
  hasConflict?: boolean
  className?: string
  style?: React.CSSProperties
  timeRange?: { startHour: number; endHour: number; totalHours: number }
}

export function GridAlignedJob({ 
  job, 
  onClick, 
  onMove, 
  hasConflict = false,
  className,
  style,
  timeRange 
}: GridAlignedJobProps) {
  // Parse job timing
  const jobDate = new Date(job.scheduled_at)
  const jobHour = jobDate.getHours()
  const jobMinute = jobDate.getMinutes()
  const jobDuration = job.duration || (job.duration_hours ? job.duration_hours * 60 : 60)

  // Use default timeRange if not provided for backward compatibility
  const defaultTimeRange = { startHour: 0, endHour: 23, totalHours: 24 }
  const activeTimeRange = timeRange || defaultTimeRange
  
  // Get coordinates for responsive worker column width
  const coordinates = useTimelineCoordinates(activeTimeRange)

  // Calculate grid-aligned position with correct worker column offset
  const gridPosition = calculateGridPosition(
    jobHour, 
    jobMinute, 
    jobDuration, 
    activeTimeRange, 
    true, 
    coordinates.workerColumnWidth,
    coordinates.minuteWidth
  )
  
  // Determine status icon and color
  const getStatusInfo = () => {
    switch (job.status) {
      case 'in_progress':
        return { icon: <PlayCircle className="w-3.5 h-3.5" />, color: 'bg-blue-500 text-white' }
      case 'completed':
        return { icon: <CheckCircle2 className="w-3.5 h-3.5" />, color: 'bg-green-500 text-white' }
      case 'cancelled':
        return { icon: <XCircle className="w-3.5 h-3.5" />, color: 'bg-red-500 text-white' }
      case 'pending':
      default:
        return { icon: <Clock className="w-3.5 h-3.5" />, color: 'bg-yellow-500 text-white' }
    }
  }

  const { icon, color } = getStatusInfo()

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
      icon: Clock,
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
      icon: AlertTriangle,
      iconColor: 'text-gray-600'
    },
    rescheduled: {
      bg: 'bg-orange-100 border-orange-300',
      text: 'text-orange-800',
      icon: AlertTriangle,
      iconColor: 'text-orange-600'
    },
    overdue: {
      bg: 'bg-red-100 border-red-300',
      text: 'text-red-800',
      icon: AlertTriangle,
      iconColor: 'text-red-600'
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
  const config = statusConfig[job.status as keyof typeof statusConfig] || statusConfig.scheduled
  const StatusIcon = config.icon

  // Format time display
  const startTime = formatGridTime(gridPosition.hour, gridPosition.minute)
  const endHour = Math.floor((gridPosition.hour * 60 + gridPosition.minute + gridPosition.duration) / 60)
  const endMinute = (gridPosition.hour * 60 + gridPosition.minute + gridPosition.duration) % 60
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
        left: gridPosition.left,
        width: Math.max(gridPosition.width, GRID_CONFIG.JOB_CARD_MIN_WIDTH),
        top: GRID_CONFIG.JOB_CARD_MARGIN,
        bottom: GRID_CONFIG.JOB_CARD_MARGIN,
        minWidth: GRID_CONFIG.JOB_CARD_MIN_WIDTH,
        ...style
      }}
      onClick={onClick}
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

        {/* Location (if available and space permits) */}
        {job.location && gridPosition.width > 120 && (
          <div className="text-xs opacity-75 flex items-center gap-1.5 mt-1.5">
            <MapPin className="w-3.5 h-3.5 flex-shrink-0" />
            <span className="truncate">{job.location}</span>
          </div>
        )}

        {/* Priority badge (for urgent/high priority) */}
        {(job.priority === 'urgent' || job.priority === 'high') && gridPosition.width > 100 && (
          <Badge 
            variant={job.priority === 'urgent' ? 'destructive' : 'secondary'}
            className="text-xs py-0.5 px-1.5 mt-1.5 self-start"
          >
            {job.priority.toUpperCase()}
          </Badge>
        )}

        {/* Notes indicator */}
        {job.notes && (
          <div className="absolute top-1.5 right-1.5 w-2.5 h-2.5 bg-current rounded-full opacity-50" />
        )}

        {/* Status Badge */}
        {icon && (
          <div className={cn(
            "absolute top-1 right-1 w-5 h-5 rounded-full flex items-center justify-center",
            color || "bg-gray-500 text-white" // Fallback color if undefined
          )}>
            {icon}
          </div>
        )}
      </div>

      {/* Hover tooltip */}
      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-1.5 bg-gray-900 text-white text-xs rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none z-50 shadow-lg">
        {job.title} • {startTime} - {endTime}
        {job.location && ` • ${job.location}`}
      </div>
    </div>
  )
}

// Compact version for smaller grids
export function CompactGridAlignedJob(props: GridAlignedJobProps) {
  const { job, timeRange } = props
  const jobDate = new Date(job.scheduled_at)
  const jobHour = jobDate.getHours()
  const jobMinute = jobDate.getMinutes()
  const jobDuration = job.duration || (job.duration_hours ? job.duration_hours * 60 : 60)
  const defaultTimeRange = { startHour: 0, endHour: 23, totalHours: 24 }
  const activeTimeRange = timeRange || defaultTimeRange
  
  // Get coordinates for responsive worker column width
  const coordinates = useTimelineCoordinates(activeTimeRange)
  
  const gridPosition = calculateGridPosition(jobHour, jobMinute, jobDuration, activeTimeRange, true, coordinates.workerColumnWidth, coordinates.minuteWidth)

  const statusColors = {
    pending: 'bg-yellow-400',
    in_progress: 'bg-blue-400',
    completed: 'bg-green-400',
    cancelled: 'bg-gray-400'
  }

  return (
    <div
      className={cn(
        "absolute rounded cursor-pointer transition-all duration-200 hover:scale-110 border border-white shadow-sm",
        statusColors[job.status],
        props.hasConflict && "ring-1 ring-red-400",
        props.className
      )}
      style={{
        left: gridPosition.left,
        width: Math.max(gridPosition.width, 20),
        top: 2,
        bottom: 2,
        ...props.style
      }}
      onClick={props.onClick}
      title={`${job.title} • ${formatGridTime(gridPosition.hour, gridPosition.minute)}`}
    />
  )
} 