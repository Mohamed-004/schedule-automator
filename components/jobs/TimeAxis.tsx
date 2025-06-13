'use client'

import React, { useRef } from 'react'
import { Clock } from 'lucide-react'
import { cn } from '@/lib/utils'

// Import TimeRange interface for consistency
interface TimeRange {
  startHour: number
  endHour: number
  totalHours: number
}

interface TimeAxisProps {
  timeRange: TimeRange
  zoomLevel: '1hr'
  onZoomChange: (level: '1hr') => void
  viewMode: 'day' | 'week'
}

export function TimeAxis({ 
  timeRange, 
  zoomLevel, 
  onZoomChange,
  viewMode 
}: TimeAxisProps) {
  // Reference to the time grid container for positioning calculations
  const timeGridRef = useRef<HTMLDivElement>(null)

  const { startHour, endHour, totalHours } = timeRange
  
  // Calculate intervals based on zoom level (only 1hr supported now)
  const getIntervals = () => {
    const intervals = []
    
    for (let hour = startHour; hour <= endHour; hour++) {
      intervals.push({ hour, minute: 0, isHour: true })
    }
    
    return intervals
  }

  const intervals = getIntervals()

  return (
    <div className="sticky top-0 z-40 bg-white/95 backdrop-blur-sm border-b border-gray-200 shadow-sm supports-[position:sticky]:sticky">
      {/* Time Controls */}
      <div className="flex items-center justify-between px-2 sm:px-4 py-2 border-b border-gray-100 bg-gradient-to-r from-gray-50 to-gray-100">
        <div className="flex items-center gap-1 sm:gap-2">
          <Clock className="h-3 w-3 sm:h-4 sm:w-4 text-gray-500" />
          <span className="text-xs sm:text-sm font-medium text-gray-700">
            {viewMode === 'day' ? 'Daily Schedule' : 'Weekly Schedule'}
          </span>
          <span className="text-xs text-gray-500 hidden sm:inline">
            {startHour}:00 - {endHour}:00
          </span>
        </div>
      </div>

      {/* Time Grid */}
      <div className="relative" ref={timeGridRef}>
        {/* Worker Column Spacer */}
        <div className="absolute left-0 top-0 w-48 sm:w-64 h-full bg-gradient-to-r from-gray-50 to-gray-100 border-r border-gray-300 z-10">
          <div className="flex items-center justify-center h-12 sm:h-14 text-xs sm:text-sm font-semibold text-gray-700">
            <Clock className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
            <span className="hidden sm:inline">Team Schedule</span>
            <span className="sm:hidden">Team</span>
          </div>
        </div>

        {/* Time Markers - Made scrollable on mobile */}
        <div className="flex h-12 sm:h-14 pl-48 sm:pl-64 overflow-x-auto">
          {intervals.map((interval, index) => {
            const width = `${100 / intervals.length}%`
            
            return (
              <div
                key={`${interval.hour}-${interval.minute}`}
                className="relative border-r border-gray-100 last:border-r-0 min-w-[60px] sm:min-w-[80px]"
                style={{ width }}
              >
                {/* Hour Markers - Enhanced with better visual hierarchy */}
                {interval.isHour && (
                  <>
                    <div className="absolute top-0 left-0 h-full w-px bg-gray-300" />
                    <div className="absolute top-2 left-2 text-xs font-semibold text-gray-700">
                      {(() => {
                        const date = new Date()
                        date.setHours(interval.hour, 0, 0, 0)
                        return date.toLocaleTimeString('en-US', { hour: 'numeric', hour12: true }).replace(' ', '')
                      })()}
                    </div>
                    {/* Hour background shading for better contrast */}
                    <div className={cn(
                      "absolute inset-0 -z-10",
                      index % 2 === 0 ? "bg-gray-50/50" : "bg-white"
                    )} />
                  </>
                )}

                {/* Business hours highlighting */}
                {interval.hour >= 9 && interval.hour < 17 && interval.isHour && (
                  <div className="absolute inset-0 bg-blue-50/40 border-l border-blue-100/50" />
                )}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
} 