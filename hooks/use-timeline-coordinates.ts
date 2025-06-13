/**
 * Unified Timeline Coordinate System
 * Provides consistent positioning and alignment across all timeline components
 * Handles responsive worker column widths and precise grid positioning
 */

import { useMemo, useEffect, useState, useCallback } from 'react'
import { GRID_CONFIG, TimeRange } from '@/lib/timeline-grid'
import { cn } from '@/lib/utils'

// Screen size breakpoints (matching Tailwind CSS)
const BREAKPOINTS = {
  SM: 640,
  MD: 768,
  LG: 1024,
  XL: 1280,
  XXL: 1536
}

// Worker column widths - must match the GRID_CONFIG
const WORKER_COLUMN_WIDTHS = {
  MOBILE: GRID_CONFIG.WORKER_COLUMN_WIDTH.MOBILE,
  TABLET: GRID_CONFIG.WORKER_COLUMN_WIDTH.TABLET,
  DESKTOP: GRID_CONFIG.WORKER_COLUMN_WIDTH.DESKTOP
}

// Screen size detection hook
function useScreenSize() {
  const [screenSize, setScreenSize] = useState('desktop')

  useEffect(() => {
    const handleResize = () => {
      const width = window.innerWidth
      if (width < BREAKPOINTS.MD) {
        setScreenSize('mobile')
      } else if (width < BREAKPOINTS.LG) {
        setScreenSize('tablet')
      } else {
        setScreenSize('desktop')
      }
    }

    // Set initial size
    if (typeof window !== 'undefined') {
      handleResize()
      window.addEventListener('resize', handleResize)
      return () => window.removeEventListener('resize', handleResize)
    }
  }, [])

  return { screenSize }
}

// Responsive worker column width hook
function useResponsiveWorkerWidth() {
  const { screenSize } = useScreenSize()
  
  return useMemo(() => {
    switch (screenSize) {
      case 'mobile':
        return WORKER_COLUMN_WIDTHS.MOBILE
      case 'tablet':
        return WORKER_COLUMN_WIDTHS.TABLET
      case 'desktop':
      default:
        return WORKER_COLUMN_WIDTHS.DESKTOP
    }
  }, [screenSize])
}

/**
 * Hook to calculate responsive timeline width based on viewport
 * This helps eliminate white space on larger viewports
 */
export function useResponsiveTimelineWidth(timeRange: TimeRange) {
  const [responsiveWidth, setResponsiveWidth] = useState<number | null>(null)
  const [hourWidth, setHourWidth] = useState<number>(GRID_CONFIG.HOUR_WIDTH)
  const workerColumnWidth = useResponsiveWorkerWidth()

  useEffect(() => {
    // Function to calculate optimal width based on viewport
    const calculateOptimalWidth = () => {
      // Only run in browser environment
      if (typeof window === 'undefined') return

      const viewportWidth = window.innerWidth
      const minHourWidth = 60 // Minimum readable width
      const maxHourWidth = 120 // Maximum comfortable width
      
      // Account for padding, scrollbar, and other UI elements
      const uiOffset = 48 // Padding, borders, etc.
      const availableWidth = viewportWidth - workerColumnWidth - uiOffset
      
      // Calculate optimal hour width to fill available space
      const optimalHourWidth = Math.min(
        Math.max(availableWidth / timeRange.totalHours, minHourWidth),
        maxHourWidth
      )
      
      setHourWidth(optimalHourWidth)
      setResponsiveWidth((optimalHourWidth * timeRange.totalHours) + 1) // +1 for border
    }

    // Calculate on mount and window resize
    calculateOptimalWidth()
    window.addEventListener('resize', calculateOptimalWidth)
    
    return () => {
      window.removeEventListener('resize', calculateOptimalWidth)
    }
  }, [timeRange, workerColumnWidth])

  return {
    responsiveWidth,
    hourWidth,
    isResponsive: responsiveWidth !== null
  }
}

/**
 * Timeline coordinates system
 * Provides unified positioning for all timeline elements
 */
interface TimelineCoordinates {
  workerColumnWidth: number
  timeGridStart: number
  hourWidth: number
  minuteWidth: number
  getTimePosition: (hour: number, minute: number) => number
  getAvailabilityPosition: (startHour: number, startMinute: number, durationMinutes: number) => {
    left: number
    width: number
  }
  validateAlignment: (elementType: string, expectedPosition: number, actualPosition: number) => void
  isResponsive: boolean
}

export function useTimelineCoordinates(timeRange: TimeRange): TimelineCoordinates {
  const { screenSize } = useScreenSize()
  
  // Get the responsive width if available
  const { hourWidth: responsiveHourWidth, isResponsive } = useResponsiveTimelineWidth(timeRange)
  
  // Determine the worker column width based on screen size
  const workerColumnWidth = useMemo(() => {
    switch (screenSize) {
      case 'mobile':
        return WORKER_COLUMN_WIDTHS.MOBILE
      case 'tablet':
        return WORKER_COLUMN_WIDTHS.TABLET
      case 'desktop':
      default:
        return WORKER_COLUMN_WIDTHS.DESKTOP
    }
  }, [screenSize])
  
  // Use responsive hour width if available, otherwise use the default
  const hourWidth = isResponsive ? responsiveHourWidth : GRID_CONFIG.HOUR_WIDTH
  const minuteWidth = hourWidth / 60
  const timeGridStart = workerColumnWidth
  
  // Function to get time position with proper worker column offset
  const getTimePosition = useCallback((hour: number, minute: number) => {
    const startHour = timeRange.startHour
    const adjustedHour = hour - startHour
    const totalMinutes = (adjustedHour * 60) + minute
    return totalMinutes * minuteWidth + workerColumnWidth
  }, [timeRange, workerColumnWidth, minuteWidth])
  
  // Calculate availability block position and width
  const getAvailabilityPosition = useCallback((startHour: number, startMinute: number, durationMinutes: number) => {
    const left = getTimePosition(startHour, startMinute)
    const width = durationMinutes * minuteWidth
    return { left, width }
  }, [getTimePosition, minuteWidth])
  
  // Development-mode alignment validation function
  const validateAlignment = useCallback((elementType: string, expectedPosition: number, actualPosition: number) => {
    if (process.env.NODE_ENV === 'development') {
      const tolerance = 2 // 2px tolerance
      const difference = Math.abs(expectedPosition - actualPosition)
      
      if (difference > tolerance) {
        console.warn(
          `Timeline Alignment Warning: ${elementType} misaligned by ${difference}px`,
          { expected: expectedPosition, actual: actualPosition, difference }
        )
      }
    }
  }, [])

  return {
    workerColumnWidth,
    timeGridStart,
    hourWidth,
    minuteWidth,
    getTimePosition,
    getAvailabilityPosition,
    validateAlignment,
    isResponsive
  }
}

export function useResponsiveWorkerClasses() {
  return {
    workerColumnClasses: cn(
      "w-32 sm:w-40 lg:w-48", // Must match WORKER_COLUMN_WIDTH values
      "flex-shrink-0"
    )
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