import React from 'react'
import { cn } from '@/lib/utils'
import { 
  formatGridTime,
  GRID_CONFIG,
  TimeRange
} from '@/lib/timeline-grid'
import { 
  useWorkerAvailability,
  StandardizedWorker,
  WorkerShift
} from '@/hooks/use-worker-availability'
import { useTimelineCoordinates } from '@/hooks/use-timeline-coordinates'

// Input worker interface (matches existing data structure)
interface InputWorker {
  id: string
  name: string
  email?: string
  status?: 'available' | 'busy' | 'offline'
  working_hours?: Array<{
    start: string
    end: string
    day?: number | string
  }>
}

interface GridAlignedAvailabilityProps {
  worker: InputWorker
  selectedDate: Date
  className?: string
  showTimeLabels?: boolean
  opacity?: number
  timeRange: TimeRange
}

export function GridAlignedAvailability({ 
  worker, 
  selectedDate,
  className,
  showTimeLabels = false,
  opacity = 0.3,
  timeRange
}: GridAlignedAvailabilityProps) {
  const { shifts, config, hasShifts, worker: processedWorker } = useWorkerAvailability(worker, selectedDate)
  const coordinates = useTimelineCoordinates(timeRange)

  // Early return - only render if worker has actual availability data
  if (!hasShifts || shifts.length === 0) {
    return null
  }

  // Early return if worker is offline or unavailable
  if (processedWorker.status === 'offline' || processedWorker.status === 'unavailable') {
    return null
  }

  return (
    <div className="absolute inset-0">
      {shifts.map((shift, index) => {
        // Use unified coordinate system for precise positioning
        const position = coordinates.getAvailabilityPosition(
          shift.startHour, 
          shift.startMinute, 
          shift.durationMinutes
        )

        // Development mode alignment validation
        if (process.env.NODE_ENV === 'development' && coordinates.validateAlignment) {
          const expectedTimePosition = coordinates.getTimePosition(shift.startHour, shift.startMinute)
          coordinates.validateAlignment('AvailabilityBlock', expectedTimePosition, position.left)
        }

        return (
          <div key={index} className="relative h-full">
            <div
              className={cn("absolute top-0 bottom-0 border-2 rounded-sm", config.bg, config.border, className)}
              style={{ 
                left: position.left, 
                width: position.width, 
                opacity: opacity || config.opacity 
              }}
            />
            {showTimeLabels && (
              <>
                <div
                  className={cn("absolute top-1 text-xs font-medium px-1 py-0.5 rounded", config.text, "bg-white/80 border border-current/20")}
                  style={{ left: position.left + 2 }}
                >
                  {formatGridTime(shift.startHour, shift.startMinute)}
                </div>
                <div
                  className={cn("absolute bottom-1 text-xs font-medium px-1 py-0.5 rounded", config.text, "bg-white/80 border border-current/20")}
                  style={{ right: `calc(100% - ${position.left + position.width - 2}px)` }}
                >
                  {formatGridTime(shift.endHour, shift.endMinute)}
                </div>
              </>
            )}
          </div>
        )
      })}
    </div>
  )
}

export function CompactGridAlignedAvailability({ 
  worker, 
  selectedDate,
  className,
  timeRange
}: Omit<GridAlignedAvailabilityProps, 'showTimeLabels' | 'opacity'> & { timeRange: TimeRange }) {
  const { shifts, hasShifts, worker: processedWorker } = useWorkerAvailability(worker, selectedDate)
  const coordinates = useTimelineCoordinates(timeRange)
  
  // Early return - only render if worker has actual availability data
  if (!hasShifts || shifts.length === 0) {
    return null
  }

  // Early return if worker is offline or unavailable
  if (processedWorker.status === 'offline' || processedWorker.status === 'unavailable') {
    return null
  }

  const statusColors = {
    available: 'bg-green-300/60',
    busy: 'bg-yellow-300/60',
    offline: 'bg-red-300/60',
    unavailable: 'bg-gray-300/60'
  }

  return (
    <div className="absolute inset-0">
      {shifts.map((shift, index) => {
        // Use unified coordinate system for precise positioning
        const position = coordinates.getAvailabilityPosition(
          shift.startHour, 
          shift.startMinute, 
          shift.durationMinutes
        )

        return (
          <div
            key={index}
            className={cn("absolute top-0 bottom-0 rounded-sm border border-white/50", statusColors[processedWorker.status], className)}
            style={{ left: position.left, width: position.width }}
          />
        )
      })}
    </div>
  )
}

export function WeekGridAlignedAvailability({ 
  worker, 
  weekDays,
  dayWidth,
  className,
  timeRange
}: {
  worker: InputWorker
  weekDays: Date[]
  dayWidth: number
  className?: string
  timeRange: TimeRange
}) {
  const coordinates = useTimelineCoordinates(timeRange)
  
  const statusColors = {
    available: 'bg-green-200/40',
    busy: 'bg-yellow-200/40',
    offline: 'bg-red-200/40',
    unavailable: 'bg-gray-200/40'
  }

  return (
    <div className="absolute inset-0">
      {weekDays.map((date, dayIndex) => {
        const { shifts, hasShifts, worker: processedWorker } = useWorkerAvailability(worker, date)
        
        // Skip rendering if no availability data for this day
        if (!hasShifts || shifts.length === 0) {
          return null
        }

        // Skip rendering if worker is offline or unavailable for this day
        if (processedWorker.status === 'offline' || processedWorker.status === 'unavailable') {
          return null
        }

        return (
          <div 
            key={dayIndex}
            className="absolute top-0 bottom-0"
            style={{ left: dayIndex * dayWidth, width: dayWidth }}
          >
            {shifts.map((shift, shiftIndex) => {
              // Use coordinate system for week view positioning
              const position = coordinates.getAvailabilityPosition(
                shift.startHour, 
                shift.startMinute, 
                shift.durationMinutes
              )
              
              // Scale position for day width
              const scaledLeft = (position.left / (timeRange.totalHours * GRID_CONFIG.HOUR_WIDTH)) * dayWidth
              const scaledWidth = (position.width / (timeRange.totalHours * GRID_CONFIG.HOUR_WIDTH)) * dayWidth

              return (
                <div
                  key={shiftIndex}
                  className={cn("absolute top-0 bottom-0 rounded-sm border border-white/50", statusColors[processedWorker.status], className)}
                  style={{ left: scaledLeft, width: scaledWidth }}
                />
              )
            })}
          </div>
        )
      })}
    </div>
  )
} 