'use client'

import React from 'react'
import { cn } from '@/lib/utils'
import { isBusinessHour } from '@/lib/timeline-grid'

interface TimelineSegmentProps {
  hour: number
  width: number
  position: number
  isAvailable?: boolean
  availabilityStatus?: 'available' | 'busy' | 'offline' | 'unavailable'
  isBusinessHour?: boolean
  showSubdivisions?: boolean
  className?: string
  children?: React.ReactNode
  onClick?: (hour: number) => void
}

/**
 * TimelineSegment - Represents a single hour block in the timeline
 * This component can hold availability states and is directly connected to the grid structure
 */
export function TimelineSegment({
  hour,
  width,
  position,
  isAvailable = false,
  availabilityStatus = 'unavailable',
  isBusinessHour: isBusinessHourProp,
  showSubdivisions = true,
  className,
  children,
  onClick
}: TimelineSegmentProps) {
  const isBusinessHourSegment = isBusinessHourProp ?? isBusinessHour(hour)
  
  // Availability styling based on status
  const availabilityStyles = {
    available: 'bg-green-100/70 border-green-300/50',
    busy: 'bg-yellow-100/70 border-yellow-300/50', 
    offline: 'bg-red-100/70 border-red-300/50',
    unavailable: 'bg-transparent'
  }

  const availabilityStyle = isAvailable ? availabilityStyles[availabilityStatus] : availabilityStyles.unavailable

  return (
    <div
      className={cn(
        "absolute top-0 bottom-0 border-r border-gray-200 transition-all duration-300 cursor-pointer",
        // Base background - alternating pattern
        hour % 2 === 0 ? "bg-gray-50/30" : "bg-white",
        // Business hours highlighting
        isBusinessHourSegment && "bg-blue-50/20",
        // Availability overlay
        availabilityStyle,
        // Hover effects
        "hover:bg-blue-50/30 hover:border-blue-300/50",
        className
      )}
      style={{
        left: position,
        width: width
      }}
      onClick={() => onClick?.(hour)}
      title={`${hour}:00 - ${availabilityStatus}`}
    >
      {/* Availability indicator bar */}
      {isAvailable && (
        <div 
          className={cn(
            "absolute top-0 left-0 right-0 h-1 transition-all duration-300",
            availabilityStatus === 'available' && "bg-green-500",
            availabilityStatus === 'busy' && "bg-yellow-500",
            availabilityStatus === 'offline' && "bg-red-500"
          )}
        />
      )}

      {/* Subdivision lines */}
      {showSubdivisions && (
        <>
          {/* 15-minute mark */}
          <div
            className="absolute top-0 bottom-0 w-px bg-gray-200/60"
            style={{ left: width * 0.25 }}
          />
          {/* 30-minute mark */}
          <div
            className="absolute top-0 bottom-0 w-px bg-gray-200/80"
            style={{ left: width * 0.5 }}
          />
          {/* 45-minute mark */}
          <div
            className="absolute top-0 bottom-0 w-px bg-gray-200/60"
            style={{ left: width * 0.75 }}
          />
        </>
      )}

      {/* Content container for jobs and other elements */}
      <div className="absolute inset-0 overflow-visible">
        {children}
      </div>
    </div>
  )
}

/**
 * ConnectedTimelineSegments - Renders a series of connected segments for a worker row
 * Handles spanning availability across multiple segments
 */
interface ConnectedTimelineSegmentsProps {
  timeRange: { startHour: number; endHour: number; totalHours: number }
  workerAvailability: Array<{
    startHour: number
    endHour: number
    status: 'available' | 'busy' | 'offline' | 'unavailable'
  }>
  segmentWidth: number
  getSegmentPosition: (hour: number) => number
  onSegmentClick?: (hour: number) => void
  showSubdivisions?: boolean
  className?: string
  children?: React.ReactNode
}

export function ConnectedTimelineSegments({
  timeRange,
  workerAvailability,
  segmentWidth,
  getSegmentPosition,
  onSegmentClick,
  showSubdivisions = true,
  className,
  children
}: ConnectedTimelineSegmentsProps) {
  // Create availability map for quick lookup
  const availabilityMap = new Map<number, { isAvailable: boolean; status: string }>()
  
  workerAvailability.forEach(availability => {
    for (let hour = availability.startHour; hour < availability.endHour; hour++) {
      availabilityMap.set(hour, {
        isAvailable: true,
        status: availability.status
      })
    }
  })

  // Generate segments for the time range
  const segments = []
  for (let hour = timeRange.startHour; hour <= timeRange.endHour; hour++) {
    const availability = availabilityMap.get(hour) || { isAvailable: false, status: 'unavailable' }
    
    segments.push(
      <TimelineSegment
        key={hour}
        hour={hour}
        width={segmentWidth}
        position={getSegmentPosition(hour)}
        isAvailable={availability.isAvailable}
        availabilityStatus={availability.status as any}
        showSubdivisions={showSubdivisions}
        onClick={onSegmentClick}
        className={className}
      />
    )
  }

  return (
    <div className="absolute inset-0">
      {segments}
      {/* Content overlay for jobs and other elements */}
      <div className="absolute inset-0 z-10">
        {children}
      </div>
    </div>
  )
} 