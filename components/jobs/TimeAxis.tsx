'use client'

import React, { useState, useEffect, useRef } from 'react'
import { format } from 'date-fns'
import { Clock } from 'lucide-react'
import { cn } from '@/lib/utils'

interface TimeAxisProps {
  startHour?: number
  endHour?: number
  zoomLevel: '1hr'
  onZoomChange: (level: '1hr') => void
  viewMode: 'day' | 'week'
}

export function TimeAxis({ 
  startHour = 6, 
  endHour = 22, 
  zoomLevel, 
  onZoomChange,
  viewMode 
}: TimeAxisProps) {
  // Local state for reactive "now" indicator with seconds for smooth updates
  const [now, setNow] = useState<Date>(() => new Date())
  const [mounted, setMounted] = useState(false)
  
  // Reference to the time grid container for positioning calculations
  const timeGridRef = useRef<HTMLDivElement>(null)

  // Update current time every minute to keep the indicator accurate
  useEffect(() => {
    setMounted(true)
    // Update every 60 seconds for smoother animation
    const id = setInterval(() => setNow(new Date()), 60000)
    return () => clearInterval(id)
  }, [])

  const totalHours = endHour - startHour
  
  // Calculate intervals based on zoom level (only 1hr supported now)
  const getIntervals = () => {
    const intervals = []
    
    for (let hour = startHour; hour <= endHour; hour++) {
      intervals.push({ hour, minute: 0, isHour: true })
    }
    
    return intervals
  }

  const intervals = getIntervals()
  
  // Calculate current time position more precisely
  const getCurrentTimePosition = () => {
    if (!mounted) return null;
    
    const currentHour = now.getHours()
    const currentMinute = now.getMinutes()
    
    // Check if current time is within the displayed range
    if (currentHour < startHour || currentHour > endHour) {
      return null;
    }
    
    // Calculate the exact position based on hours and minutes since startHour
    const hoursSinceStart = currentHour - startHour
    const minutesFraction = currentMinute / 60
    
    // Position as percentage of total timeline width
    const position = (hoursSinceStart + minutesFraction) / totalHours * 100
    return position;
  }
  
  const currentTimePosition = getCurrentTimePosition();
  const currentTimeString = mounted ? format(now, 'h:mm a') : '--:--';

  return (
    <div className="sticky top-0 z-40 bg-white border-b border-gray-200 shadow-sm">
      {/* Time Controls */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-gray-100 bg-gradient-to-r from-gray-50 to-gray-100">
        <div className="flex items-center gap-2">
          <Clock className="h-4 w-4 text-gray-500" />
          <span className="text-sm font-medium text-gray-700">
            {viewMode === 'day' ? 'Daily Schedule' : 'Weekly Schedule'}
          </span>
          <span className="text-xs text-gray-500">
            {startHour}:00 - {endHour}:00
          </span>
        </div>
      </div>

      {/* Time Grid */}
      <div className="relative" ref={timeGridRef}>
        {/* Worker Column Spacer */}
        <div className="absolute left-0 top-0 w-64 h-full bg-gradient-to-r from-gray-50 to-gray-100 border-r border-gray-300 z-10">
          <div className="flex items-center justify-center h-14 text-sm font-semibold text-gray-700">
            <Clock className="h-4 w-4 mr-2" />
            Team Schedule
          </div>
        </div>

        {/* Time Markers - Made scrollable on mobile */}
        <div className="flex h-14 pl-64 overflow-x-auto">
          {intervals.map((interval, index) => {
            const width = `${100 / intervals.length}%`
            
            return (
              <div
                key={`${interval.hour}-${interval.minute}`}
                className="relative border-r border-gray-100 last:border-r-0 min-w-[80px]"
                style={{ width }}
              >
                {/* Hour Markers - Enhanced with better visual hierarchy */}
                {interval.isHour && (
                  <>
                    <div className="absolute top-0 left-0 h-full w-[2px] bg-gray-300" />
                    <div className="absolute top-2 left-2 text-sm font-bold text-gray-800">
                      {format(new Date().setHours(interval.hour, 0), 'h a')}
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

        {/* Current Time Indicator - Enhanced with better visibility and positioning */}
        {currentTimePosition !== null && (
          <div 
            className="absolute top-0 bottom-0 w-[2px] bg-red-500 z-50 pointer-events-none shadow-md transition-all duration-500 ease-linear"
            style={{ 
              left: `calc(256px + ((100% - 256px) * ${currentTimePosition / 100}))`,
              transition: 'left 60s linear' // Smooth movement every minute
            }}
          >
            {/* Pulsing Dot with Label */}
            <div className="absolute -top-0.5 -translate-x-1/2 z-20">
              <div className="relative flex flex-col items-center">
                {/* Now Label with Time */}
                <div className="bg-red-600 text-white text-xs px-2 py-0.5 rounded shadow-lg flex items-center gap-1 whitespace-nowrap mb-1 font-medium">
                  <span>NOW</span>
                  <span className="font-mono">— {currentTimeString}</span>
                </div>
                
                {/* Pulsing Dot */}
                <div className="relative h-4 w-4 flex items-center justify-center">
                  <div className="absolute w-4 h-4 bg-red-500 rounded-full animate-ping opacity-75"></div>
                  <div className="absolute w-3 h-3 bg-red-600 rounded-full"></div>
                </div>
              </div>
            </div>
            
            {/* Line itself - semi-transparent gradient for visual clarity */}
            <div className="absolute inset-0 bg-gradient-to-b from-red-500 to-red-400/70"></div>
          </div>
        )}
      </div>
    </div>
  )
} 