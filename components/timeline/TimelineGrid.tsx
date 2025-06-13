import React from 'react'
import { cn } from '@/lib/utils'
import { 
  GRID_CONFIG, 
  generateHourLabels, 
  getTotalGridWidth,
  isBusinessHour,
  TimeRange
} from '@/lib/timeline-grid'
import { useTimelineCoordinates, useResponsiveTimelineWidth } from '@/hooks/use-timeline-coordinates'

interface TimelineGridProps {
  className?: string
  showSubdivisions?: boolean
  highlightBusinessHours?: boolean
  timeRange?: TimeRange
}

export function TimelineGrid({ 
  className, 
  showSubdivisions = true,
  highlightBusinessHours = true,
  timeRange
}: TimelineGridProps) {
  // Use default time range if none provided (for backward compatibility)
  const defaultTimeRange: TimeRange = {
    startHour: 0,
    endHour: 23,
    totalHours: 24
  }
  
  const activeTimeRange = timeRange || defaultTimeRange
  const hourLabels = generateHourLabels(activeTimeRange)
  const coordinates = useTimelineCoordinates(activeTimeRange)
  const { responsiveWidth, isResponsive } = useResponsiveTimelineWidth(activeTimeRange)
  
  // Use responsive width if available, otherwise fall back to fixed width
  const totalWidth = isResponsive && responsiveWidth ? responsiveWidth : getTotalGridWidth(activeTimeRange)

  return (
    <div 
      className={cn(
        "relative transition-all duration-300 ease-in-out", 
        className
      )}
      style={{ width: totalWidth }}
    >
      {/* Background Pattern */}
      <div className="absolute inset-0">
        {/* Hour blocks with alternating backgrounds */}
        {hourLabels.map(({ hour, label }) => {
          // Use the coordinate system for positioning
          const position = coordinates.getTimePosition(hour, 0) - coordinates.workerColumnWidth
          
          return (
            <div
              key={`bg-${hour}`}
              className={cn(
                "absolute top-0 bottom-0 border-r border-gray-200 transition-all duration-300",
                // Alternating backgrounds
                hour % 2 === 0 ? "bg-gray-50/30" : "bg-white",
                // Business hours highlighting
                highlightBusinessHours && isBusinessHour(hour) && "bg-blue-50/20"
              )}
              style={{
                left: position,
                width: coordinates.hourWidth
              }}
            />
          )
        })}
      </div>

      {/* Major Grid Lines (Hour boundaries) */}
      <div className="absolute inset-0">
        {hourLabels.map(({ hour, label }) => {
          // Use the coordinate system for positioning
          const position = coordinates.getTimePosition(hour, 0) - coordinates.workerColumnWidth
          
          return (
            <div
              key={`major-${hour}`}
              className="absolute top-0 bottom-0 w-px bg-gray-300 transition-all duration-300"
              style={{ left: position }}
            />
          )
        })}
      </div>

      {/* Minor Grid Lines (15-minute subdivisions) */}
      {showSubdivisions && (
        <div className="absolute inset-0">
          {hourLabels.map(({ hour }) => {
            // Use the coordinate system for positioning
            const hourPosition = coordinates.getTimePosition(hour, 0) - coordinates.workerColumnWidth
            
            return (
              <React.Fragment key={`minor-${hour}`}>
                {/* 15-minute marks */}
                <div
                  className="absolute top-0 bottom-0 w-px bg-gray-200/60 transition-all duration-300"
                  style={{ left: hourPosition + (coordinates.hourWidth * 0.25) }}
                />
                {/* 30-minute marks */}
                <div
                  className="absolute top-0 bottom-0 w-px bg-gray-200/80 transition-all duration-300"
                  style={{ left: hourPosition + (coordinates.hourWidth * 0.5) }}
                />
                {/* 45-minute marks */}
                <div
                  className="absolute top-0 bottom-0 w-px bg-gray-200/60 transition-all duration-300"
                  style={{ left: hourPosition + (coordinates.hourWidth * 0.75) }}
                />
              </React.Fragment>
            )
          })}
        </div>
      )}

      {/* Current Time Indicator Commented Out */}
      {/* <CurrentTimeIndicator timeRange={activeTimeRange} /> */}
    </div>
  )
}

/*
function CurrentTimeIndicator({ timeRange }: { timeRange: TimeRange }) {
  const now = new Date()
  const currentHour = now.getHours()
  const currentMinute = now.getMinutes()
  
  // Only show if current time is within our grid
  if (currentHour < timeRange.startHour || currentHour > timeRange.endHour) {
    return null
  }

  const position = ((currentHour - timeRange.startHour) * GRID_CONFIG.HOUR_WIDTH) + 
                  (currentMinute * GRID_CONFIG.MINUTE_WIDTH)

  return (
    <div 
      className="absolute top-0 bottom-0 w-0.5 bg-red-500 z-50 pointer-events-none"
      style={{ left: position }}
    >
      <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-3 h-3 bg-red-500 rounded-full shadow-sm" />
      <div className="absolute -top-6 left-1/2 -translate-x-1/2 px-1 py-0.5 bg-red-500 text-white text-xs rounded whitespace-nowrap">
        {now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
      </div>
    </div>
  )
} 
*/ 