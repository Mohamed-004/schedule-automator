'use client'

import React from 'react'
import { ConnectedTimelineSegments } from './TimelineSegment'
import { 
  useWorkerAvailability,
  StandardizedWorker
} from '@/hooks/use-worker-availability'
import { TimeRange } from '@/lib/timeline-grid'
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

interface SegmentAvailabilityProps {
  worker: InputWorker
  selectedDate: Date
  timeRange: TimeRange
  onSegmentClick?: (workerId: string, hour: number) => void
  showSubdivisions?: boolean
  className?: string
}

/**
 * SegmentAvailability - Renders worker availability using connected timeline segments
 * This replaces the floating GridAlignedAvailability with a segment-based approach
 */
export function SegmentAvailability({ 
  worker, 
  selectedDate,
  timeRange,
  onSegmentClick,
  showSubdivisions = true,
  className
}: SegmentAvailabilityProps) {
  const { shifts, hasShifts, worker: processedWorker } = useWorkerAvailability(worker, selectedDate)
  const coordinates = useTimelineCoordinates(timeRange)

  // Early return - only render if worker has actual availability data
  if (!hasShifts || shifts.length === 0) {
    return (
      <ConnectedTimelineSegments
        timeRange={timeRange}
        workerAvailability={[]}
        segmentWidth={coordinates.hourWidth}
        getSegmentPosition={(hour) => coordinates.getTimePosition(hour, 0) - coordinates.workerColumnWidth}
        onSegmentClick={(hour) => onSegmentClick?.(worker.id, hour)}
        showSubdivisions={showSubdivisions}
        className={className}
      />
    )
  }

  // Early return if worker is offline or unavailable
  if (processedWorker.status === 'offline' || processedWorker.status === 'unavailable') {
    return (
      <ConnectedTimelineSegments
        timeRange={timeRange}
        workerAvailability={[]}
        segmentWidth={coordinates.hourWidth}
        getSegmentPosition={(hour) => coordinates.getTimePosition(hour, 0) - coordinates.workerColumnWidth}
        onSegmentClick={(hour) => onSegmentClick?.(worker.id, hour)}
        showSubdivisions={showSubdivisions}
        className={className}
      />
    )
  }

  // Convert shifts to segment availability format
  const segmentAvailability = shifts.map(shift => ({
    startHour: shift.startHour,
    endHour: shift.endHour,
    status: processedWorker.status as 'available' | 'busy' | 'offline' | 'unavailable'
  }))

  return (
    <ConnectedTimelineSegments
      timeRange={timeRange}
      workerAvailability={segmentAvailability}
      segmentWidth={coordinates.hourWidth}
      getSegmentPosition={(hour) => coordinates.getTimePosition(hour, 0) - coordinates.workerColumnWidth}
      onSegmentClick={(hour) => onSegmentClick?.(worker.id, hour)}
      showSubdivisions={showSubdivisions}
      className={className}
    />
  )
}

/**
 * CompactSegmentAvailability - Compact version for smaller timeline views
 */
export function CompactSegmentAvailability({ 
  worker, 
  selectedDate,
  timeRange,
  onSegmentClick,
  className
}: Omit<SegmentAvailabilityProps, 'showSubdivisions'>) {
  return (
    <SegmentAvailability
      worker={worker}
      selectedDate={selectedDate}
      timeRange={timeRange}
      onSegmentClick={onSegmentClick}
      showSubdivisions={false}
      className={className}
    />
  )
}

/**
 * WeekSegmentAvailability - Week view with segment-based availability
 */
export function WeekSegmentAvailability({ 
  worker, 
  weekDays,
  timeRange,
  onSegmentClick,
  className
}: {
  worker: InputWorker
  weekDays: Date[]
  timeRange: TimeRange
  onSegmentClick?: (workerId: string, hour: number, date: Date) => void
  className?: string
}) {
  return (
    <div className="absolute inset-0">
      {weekDays.map((date, dayIndex) => (
        <div 
          key={date.toISOString()} 
          className="absolute inset-y-0"
          style={{ 
            left: `${dayIndex * (100 / weekDays.length)}%`,
            width: `${100 / weekDays.length}%`
          }}
        >
          <SegmentAvailability
            worker={worker}
            selectedDate={date}
            timeRange={timeRange}
            onSegmentClick={(workerId, hour) => onSegmentClick?.(workerId, hour, date)}
            showSubdivisions={false}
            className={className}
          />
        </div>
      ))}
    </div>
  )
} 