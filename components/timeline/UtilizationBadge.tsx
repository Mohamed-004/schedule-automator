'use client'

import React from 'react'
import { cn } from '@/lib/utils'

interface UtilizationBadgeProps {
  percentage: number
  className?: string
  size?: 'sm' | 'md' | 'lg'
  showLabel?: boolean
}

/**
 * UtilizationBadge displays worker utilization percentage with color coding
 * Red (<30%), Yellow (30-70%), Green (>70%)
 */
export function UtilizationBadge({ 
  percentage, 
  className, 
  size = 'md',
  showLabel = true 
}: UtilizationBadgeProps) {
  // Ensure percentage is within bounds
  const safePercentage = Math.max(0, Math.min(100, percentage))
  
  // Get color based on utilization level
  const getUtilizationColor = (percent: number) => {
    if (percent >= 70) {
      return {
        bg: 'bg-green-100',
        text: 'text-green-800',
        border: 'border-green-200',
        dot: 'bg-green-500'
      }
    } else if (percent >= 30) {
      return {
        bg: 'bg-yellow-100',
        text: 'text-yellow-800',
        border: 'border-yellow-200',
        dot: 'bg-yellow-500'
      }
    } else {
      return {
        bg: 'bg-red-100',
        text: 'text-red-800',
        border: 'border-red-200',
        dot: 'bg-red-500'
      }
    }
  }

  // Get size classes
  const getSizeClasses = (size: string) => {
    switch (size) {
      case 'sm':
        return {
          container: 'px-2 py-0.5 text-xs',
          dot: 'w-1.5 h-1.5',
          gap: 'gap-1'
        }
      case 'lg':
        return {
          container: 'px-3 py-1.5 text-sm',
          dot: 'w-2.5 h-2.5',
          gap: 'gap-2'
        }
      default: // md
        return {
          container: 'px-2.5 py-1 text-xs',
          dot: 'w-2 h-2',
          gap: 'gap-1.5'
        }
    }
  }

  const colors = getUtilizationColor(safePercentage)
  const sizes = getSizeClasses(size)

  // Get utilization status text
  const getStatusText = (percent: number) => {
    if (percent >= 90) return 'Fully Booked'
    if (percent >= 70) return 'High Utilization'
    if (percent >= 30) return 'Moderate Utilization'
    if (percent > 0) return 'Low Utilization'
    return 'Available'
  }

  return (
    <div
      className={cn(
        'inline-flex items-center rounded-full font-medium border transition-colors',
        colors.bg,
        colors.text,
        colors.border,
        sizes.container,
        sizes.gap,
        className
      )}
      title={`${safePercentage}% utilization - ${getStatusText(safePercentage)}`}
    >
      {/* Status indicator dot */}
      <div className={cn('rounded-full', colors.dot, sizes.dot)} />
      
      {/* Percentage display */}
      <span className="font-semibold">
        {Math.round(safePercentage)}%
      </span>
      
      {/* Optional label */}
      {showLabel && size !== 'sm' && (
        <span className="hidden sm:inline ml-1 opacity-75">
          util
        </span>
      )}
    </div>
  )
}

/**
 * Utility function to calculate worker utilization percentage
 */
export function calculateUtilization(
  scheduledMinutes: number,
  availableMinutes: number
): number {
  if (availableMinutes === 0) return 0
  return (scheduledMinutes / availableMinutes) * 100
}

/**
 * Utility function to get total scheduled time from jobs
 */
export function getTotalScheduledTime(jobs: any[]): number {
  return jobs.reduce((total, job) => total + (job.duration || 0), 0)
}

/**
 * Utility function to get total available time from availability slots
 */
export function getTotalAvailableTime(availability: any[]): number {
  return availability.reduce((total, slot) => {
    const startHour = parseInt(slot.start.split(':')[0])
    const startMinute = parseInt(slot.start.split(':')[1] || '0')
    const endHour = parseInt(slot.end.split(':')[0])
    const endMinute = parseInt(slot.end.split(':')[1] || '0')
    
    const startTotalMinutes = startHour * 60 + startMinute
    const endTotalMinutes = endHour * 60 + endMinute
    
    return total + (endTotalMinutes - startTotalMinutes)
  }, 0)
} 