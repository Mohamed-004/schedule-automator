import React from 'react'
import { cn } from '@/lib/utils'
import { 
  calculateGridPosition, 
  formatGridTime,
  GRID_CONFIG,
  TimeRange
} from '@/lib/timeline-grid'

interface WorkerShift {
  start: string // "HH:MM" format
  end: string   // "HH:MM" format
  day?: number  // 0-6 (Sunday-Saturday)
  isActive?: boolean
}

interface Worker {
  id: string
  name: string
  status: 'available' | 'busy' | 'offline'
  working_hours?: WorkerShift[]
}

interface GridAlignedAvailabilityProps {
  worker: Worker
  selectedDate: Date
  className?: string
  showTimeLabels?: boolean
  opacity?: number
  timeRange?: TimeRange
}

export function GridAlignedAvailability({ 
  worker, 
  selectedDate,
  className,
  showTimeLabels = false,
  opacity = 0.3,
  timeRange
}: GridAlignedAvailabilityProps) {
  // Get worker's schedule for the selected date
  const dayOfWeek = selectedDate.getDay()
  const relevantShifts = worker.working_hours?.filter(shift => 
    shift.day === undefined || shift.day === dayOfWeek
  ) || []

  // Default shift if no specific schedule
  const defaultShift = { start: '09:00', end: '17:00' }
  const shifts = relevantShifts.length > 0 ? relevantShifts : [defaultShift]

  // Light green background for all worker availability
  const availabilityConfig = {
    bg: 'bg-green-100',
    border: 'border-green-200',
    text: 'text-green-700'
  }

  return (
    <div className="absolute inset-0">
      {shifts.map((shift, index) => {
        // Parse shift times
        const [startHour, startMinute] = shift.start.split(':').map(Number)
        const [endHour, endMinute] = shift.end.split(':').map(Number)
        
        // Calculate duration in minutes
        const startTotalMinutes = startHour * 60 + startMinute
        const endTotalMinutes = endHour * 60 + endMinute
        const durationMinutes = endTotalMinutes - startTotalMinutes

        // Skip invalid shifts
        if (durationMinutes <= 0) return null

        // Calculate grid-aligned position with timeRange
        const gridPosition = calculateGridPosition(startHour, startMinute, durationMinutes, timeRange)

        return (
          <div key={index} className="relative">
            {/* Main availability block */}
            <div
              className={cn(
                "absolute top-0 bottom-0 border-2 rounded-sm",
                "bg-green-100 border-green-300",
                className
              )}
              style={{
                left: gridPosition.left,
                width: gridPosition.width,
                opacity: opacity || 0.6
              }}
            />

            {/* Time labels (optional) */}
            {showTimeLabels && (
              <>
                {/* Start time label */}
                <div
                  className={cn(
                    "absolute top-1 text-xs font-medium px-1 py-0.5 rounded",
                    availabilityConfig.text,
                    "bg-white/80 border border-current/20"
                  )}
                  style={{ left: gridPosition.left + 2 }}
                >
                  {formatGridTime(gridPosition.hour, gridPosition.minute)}
                </div>

                {/* End time label */}
                <div
                  className={cn(
                    "absolute bottom-1 text-xs font-medium px-1 py-0.5 rounded",
                    availabilityConfig.text,
                    "bg-white/80 border border-current/20"
                  )}
                  style={{ 
                    right: `calc(100% - ${gridPosition.left + gridPosition.width - 2}px)` 
                  }}
                >
                  {(() => {
                    const endHour = Math.floor((gridPosition.hour * 60 + gridPosition.minute + gridPosition.duration) / 60)
                    const endMinute = (gridPosition.hour * 60 + gridPosition.minute + gridPosition.duration) % 60
                    return formatGridTime(endHour, endMinute)
                  })()}
                </div>
              </>
            )}

            {/* Status indicator */}
            <div
              className={cn(
                "absolute top-1/2 -translate-y-1/2 w-2 h-2 rounded-full border border-white shadow-sm",
                "bg-green-500"
              )}
              style={{ left: gridPosition.left + gridPosition.width / 2 - 4 }}
            />
          </div>
        )
      })}
    </div>
  )
}

// Compact version for smaller displays
export function CompactGridAlignedAvailability({ 
  worker, 
  selectedDate,
  className 
}: Omit<GridAlignedAvailabilityProps, 'showTimeLabels' | 'opacity'>) {
  const dayOfWeek = selectedDate.getDay()
  const relevantShifts = worker.working_hours?.filter(shift => 
    shift.day === undefined || shift.day === dayOfWeek
  ) || []

  const defaultShift = { start: '09:00', end: '17:00' }
  const shifts = relevantShifts.length > 0 ? relevantShifts : [defaultShift]

  const statusColors = {
    available: 'bg-green-300/60',
    busy: 'bg-yellow-300/60',
    offline: 'bg-gray-300/60'
  }

  return (
    <div className="absolute inset-0">
      {shifts.map((shift, index) => {
        const [startHour, startMinute] = shift.start.split(':').map(Number)
        const [endHour, endMinute] = shift.end.split(':').map(Number)
        const durationMinutes = (endHour * 60 + endMinute) - (startHour * 60 + startMinute)

        if (durationMinutes <= 0) return null

        const gridPosition = calculateGridPosition(startHour, startMinute, durationMinutes)

        return (
          <div
            key={index}
            className={cn(
              "absolute top-0 bottom-0 rounded-sm border border-white/50",
              statusColors[worker.status],
              className
            )}
            style={{
              left: gridPosition.left,
              width: gridPosition.width
            }}
          />
        )
      })}
    </div>
  )
}

// Multi-day availability for week view
export function WeekGridAlignedAvailability({ 
  worker, 
  weekDays,
  dayWidth,
  className 
}: {
  worker: Worker
  weekDays: Date[]
  dayWidth: number
  className?: string
}) {
  const statusColors = {
    available: 'bg-green-200/40',
    busy: 'bg-yellow-200/40',
    offline: 'bg-gray-200/40'
  }

  return (
    <div className="absolute inset-0">
      {weekDays.map((date, dayIndex) => {
        const dayOfWeek = date.getDay()
        const relevantShifts = worker.working_hours?.filter(shift => 
          shift.day === undefined || shift.day === dayOfWeek
        ) || []

        const defaultShift = { start: '09:00', end: '17:00' }
        const shifts = relevantShifts.length > 0 ? relevantShifts : [defaultShift]

        return (
          <div 
            key={dayIndex}
            className="absolute top-0 bottom-0"
            style={{
              left: dayIndex * dayWidth,
              width: dayWidth
            }}
          >
            {shifts.map((shift, shiftIndex) => {
              const [startHour, startMinute] = shift.start.split(':').map(Number)
              const [endHour, endMinute] = shift.end.split(':').map(Number)
              const durationMinutes = (endHour * 60 + endMinute) - (startHour * 60 + startMinute)

              if (durationMinutes <= 0) return null

              const gridPosition = calculateGridPosition(startHour, startMinute, durationMinutes)
              
              // Scale position to day width
              const scaledLeft = (gridPosition.left / GRID_CONFIG.TOTAL_HOURS / GRID_CONFIG.HOUR_WIDTH) * dayWidth
              const scaledWidth = (gridPosition.width / GRID_CONFIG.TOTAL_HOURS / GRID_CONFIG.HOUR_WIDTH) * dayWidth

              return (
                <div
                  key={shiftIndex}
                  className={cn(
                    "absolute top-0 bottom-0 rounded-sm border border-white/30",
                    statusColors[worker.status],
                    className
                  )}
                  style={{
                    left: scaledLeft,
                    width: scaledWidth
                  }}
                />
              )
            })}
          </div>
        )
      })}
    </div>
  )
} 