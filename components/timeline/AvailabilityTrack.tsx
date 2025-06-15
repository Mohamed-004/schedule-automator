'use client'

import React from 'react'
import { cn } from '@/lib/utils'
import { AvailabilitySlot } from '@/lib/types'

interface AvailabilityTrackProps {
  availability: AvailabilitySlot[]
  timeRange: { start: number; end: number }
  hourWidth: number
  className?: string
}

/**
 * AvailabilityTrack shows worker availability as background blocks
 * Displays available time slots and gaps between them
 */
export function AvailabilityTrack({
  availability,
  timeRange,
  hourWidth,
  className
}: AvailabilityTrackProps) {
  // Generate availability blocks for the time range
  const generateAvailabilityBlocks = () => {
    const blocks = []
    const totalHours = timeRange.end - timeRange.start
    const totalWidth = totalHours * hourWidth

    // If no availability data, show unavailable for entire range
    if (!availability || availability.length === 0) {
      blocks.push({
        type: 'unavailable',
        left: 0,
        width: totalWidth,
        label: 'Not Available'
      })
      return blocks
    }

    // Convert availability to hour format
    const availableRanges = availability.map(slot => ({
      start: parseInt(slot.start.split(':')[0]) + parseInt(slot.start.split(':')[1]) / 60,
      end: parseInt(slot.end.split(':')[0]) + parseInt(slot.end.split(':')[1]) / 60
    }))

    let currentHour = timeRange.start

    availableRanges.forEach((range, index) => {
      // Add unavailable block before this availability slot
      if (currentHour < range.start) {
        const unavailableStart = currentHour
        const unavailableEnd = Math.min(range.start, timeRange.end)
        const left = (unavailableStart - timeRange.start) * hourWidth
        const width = (unavailableEnd - unavailableStart) * hourWidth

        blocks.push({
          type: 'unavailable',
          left,
          width,
          label: 'Not Available'
        })
      }

      // Add available block
      const availableStart = Math.max(range.start, currentHour)
      const availableEnd = Math.min(range.end, timeRange.end)
      if (availableStart < availableEnd) {
        const left = (availableStart - timeRange.start) * hourWidth
        const width = (availableEnd - availableStart) * hourWidth

        blocks.push({
          type: 'available',
          left,
          width,
          label: `Available ${Math.floor(availableStart)}:${String(Math.floor((availableStart % 1) * 60)).padStart(2, '0')} - ${Math.floor(availableEnd)}:${String(Math.floor((availableEnd % 1) * 60)).padStart(2, '0')}`
        })
      }

      currentHour = Math.max(currentHour, range.end)
    })

    // Add final unavailable block if needed
    if (currentHour < timeRange.end) {
      const left = (currentHour - timeRange.start) * hourWidth
      const width = (timeRange.end - currentHour) * hourWidth

      blocks.push({
        type: 'unavailable',
        left,
        width,
        label: 'Not Available'
      })
    }

    return blocks
  }

  const availabilityBlocks = generateAvailabilityBlocks()

  return (
    <div className={cn('absolute inset-0', className)}>
      {availabilityBlocks.map((block, index) => (
        <div
          key={index}
          className={cn(
            'absolute top-0 bottom-0 transition-all duration-200',
            block.type === 'available' 
              ? 'bg-green-50 border-l border-r border-green-200' 
              : 'bg-gray-100 border-l border-r border-gray-200'
          )}
          style={{
            left: block.left,
            width: block.width
          }}
          title={block.label}
        >
          {/* Availability indicator pattern */}
          {block.type === 'available' ? (
            <div className="absolute inset-0 bg-green-100 opacity-30" />
          ) : (
            <div className="absolute inset-0 bg-gray-200 opacity-40 bg-[repeating-linear-gradient(45deg,transparent,transparent_4px,rgba(0,0,0,0.1)_4px,rgba(0,0,0,0.1)_8px)]" />
          )}
        </div>
      ))}
    </div>
  )
} 