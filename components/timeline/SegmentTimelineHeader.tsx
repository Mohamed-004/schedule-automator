'use client'

import React from 'react'
import { cn } from '@/lib/utils'
import { TimeRange, generateHourLabels, isBusinessHour } from '@/lib/timeline-grid'
import { useTimelineCoordinates, useResponsiveWorkerClasses } from '@/hooks/use-timeline-coordinates'

interface TimelineHeaderSegmentProps {
  hour: number
  label: string
  width: number
  position: number
  isBusinessHour?: boolean
  compact?: boolean
  className?: string
}

/**
 * TimelineHeaderSegment - Individual hour label segment that aligns with timeline segments
 * This replaces width-based positioning with segment-based architecture
 */
function TimelineHeaderSegment({
  hour,
  label,
  width,
  position,
  isBusinessHour: isBusinessHourProp,
  compact = false,
  className
}: TimelineHeaderSegmentProps) {
  const isBusinessHourTime = isBusinessHourProp ?? isBusinessHour(hour)

  return (
    <div
      className={cn(
        "absolute top-0 bottom-0 flex-shrink-0 border-r border-gray-100 last:border-r-0",
        "transition-all duration-300 ease-in-out",
        compact ? "min-w-[60px]" : "min-w-[80px]",
        isBusinessHourTime && "bg-blue-50/30",
        className
      )}
      style={{ 
        width: width,
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
      {isBusinessHourTime && (
        <div className="absolute bottom-0 left-0 right-0 h-1 bg-blue-200" />
      )}
    </div>
  )
}

interface SegmentTimelineHeaderProps {
  timeRange: TimeRange
  className?: string
  showBusinessHours?: boolean
  compact?: boolean
}

/**
 * SegmentTimelineHeader - Segment-based timeline header that connects with availability and job segments
 * Each hour label is a segment that aligns perfectly with the timeline grid
 */
export function SegmentTimelineHeader({ 
  timeRange,
  className, 
  showBusinessHours = true,
  compact = false
}: SegmentTimelineHeaderProps) {
  const coordinates = useTimelineCoordinates(timeRange)
  const { workerColumnClasses } = useResponsiveWorkerClasses()
  const hourLabels = generateHourLabels(timeRange)

  return (
    <div 
      className={cn(
        "sticky top-0 z-10 bg-white/95 backdrop-blur-sm border-b border-gray-200 shadow-sm",
        "supports-[position:sticky]:sticky",
        "transition-all duration-300 ease-in-out",
        compact ? "h-10 sm:h-12" : "h-12 sm:h-16",
        className
      )}
      style={{ minWidth: coordinates.hourWidth * timeRange.totalHours + coordinates.workerColumnWidth }}
    >
      <div className="relative h-full">
        {/* Worker Column Spacer - Connected to segment system */}
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

        {/* Connected Header Segments */}
        <div className="absolute top-0 left-0 h-full">
          {hourLabels.map(({ hour, label }) => {
            // Use the same positioning logic as timeline segments
            const position = coordinates.getTimePosition(hour, 0)
            
            return (
              <TimelineHeaderSegment
                key={hour}
                hour={hour}
                label={label}
                width={coordinates.hourWidth}
                position={position}
                isBusinessHour={showBusinessHours && isBusinessHour(hour)}
                compact={compact}
              />
            )
          })}
        </div>
      </div>
    </div>
  )
}

/**
 * CompactSegmentTimelineHeader - Compact version for mobile/smaller screens
 */
export function CompactSegmentTimelineHeader(props: Omit<SegmentTimelineHeaderProps, 'compact'>) {
  return <SegmentTimelineHeader {...props} compact={true} />
} 