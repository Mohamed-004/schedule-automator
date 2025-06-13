/**
 * Enhanced Worker Availability Hook - Database-First Approach
 * Provides unified data processing for both UI display and green availability blocks
 * No default fallbacks - shows actual database state only
 */

'use client'

import { useMemo } from 'react'
import { TimeRange } from '@/lib/timeline-grid'

// Standardized worker shift interface
export interface WorkerShift {
  start: string // "HH:MM" format
  end: string   // "HH:MM" format
  day?: number | string  // 0-6 (Sunday-Saturday) or day name string
  isActive?: boolean
}

// Standardized worker interface
export interface StandardizedWorker {
  id: string
  name: string
  email?: string
  status: 'available' | 'busy' | 'offline' | 'unavailable'
  working_hours: WorkerShift[]
}

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

// Availability configuration
interface AvailabilityConfig {
  bg: string
  border: string
  text: string
  opacity: number
}

interface ProcessedAvailability {
  status: 'available' | 'busy' | 'offline' | 'unavailable'
  displayText: string
  hasAvailability: boolean
  shifts: Array<WorkerShift & {
    startHour: number
    startMinute: number
    endHour: number
    endMinute: number
    durationMinutes: number
    isValid: boolean
  }>
  timeRange?: string
}

const AVAILABILITY_CONFIGS: Record<string, AvailabilityConfig> = {
  available: { 
    bg: 'bg-green-100', 
    border: 'border-green-300', 
    text: 'text-green-700', 
    opacity: 0.6 
  },
  busy: { 
    bg: 'bg-yellow-100', 
    border: 'border-yellow-300', 
    text: 'text-yellow-700', 
    opacity: 0.4 
  },
  offline: { 
    bg: 'bg-red-100', 
    border: 'border-red-300', 
    text: 'text-red-700', 
    opacity: 0.3 
  },
  unavailable: { 
    bg: 'bg-gray-100', 
    border: 'border-gray-300', 
    text: 'text-gray-500', 
    opacity: 0.2 
  }
}

/**
 * Determines worker status based on actual data availability
 */
function determineWorkerStatus(worker: InputWorker, selectedDate: Date): 'available' | 'busy' | 'offline' | 'unavailable' {
  // If explicitly marked as offline, respect that
  if (worker.status === 'offline') {
    return 'offline'
  }
  
  // If no working hours data exists, worker is offline
  if (!worker.working_hours || worker.working_hours.length === 0) {
    return 'offline'
  }
  
  // Check if worker has shifts for the selected date
  const dayOfWeek = selectedDate.getDay()
  const hasShiftsForDate = worker.working_hours.some(shift => 
    matchesDayOfWeek(shift.day, dayOfWeek)
  )
  
  if (hasShiftsForDate) {
    // Use original status if available for this date, default to available
    return worker.status === 'busy' ? 'busy' : 'available'
  }
  
  // Has working hours but not for this specific date
  return 'unavailable'
}

/**
 * Processes worker availability data for unified consumption
 */
function processWorkerAvailabilityForDate(worker: InputWorker, selectedDate: Date): ProcessedAvailability {
  const status = determineWorkerStatus(worker, selectedDate)
  
  // Handle offline/unavailable states
  if (status === 'offline') {
    return {
      status: 'offline',
      displayText: 'Not Scheduled',
      hasAvailability: false,
      shifts: [],
      timeRange: undefined
    }
  }
  
  if (status === 'unavailable') {
    return {
      status: 'unavailable',
      displayText: 'Not Available Today',
      hasAvailability: false,
      shifts: [],
      timeRange: undefined
    }
  }
  
  // Process shifts for available/busy workers
  const standardizedWorker = standardizeWorker(worker)
  const shiftsForDate = getShiftsForDate(standardizedWorker, selectedDate)
  
  const validShifts = shiftsForDate
    .map(shift => ({
      shift,
      validation: validateShift(shift)
    }))
    .filter(({ validation }) => validation.isValid)
    .map(({ shift, validation }) => ({
      ...shift,
      ...validation
    }))
  
  // Generate display text from actual shifts
  let displayText = 'Not Scheduled'
  let timeRange = undefined
  
  if (validShifts.length > 0) {
    const firstShift = validShifts[0]
    const startTime = formatTime(firstShift.start)
    const endTime = formatTime(firstShift.end)
    displayText = `${startTime} - ${endTime}`
    timeRange = `${firstShift.start}-${firstShift.end}`
  }
  
  return {
    status,
    displayText,
    hasAvailability: validShifts.length > 0,
    shifts: validShifts,
    timeRange
  }
}

/**
 * Standardizes worker data structure - NO DEFAULT FALLBACKS
 */
function standardizeWorker(worker: InputWorker): StandardizedWorker {
  const status = worker.status || 'available'
  
  // NO DEFAULT WORKING HOURS - use only actual data
  let working_hours: WorkerShift[] = []
  
  if (worker.working_hours && worker.working_hours.length > 0) {
    working_hours = worker.working_hours.map(shift => ({
      start: shift.start,
      end: shift.end,
      day: shift.day,
      isActive: true
    }))
  }
  // If no working_hours, leave empty array (no fallbacks)
  
  return {
    id: worker.id,
    name: worker.name,
    email: worker.email,
    status,
    working_hours
  }
}

/**
 * Matches day-of-week with proper fallback handling
 */
function matchesDayOfWeek(shiftDay: number | string | undefined, targetDay: number): boolean {
  if (shiftDay === undefined || shiftDay === null) {
    return true // No day restriction means applies to all days
  }
  
  if (typeof shiftDay === 'number') {
    return shiftDay === targetDay
  }
  
  if (typeof shiftDay === 'string') {
    const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday']
    const targetDayName = dayNames[targetDay]
    return shiftDay.toLowerCase() === targetDayName
  }
  
  return false
}

/**
 * Filters shifts for a specific date
 */
function getShiftsForDate(worker: StandardizedWorker, selectedDate: Date): WorkerShift[] {
  const dayOfWeek = selectedDate.getDay() // 0 = Sunday, 6 = Saturday
  
  const relevantShifts = worker.working_hours.filter(shift => 
    matchesDayOfWeek(shift.day, dayOfWeek)
  )
  
  return relevantShifts
}

/**
 * Validates shift time format and calculates duration
 */
function validateShift(shift: WorkerShift): {
  isValid: boolean
  startHour: number
  startMinute: number
  endHour: number
  endMinute: number
  durationMinutes: number
} {
  const startParts = shift.start.split(':')
  const endParts = shift.end.split(':')
  
  if (startParts.length !== 2 || endParts.length !== 2) {
    return { 
      isValid: false, 
      startHour: 0, 
      startMinute: 0, 
      endHour: 0, 
      endMinute: 0, 
      durationMinutes: 0 
    }
  }
  
  const [startHour, startMinute] = startParts.map(Number)
  const [endHour, endMinute] = endParts.map(Number)
  
  if (isNaN(startHour) || isNaN(startMinute) || isNaN(endHour) || isNaN(endMinute)) {
    return { 
      isValid: false, 
      startHour: 0, 
      startMinute: 0, 
      endHour: 0, 
      endMinute: 0, 
      durationMinutes: 0 
    }
  }
  
  const durationMinutes = (endHour * 60 + endMinute) - (startHour * 60 + startMinute)
  
  return {
    isValid: durationMinutes > 0,
    startHour,
    startMinute,
    endHour,
    endMinute,
    durationMinutes
  }
}

/**
 * Format time from HH:MM to readable format
 */
function formatTime(timeStr: string): string {
  const [hours, minutes] = timeStr.split(':').map(Number)
  const period = hours >= 12 ? 'PM' : 'AM'
  const hour12 = hours % 12 || 12
  return `${hour12}:${minutes.toString().padStart(2, '0')} ${period}`
}

/**
 * Main hook for worker availability - Database-First Approach
 */
export function useWorkerAvailability(inputWorker: InputWorker, selectedDate: Date) {
  return useMemo(() => {
    // Process worker data with intelligent status determination
    const processed = processWorkerAvailabilityForDate(inputWorker, selectedDate)
    
    // Get availability configuration
    const config = AVAILABILITY_CONFIGS[processed.status] || AVAILABILITY_CONFIGS.offline
    
    return {
      worker: {
        ...inputWorker,
        status: processed.status
      },
      shifts: processed.shifts,
      config,
      hasShifts: processed.hasAvailability,
      isAvailable: processed.status === 'available' && processed.hasAvailability,
      displayText: processed.displayText,
      timeRange: processed.timeRange
    }
  }, [inputWorker, selectedDate])
}

/**
 * Hook for multiple workers
 */
export function useMultipleWorkerAvailability(
  workers: InputWorker[], 
  selectedDate: Date
) {
  return useMemo(() => {
    return workers.map(worker => ({
      workerId: worker.id,
      ...useWorkerAvailability(worker, selectedDate)
    }))
  }, [workers, selectedDate])
}

/**
 * Hook for calculating worker utilization
 */
export function useWorkerUtilization(
  worker: InputWorker,
  jobs: Array<{ duration: number | undefined; duration_hours?: number }>,
  selectedDate: Date
) {
  const { shifts } = useWorkerAvailability(worker, selectedDate)
  
  return useMemo(() => {
    // Calculate total available minutes
    const totalAvailableMinutes = shifts.reduce((total, shift) => {
      return total + shift.durationMinutes
    }, 0)
    
    if (totalAvailableMinutes === 0) return 0
    
    // Calculate total job minutes
    const totalJobMinutes = jobs.reduce((total, job) => {
      const duration = job.duration || (job.duration_hours ? job.duration_hours * 60 : 0)
      return total + duration
    }, 0)
    
    // Calculate utilization percentage
    const utilization = (totalJobMinutes / totalAvailableMinutes) * 100
    return Math.min(100, Math.max(0, utilization))
  }, [shifts, jobs])
}

/**
 * Export types for external use
 */
export type { AvailabilityConfig, ProcessedAvailability } 