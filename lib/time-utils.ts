/**
 * Time utility functions for consistent formatting and parsing
 * Handles 12-hour format with AM/PM display
 */

/**
 * Format a Date object to 12-hour time string with AM/PM
 */
export const formatTime12Hour = (date: Date): string => {
  return date.toLocaleTimeString('en-US', { 
    hour: 'numeric', 
    minute: '2-digit', 
    hour12: true 
  })
}

/**
 * Parse time string (either 12-hour or 24-hour) to minutes since midnight
 */
export const parseTimeToMinutes = (timeString: string): number => {
  // Handle 12-hour format (e.g., "2:30 PM", "10:15 AM")
  if (timeString.includes('AM') || timeString.includes('PM')) {
    const [time, period] = timeString.split(' ')
    const [hours, minutes] = time.split(':').map(Number)
    
    let hour24 = hours
    if (period === 'PM' && hours !== 12) {
      hour24 += 12
    } else if (period === 'AM' && hours === 12) {
      hour24 = 0
    }
    
    return hour24 * 60 + minutes
  }
  
  // Handle 24-hour format (e.g., "14:30", "09:15")
  const [hours, minutes] = timeString.split(':').map(Number)
  return hours * 60 + minutes
}

/**
 * Convert minutes since midnight to 12-hour time string
 */
export const minutesToTime12Hour = (minutes: number): string => {
  const hours = Math.floor(minutes / 60)
  const mins = minutes % 60
  
  const hour12 = hours === 0 ? 12 : hours > 12 ? hours - 12 : hours
  const period = hours < 12 ? 'AM' : 'PM'
  
  return `${hour12}:${mins.toString().padStart(2, '0')} ${period}`
}

/**
 * Sort time blocks chronologically by start time
 */
export const sortTimeBlocks = <T extends { startTime: string }>(blocks: T[]): T[] => {
  return blocks.sort((a, b) => {
    const minutesA = parseTimeToMinutes(a.startTime)
    const minutesB = parseTimeToMinutes(b.startTime)
    return minutesA - minutesB
  })
}

/**
 * Format duration in minutes to human readable string
 */
export const formatDuration = (minutes: number): string => {
  if (minutes < 60) return `${minutes}m`
  const hours = Math.floor(minutes / 60)
  const remainingMinutes = minutes % 60
  return remainingMinutes > 0 ? `${hours}h ${remainingMinutes}m` : `${hours}h`
} 