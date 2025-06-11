'use client'

import React from 'react'
import { format, addDays, startOfWeek, isSameDay, isToday } from 'date-fns'
import { motion } from 'framer-motion'
import { Clock } from 'lucide-react'
import { cn } from '@/lib/utils'

interface WeekTimelineHeaderProps {
  selectedDate: Date
  hourWidth: number
}

export function WeekTimelineHeader({ selectedDate, hourWidth }: WeekTimelineHeaderProps) {
  const weekStart = startOfWeek(selectedDate, { weekStartsOn: 1 }) // Monday start
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i))
  
  return (
    <div className="bg-white border-b border-gray-200 sticky top-0 z-20">
      {/* Day Headers Only - No Timeline Times */}
      <div className="flex">
        {/* Worker Column Header */}
        <div className="w-64 bg-gray-50 border-r border-gray-200 flex items-center justify-center px-4 py-4">
          <div className="flex items-center gap-2 text-sm font-semibold text-gray-700">
            <Clock className="h-4 w-4" />
            <span className="hidden sm:inline">Team Schedule</span>
            <span className="sm:hidden">Team</span>
          </div>
        </div>

        {/* Days of Week - Clean Layout */}
        <div className="flex-1 grid grid-cols-7">
          {weekDays.map((day, dayIndex) => (
            <div
              key={day.toISOString()}
              className={cn(
                'border-r border-gray-100 last:border-r-0 p-3 text-center min-h-[60px] flex flex-col justify-center transition-colors',
                isToday(day) ? 'bg-blue-50/70' : 'bg-gray-50/50',
                isSameDay(day, selectedDate) && 'bg-blue-50 ring-1 ring-inset ring-blue-200'
              )}
            >
              <div className={cn(
                'text-sm font-semibold',
                isToday(day) ? 'text-blue-600' : 'text-gray-700'
              )}>
                {format(day, 'EEE')}
              </div>
              <div className={cn(
                'text-xl font-bold mt-1',
                isToday(day) ? 'text-blue-600' : 'text-gray-900'
              )}>
                {format(day, 'd')}
              </div>
              <div className={cn(
                'text-xs mt-1',
                isToday(day) ? 'text-blue-500' : 'text-gray-500'
              )}>
                {format(day, 'MMM')}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
} 