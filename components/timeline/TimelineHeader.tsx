import React from 'react'
import { cn } from '@/lib/utils'
import { 
  GRID_CONFIG, 
  generateHourLabels, 
  getTotalGridWidth,
  isBusinessHour,
  TimeRange
} from '@/lib/timeline-grid'
import { useTimelineCoordinates, useResponsiveWorkerClasses } from '@/hooks/use-timeline-coordinates'

interface TimelineHeaderProps {
  className?: string
  showBusinessHours?: boolean
  compact?: boolean
  timeRange: TimeRange
}

export function TimelineHeader({ 
  className, 
  showBusinessHours = true,
  compact = false,
  timeRange
}: TimelineHeaderProps) {
  const coordinates = useTimelineCoordinates(timeRange)
  const { workerColumnClasses } = useResponsiveWorkerClasses()
  const hourLabels = generateHourLabels(timeRange)
  const totalWidth = getTotalGridWidth(timeRange)

  return (
    <div 
      className={cn(
        "sticky top-0 z-30 bg-white/95 backdrop-blur-sm border-b border-gray-200 shadow-sm",
        "supports-[position:sticky]:sticky",
        compact ? "h-10 sm:h-12" : "h-12 sm:h-16",
        className
      )}
      style={{ minWidth: totalWidth + coordinates.workerColumnWidth }}
    >
      <div className="relative h-full">
        {/* Worker Column Spacer - Uses unified coordinate system */}
        <div 
          className={cn(
            "absolute left-0 top-0 h-full bg-gradient-to-r from-gray-50 to-gray-100 border-r border-gray-300 z-10",
            workerColumnClasses
          )}
          style={{ width: coordinates.workerColumnWidth }}
        >
          <div className="flex items-center justify-center h-full text-xs sm:text-sm font-semibold text-gray-700">
            <span className="hidden sm:inline">Team Schedule</span>
            <span className="sm:hidden">Team</span>
          </div>
        </div>

        {/* Hour Labels - Positioned using PURE absolute coordinates */}
        <div className="absolute top-0 left-0 h-full">
          {hourLabels.map(({ hour, label }) => {
            const isBusinessHour = showBusinessHours && hour >= 9 && hour < 17
            // Use the coordinate system directly for absolute positioning
            const position = coordinates.getTimePosition(hour, 0)
            
            return (
              <div
                key={hour}
                className={cn(
                  "absolute top-0 bottom-0 flex-shrink-0 border-r border-gray-100 last:border-r-0",
                  compact ? "min-w-[60px]" : "min-w-[80px]",
                  isBusinessHour && "bg-blue-50/30"
                )}
                style={{ 
                  width: coordinates.hourWidth,
                  left: position
                }}
              >
                {/* Hour marker line */}
                <div className="absolute left-0 top-0 bottom-0 w-[1px] sm:w-[2px] bg-gray-300" />
                
                {/* Hour label */}
                <div className={cn(
                  "absolute top-1 sm:top-2 left-1 sm:left-2 font-semibold text-gray-800",
                  compact ? "text-xs" : "text-xs sm:text-sm"
                )}>
                  {label}
                </div>
                
                {/* Business hours indicator */}
                {isBusinessHour && (
                  <div className="absolute bottom-0 left-0 right-0 h-1 bg-blue-200" />
                )}
              </div>
            )
          })}
        </div>
        
        {/* Development mode alignment validation */}
        {process.env.NODE_ENV === 'development' && coordinates.validateAlignment && (
          <div className="absolute top-0 left-0 w-1 h-1 bg-red-500 opacity-50" 
               title={`Worker Column: ${coordinates.workerColumnWidth}px`} />
        )}
      </div>
    </div>
  )
}

// Compact version for mobile/smaller screens
export function CompactTimelineHeader(props: Omit<TimelineHeaderProps, 'compact'>) {
  return <TimelineHeader {...props} compact={true} />
} 