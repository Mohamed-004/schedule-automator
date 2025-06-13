/**
 * Unified Timeline Coordinate System
 * Provides consistent positioning and alignment across all timeline components
 * Handles responsive worker column widths and precise grid positioning
 */

import { useMemo, useEffect, useState } from 'react'
import { GRID_CONFIG, TimeRange } from '@/lib/timeline-grid'

// Screen size breakpoints (matching Tailwind CSS)
const BREAKPOINTS = {
  SM: 640,  // sm: breakpoint
  MD: 768,  // New medium breakpoint
  LG: 1024  // lg: breakpoint
} as const

// Worker column width mapping (matching Tailwind classes)
const WORKER_COLUMN_WIDTHS = {
  MOBILE: 128,   // w-32
  TABLET: 160,   // sm:w-40
  MEDIUM: 192,   // md:w-48
  DESKTOP: 224   // lg:w-56
} as const

export interface TimelineCoordinates {
  workerColumnWidth: number
  timeGridStart: number
  hourWidth: number
  minuteWidth: number
  getTimePosition: (hour: number, minute: number) => number
  getAvailabilityPosition: (startHour: number, startMinute: number, durationMinutes: number) => {
    left: number
    width: number
  }
  validateAlignment?: (elementType: string, expectedPosition: number, actualPosition: number) => void
}

/**
 * Hook to detect current screen size and return appropriate worker column width
 */
export function useResponsiveWorkerWidth(): number {
  const [screenWidth, setScreenWidth] = useState<number>(0)

  useEffect(() => {
    // Set initial width
    setScreenWidth(window.innerWidth)

    // Listen for resize events
    const handleResize = () => {
      setScreenWidth(window.innerWidth)
    }

    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  return useMemo(() => {
    if (screenWidth >= BREAKPOINTS.LG) {
      return WORKER_COLUMN_WIDTHS.DESKTOP // lg:w-56
    } else if (screenWidth >= BREAKPOINTS.MD) {
      return WORKER_COLUMN_WIDTHS.MEDIUM
    } else if (screenWidth >= BREAKPOINTS.SM) {
      return WORKER_COLUMN_WIDTHS.TABLET  // sm:w-52
    } else {
      return WORKER_COLUMN_WIDTHS.MOBILE  // w-32
    }
  }, [screenWidth])
}

/**
 * Main hook for unified timeline coordinate system
 */
export function useTimelineCoordinates(timeRange: TimeRange): TimelineCoordinates {
  const workerColumnWidth = useResponsiveWorkerWidth()

  return useMemo(() => {
    const timeGridStart = workerColumnWidth
    const hourWidth = GRID_CONFIG.HOUR_WIDTH
    const minuteWidth = GRID_CONFIG.MINUTE_WIDTH

    // Calculate time position relative to timeline start (including worker column offset)
    const getTimePosition = (hour: number, minute: number): number => {
      const relativeHour = hour - timeRange.startHour
      const totalMinutes = (relativeHour * 60) + minute
      const gridPosition = totalMinutes * minuteWidth
      return timeGridStart + gridPosition
    }

    // Calculate availability block position and width
    const getAvailabilityPosition = (
      startHour: number, 
      startMinute: number, 
      durationMinutes: number
    ) => {
      const left = getTimePosition(startHour, startMinute)
      const width = Math.max(
        GRID_CONFIG.JOB_CARD_MIN_WIDTH,
        durationMinutes * minuteWidth
      )
      return { left, width }
    }

    // Development-mode alignment validation
    const validateAlignment = process.env.NODE_ENV === 'development' 
      ? (elementType: string, expectedPosition: number, actualPosition: number) => {
          const tolerance = 2 // 2px tolerance
          const difference = Math.abs(expectedPosition - actualPosition)
          
          if (difference > tolerance) {
            console.warn(
              `Timeline Alignment Warning: ${elementType} misaligned by ${difference}px`,
              { expected: expectedPosition, actual: actualPosition, difference }
            )
          }
        }
      : undefined

    return {
      workerColumnWidth,
      timeGridStart,
      hourWidth,
      minuteWidth,
      getTimePosition,
      getAvailabilityPosition,
      validateAlignment
    }
  }, [timeRange, workerColumnWidth])
}

/**
 * Hook for getting responsive Tailwind classes that match coordinate calculations
 */
export function useResponsiveWorkerClasses(): {
  workerColumnClasses: string
  workerColumnWidth: number
} {
  const workerColumnWidth = useResponsiveWorkerWidth()

  const workerColumnClasses = useMemo(() => {
    return 'w-32 sm:w-40 md:w-48 lg:w-56' // Added md breakpoint
  }, [])

  return {
    workerColumnClasses,
    workerColumnWidth
  }
}

/**
 * Utility function to convert time string to position
 */
export function timeStringToPosition(
  timeString: string, 
  coordinates: TimelineCoordinates
): number {
  const [hours, minutes] = timeString.split(':').map(Number)
  return coordinates.getTimePosition(hours, minutes)
}

/**
 * Utility function to snap position to grid
 */
export function snapToGrid(position: number, coordinates: TimelineCoordinates): number {
  const gridSize = GRID_CONFIG.MINUTES_PER_BLOCK * coordinates.minuteWidth
  return Math.round(position / gridSize) * gridSize
}

/**
 * Development utility to log coordinate system state
 */
export function debugCoordinates(coordinates: TimelineCoordinates, timeRange: TimeRange): void {
  if (process.env.NODE_ENV === 'development') {
    console.group('Timeline Coordinates Debug')
    console.log('Worker Column Width:', coordinates.workerColumnWidth)
    console.log('Time Grid Start:', coordinates.timeGridStart)
    console.log('Hour Width:', coordinates.hourWidth)
    console.log('Minute Width:', coordinates.minuteWidth)
    console.log('Time Range:', timeRange)
    
    // Test positions for each hour
    for (let hour = timeRange.startHour; hour <= timeRange.endHour; hour++) {
      const position = coordinates.getTimePosition(hour, 0)
      console.log(`${hour}:00 position:`, position)
    }
    console.groupEnd()
  }
}

export { WORKER_COLUMN_WIDTHS, BREAKPOINTS } 