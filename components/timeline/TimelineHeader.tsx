import React from 'react'
import { cn } from '@/lib/utils'
import { 
  GRID_CONFIG, 
  generateHourLabels, 
  getTotalGridWidth,
  isBusinessHour,
  TimeRange
} from '@/lib/timeline-grid'

interface TimelineHeaderProps {
  className?: string
  showBusinessHours?: boolean
  compact?: boolean
  timeRange?: TimeRange
}

export function TimelineHeader({ 
  className, 
  showBusinessHours = true,
  compact = false,
  timeRange
}: TimelineHeaderProps) {
  // Use default time range if none provided (for backward compatibility)
  const defaultTimeRange: TimeRange = {
    startHour: 0,
    endHour: 23,
    totalHours: 24
  }
  
  const activeTimeRange = timeRange || defaultTimeRange
  const hourLabels = generateHourLabels(activeTimeRange)
  const totalWidth = getTotalGridWidth(activeTimeRange)

  return (
    <div 
      className={cn(
        "sticky top-0 z-30 bg-white border-b border-gray-200 shadow-sm",
        compact ? "h-12" : "h-16",
        className
      )}
      style={{ width: totalWidth }}
    >
      <div className="relative h-full">
        {/* Hour Labels */}
        {hourLabels.map(({ hour, label, position }) => (
          <div
            key={hour}
            className={cn(
              "absolute top-0 flex flex-col items-center justify-center text-center",
              compact ? "h-12" : "h-16",
              // Business hours styling
              showBusinessHours && isBusinessHour(hour) 
                ? "text-blue-700 font-medium" 
                : "text-gray-600"
            )}
            style={{
              left: position,
              width: GRID_CONFIG.HOUR_WIDTH
            }}
          >
            {/* Main hour label */}
            <div className={cn(
              "font-medium",
              compact ? "text-xs" : "text-sm"
            )}>
              {label}
            </div>
            
            {/* 24-hour format (optional) */}
            {!compact && (
              <div className="text-xs text-gray-400 mt-0.5">
                {hour.toString().padStart(2, '0')}:00
              </div>
            )}
            
            {/* Business hours indicator */}
            {showBusinessHours && isBusinessHour(hour) && (
              <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-8 h-0.5 bg-blue-500 rounded-full" />
            )}
          </div>
        ))}

        {/* Grid alignment indicators (15-minute marks) */}
        <div className="absolute bottom-0 left-0 right-0 h-2">
          {hourLabels.map(({ hour, position }) => (
            <React.Fragment key={`marks-${hour}`}>
              {/* Quarter hour marks */}
              {[0.25, 0.5, 0.75].map((fraction, index) => (
                <div
                  key={`${hour}-${index}`}
                  className="absolute bottom-0 w-px h-2 bg-gray-300"
                  style={{ 
                    left: position + (GRID_CONFIG.HOUR_WIDTH * fraction)
                  }}
                />
              ))}
            </React.Fragment>
          ))}
        </div>

        {/* Hour boundary lines */}
        <div className="absolute inset-0">
          {hourLabels.map(({ hour, position }) => (
            <div
              key={`line-${hour}`}
              className="absolute top-0 bottom-0 w-px bg-gray-300"
              style={{ left: position }}
            />
          ))}
        </div>
      </div>
    </div>
  )
}

// Compact version for mobile/smaller screens
export function CompactTimelineHeader(props: Omit<TimelineHeaderProps, 'compact'>) {
  return <TimelineHeader {...props} compact={true} />
} 