import React, { useState, useEffect } from 'react'
import { cn } from '@/lib/utils'
import { GRID_CONFIG, timeToPixels, formatGridTime, TimeRange } from '@/lib/timeline-grid'

interface CurrentTimeIndicatorProps {
  className?: string
  showLabel?: boolean
  timeRange?: TimeRange
}

export function CurrentTimeIndicator({ 
  className,
  showLabel = true,
  timeRange
}: CurrentTimeIndicatorProps) {
  const [currentTime, setCurrentTime] = useState(new Date())

  // Update current time every minute
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(new Date())
    }, 60000) // Update every minute

    return () => clearInterval(interval)
  }, [])

  const hour = currentTime.getHours()
  const minute = currentTime.getMinutes()
  
  // Use default time range if none provided (for backward compatibility)
  const defaultTimeRange: TimeRange = {
    startHour: 0,
    endHour: 23,
    totalHours: 24
  }
  
  const activeTimeRange = timeRange || defaultTimeRange
  const position = timeToPixels(hour, minute, activeTimeRange)

  // Only show if within the grid range
  if (hour < activeTimeRange.startHour || hour > activeTimeRange.endHour) {
    return null
  }

  return (
    <div
      className={cn("absolute top-0 bottom-0 z-20", className)}
      style={{ left: position }}
    >
      {/* Current time line */}
      <div className="absolute top-0 bottom-0 w-0.5 bg-red-500 shadow-sm" />
      
      {/* Time indicator dot */}
      <div className="absolute -top-1 -left-1.5 w-3 h-3 bg-red-500 rounded-full border-2 border-white shadow-md" />
      
      {/* Time label */}
      {showLabel && (
        <div className="absolute -top-8 -left-8 bg-red-500 text-white text-xs font-medium px-2 py-1 rounded shadow-md whitespace-nowrap">
          {formatGridTime(hour, minute)}
        </div>
      )}
    </div>
  )
}

// Compact version for smaller displays
export function CompactCurrentTimeIndicator({ className }: { className?: string }) {
  const [currentTime, setCurrentTime] = useState(new Date())

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(new Date())
    }, 60000)

    return () => clearInterval(interval)
  }, [])

  const hour = currentTime.getHours()
  const minute = currentTime.getMinutes()
  
  // Use default time range for compact version too
  const defaultTimeRange: TimeRange = {
    startHour: 0,
    endHour: 23,
    totalHours: 24
  }
  
  const position = timeToPixels(hour, minute, defaultTimeRange)

  if (hour < defaultTimeRange.startHour || hour > defaultTimeRange.endHour) {
    return null
  }

  return (
    <div
      className={cn("absolute top-0 bottom-0 z-20", className)}
      style={{ left: position }}
    >
      <div className="absolute top-0 bottom-0 w-0.5 bg-red-400 opacity-80" />
      <div className="absolute top-2 -left-1 w-2 h-2 bg-red-400 rounded-full" />
    </div>
  )
} 