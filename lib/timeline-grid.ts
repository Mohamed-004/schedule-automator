// Grid-based Timeline System
// This file contains all constants, types, and utilities for the unified grid system

// ===== PHASE 1: GRID CONSTANTS =====

// Dynamic grid system - adjusts based on actual data
export const GRID_CONFIG = {
  // Default time configuration (can be overridden)
  DEFAULT_START_HOUR: 6 as const,    // 6 AM default start
  DEFAULT_END_HOUR: 20 as const,     // 8 PM default end
  MIN_HOURS_DISPLAY: 8 as const,     // Minimum hours to show
  MAX_HOURS_DISPLAY: 18 as const,    // Maximum hours to show
  
  // Grid dimensions
  HOUR_WIDTH: 80,       // Pixels per hour block
  MINUTE_WIDTH: 80 / 60, // Pixels per minute (80px/60min = 1.33px/min)
  
  // Sub-divisions
  MINUTES_PER_BLOCK: 15, // 15-minute grid snapping
  BLOCKS_PER_HOUR: 4,    // 4 blocks per hour (15min each)
  
  // Visual styling
  WORKER_ROW_HEIGHT: 100,
  JOB_CARD_MARGIN: 4,
  JOB_CARD_MIN_WIDTH: 60, // Minimum width for 30min jobs
  
  // Business hours highlighting
  BUSINESS_START: 9,     // 9 AM
  BUSINESS_END: 17,      // 5 PM
  
  // Scroll padding
  SCROLL_PADDING: 1,     // Hours of padding on each side
} as const

// ===== PHASE 2: GRID TYPES =====

export interface GridPosition {
  left: number      // Pixel position from left
  width: number     // Width in pixels
  hour: number      // Starting hour (0-23)
  minute: number    // Starting minute (0-59)
  duration: number  // Duration in minutes
}

export interface GridTimeSlot {
  hour: number
  minute: number
  pixelPosition: number
  isBusinessHour: boolean
  isHourBoundary: boolean
  isQuarterHour: boolean
}

export interface WorkerScheduleGrid {
  workerId: string
  shifts: Array<{
    start: GridPosition
    end: GridPosition
    isActive: boolean
  }>
}

export interface TimeRange {
  startHour: number
  endHour: number
  totalHours: number
}

// ===== PHASE 3: DYNAMIC TIME RANGE CALCULATION =====

/**
 * Calculates optimal time range based on worker schedules and jobs
 */
export function calculateOptimalTimeRange(
  workers: Array<{ working_hours?: Array<{ start: string; end: string; day?: number }> }>,
  jobs: Array<{ scheduled_at: string; duration?: number; duration_hours?: number }>,
  selectedDate: Date
): TimeRange {
  let earliestHour: number = GRID_CONFIG.DEFAULT_START_HOUR
  let latestHour: number = GRID_CONFIG.DEFAULT_END_HOUR

  // Analyze worker schedules
  const dayOfWeek = selectedDate.getDay()
  workers.forEach(worker => {
    if (worker.working_hours) {
      worker.working_hours.forEach(schedule => {
        // Check if this schedule applies to the selected day
        if (schedule.day === undefined || schedule.day === dayOfWeek) {
          const [startHour] = schedule.start.split(':').map(Number)
          const [endHour] = schedule.end.split(':').map(Number)
          
          if (startHour < earliestHour) earliestHour = startHour
          if (endHour > latestHour) latestHour = endHour
        }
      })
    }
  })

  // Analyze job times
  jobs.forEach(job => {
    const jobDate = new Date(job.scheduled_at)
    const jobHour = jobDate.getHours()
    const duration = job.duration || (job.duration_hours ? job.duration_hours * 60 : 120)
    const endHour = jobHour + Math.ceil(duration / 60)

    if (jobHour < earliestHour) earliestHour = jobHour
    if (endHour > latestHour) latestHour = endHour
  })

  // Add padding and ensure reasonable bounds
  earliestHour = Math.max(0, earliestHour - GRID_CONFIG.SCROLL_PADDING)
  latestHour = Math.min(23, latestHour + GRID_CONFIG.SCROLL_PADDING)

  // Ensure minimum display hours
  const totalHours = latestHour - earliestHour
  if (totalHours < GRID_CONFIG.MIN_HOURS_DISPLAY) {
    const center = (earliestHour + latestHour) / 2
    const halfMin = GRID_CONFIG.MIN_HOURS_DISPLAY / 2
    earliestHour = Math.max(0, Math.floor(center - halfMin))
    latestHour = Math.min(23, Math.ceil(center + halfMin))
  }

  // Ensure maximum display hours
  if (latestHour - earliestHour > GRID_CONFIG.MAX_HOURS_DISPLAY) {
    // Prioritize business hours if they fall within the range
    if (earliestHour <= GRID_CONFIG.BUSINESS_START && latestHour >= GRID_CONFIG.BUSINESS_END) {
      earliestHour = GRID_CONFIG.BUSINESS_START - 2
      latestHour = GRID_CONFIG.BUSINESS_END + 2
    } else {
      latestHour = earliestHour + GRID_CONFIG.MAX_HOURS_DISPLAY
    }
  }

  return {
    startHour: earliestHour,
    endHour: latestHour,
    totalHours: latestHour - earliestHour
  }
}

// ===== PHASE 4: GRID CALCULATION FUNCTIONS =====

/**
 * Converts time (hour, minute) to pixel position on the grid
 */
export function timeToPixels(hour: number, minute: number, timeRange?: TimeRange): number {
  const startHour = timeRange?.startHour || 0
  const adjustedHour = hour - startHour
  const totalMinutes = (adjustedHour * 60) + minute
  return totalMinutes * GRID_CONFIG.MINUTE_WIDTH
}

/**
 * Converts pixel position back to time
 */
export function pixelsToTime(pixels: number, timeRange?: TimeRange): { hour: number; minute: number } {
  const startHour = timeRange?.startHour || 0
  const totalMinutes = Math.round(pixels / GRID_CONFIG.MINUTE_WIDTH)
  const hour = Math.floor(totalMinutes / 60) + startHour
  const minute = totalMinutes % 60
  return { 
    hour: Math.max(0, Math.min(23, hour)), 
    minute: Math.max(0, Math.min(59, minute)) 
  }
}

/**
 * Snaps time to nearest 15-minute grid boundary
 */
export function snapToGrid(hour: number, minute: number): { hour: number; minute: number } {
  const totalMinutes = (hour * 60) + minute
  const snappedMinutes = Math.round(totalMinutes / GRID_CONFIG.MINUTES_PER_BLOCK) * GRID_CONFIG.MINUTES_PER_BLOCK
  
  return {
    hour: Math.floor(snappedMinutes / 60),
    minute: snappedMinutes % 60
  }
}

/**
 * Calculates grid position for a job or availability block
 */
export function calculateGridPosition(
  startHour: number, 
  startMinute: number, 
  durationMinutes: number,
  timeRange?: TimeRange
): GridPosition {
  // Snap start time to grid
  const snappedStart = snapToGrid(startHour, startMinute)
  
  // Snap duration to minimum 15-minute blocks
  const snappedDuration = Math.max(
    GRID_CONFIG.MINUTES_PER_BLOCK,
    Math.ceil(durationMinutes / GRID_CONFIG.MINUTES_PER_BLOCK) * GRID_CONFIG.MINUTES_PER_BLOCK
  )
  
  const left = timeToPixels(snappedStart.hour, snappedStart.minute, timeRange)
  const width = Math.max(
    GRID_CONFIG.JOB_CARD_MIN_WIDTH,
    snappedDuration * GRID_CONFIG.MINUTE_WIDTH
  )
  
  return {
    left,
    width,
    hour: snappedStart.hour,
    minute: snappedStart.minute,
    duration: snappedDuration
  }
}

/**
 * Generates time slots for the dynamic time range
 */
export function generateTimeSlots(timeRange: TimeRange): GridTimeSlot[] {
  const slots: GridTimeSlot[] = []
  
  for (let hour = timeRange.startHour; hour <= timeRange.endHour; hour++) {
    for (let minute = 0; minute < 60; minute += GRID_CONFIG.MINUTES_PER_BLOCK) {
      const pixelPosition = timeToPixels(hour, minute, timeRange)
      const isBusinessHour = hour >= GRID_CONFIG.BUSINESS_START && hour < GRID_CONFIG.BUSINESS_END
      const isHourBoundary = minute === 0
      const isQuarterHour = minute % 15 === 0
      
      slots.push({
        hour,
        minute,
        pixelPosition,
        isBusinessHour,
        isHourBoundary,
        isQuarterHour
      })
    }
  }
  
  return slots
}

/**
 * Generates hour labels for the dynamic timeline header
 */
export function generateHourLabels(timeRange: TimeRange): Array<{ hour: number; label: string; position: number }> {
  const labels = []
  
  for (let hour = timeRange.startHour; hour <= timeRange.endHour; hour++) {
    const position = timeToPixels(hour, 0, timeRange)
    const period = hour >= 12 ? 'PM' : 'AM'
    const hour12 = hour % 12 || 12
    const label = `${hour12} ${period}`
    
    labels.push({ hour, label, position })
  }
  
  return labels
}

/**
 * Calculates total grid width in pixels for dynamic range
 */
export function getTotalGridWidth(timeRange: TimeRange): number {
  return timeRange.totalHours * GRID_CONFIG.HOUR_WIDTH
}

/**
 * Checks if a time falls within business hours
 */
export function isBusinessHour(hour: number): boolean {
  return hour >= GRID_CONFIG.BUSINESS_START && hour < GRID_CONFIG.BUSINESS_END
}

/**
 * Formats time for display
 */
export function formatGridTime(hour: number, minute: number): string {
  const period = hour >= 12 ? 'PM' : 'AM'
  const hour12 = hour % 12 || 12
  const minuteStr = minute.toString().padStart(2, '0')
  return `${hour12}:${minuteStr} ${period}`
}

/**
 * Calculates worker utilization based on grid-aligned jobs
 */
export function calculateWorkerUtilization(
  jobs: Array<{ duration: number }>,
  workerSchedule: { start: string; end: string }
): number {
  const [startHour, startMinute] = workerSchedule.start.split(':').map(Number)
  const [endHour, endMinute] = workerSchedule.end.split(':').map(Number)
  
  const workDayMinutes = (endHour * 60 + endMinute) - (startHour * 60 + startMinute)
  const jobMinutes = jobs.reduce((total, job) => total + job.duration, 0)
  
  return workDayMinutes > 0 ? (jobMinutes / workDayMinutes) * 100 : 0
}

/**
 * Validates that a position is properly aligned to the grid
 */
export function validateGridAlignment(position: GridPosition): boolean {
  const hourAlignment = position.hour >= 0 && position.hour <= 23
  const minuteAlignment = position.minute % GRID_CONFIG.MINUTES_PER_BLOCK === 0
  const durationAlignment = position.duration % GRID_CONFIG.MINUTES_PER_BLOCK === 0
  
  return hourAlignment && minuteAlignment && durationAlignment
}

/**
 * Detects overlapping jobs in the grid
 */
export function detectGridOverlaps(
  jobs: Array<{ id: string; position: GridPosition }>
): Set<string> {
  const overlaps = new Set<string>()
  
  for (let i = 0; i < jobs.length; i++) {
    for (let j = i + 1; j < jobs.length; j++) {
      const job1 = jobs[i]
      const job2 = jobs[j]
      
      const job1End = job1.position.left + job1.position.width
      const job2End = job2.position.left + job2.position.width
      
      if (job1.position.left < job2End && job1End > job2.position.left) {
        overlaps.add(job1.id)
        overlaps.add(job2.id)
      }
    }
  }
  
  return overlaps
} 