'use client'

import React, { useMemo } from 'react'
import { format } from 'date-fns'
import { motion } from 'framer-motion'
import { Clock } from 'lucide-react'
import { cn } from '@/lib/utils'

interface TimelineHeaderProps {
  timeSlots: Date[]
  hourWidth: number
}

export function TimelineHeader({ timeSlots, hourWidth }: TimelineHeaderProps) {
  const currentHour = new Date().getHours()
  
  return (
    <div className="bg-white border-b border-gray-200 sticky top-0 z-20">
      <div className="flex">
        {/* Worker Column Header */}
        <div className="w-64 bg-gray-50 border-r border-gray-200 flex items-center justify-center px-4 py-3">
          <div className="flex items-center gap-2 text-sm font-semibold text-gray-700">
            <Clock className="h-4 w-4" />
            Team Schedule
          </div>
        </div>

        {/* Time Slots */}
        <div className="flex-1 flex">
          {timeSlots.map((slot, index) => {
            const hour = slot.getHours()
            const isCurrentHour = hour === currentHour
            const isPeakHour = hour >= 9 && hour <= 17 // Business hours
            
            return (
              <motion.div
                key={slot.toISOString()}
                className={cn(
                  'relative flex flex-col items-center justify-center border-r border-gray-100 py-3',
                  isCurrentHour && 'bg-blue-50 border-blue-200',
                  isPeakHour && 'bg-gray-50/50'
                )}
                style={{ width: hourWidth }}
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.02 }}
              >
                {/* Hour */}
                <div className={cn(
                  'text-sm font-semibold',
                  isCurrentHour ? 'text-blue-600' : 'text-gray-900'
                )}>
                  {format(slot, 'HH:mm')}
                </div>
                
                {/* Time Period Label */}
                <div className={cn(
                  'text-xs',
                  isCurrentHour ? 'text-blue-500' : 'text-gray-500'
                )}>
                  {hour < 12 ? 'AM' : 'PM'}
                </div>

                {/* Current Time Indicator */}
                {isCurrentHour && (
                  <motion.div
                    className="absolute bottom-0 left-1/2 w-2 h-2 bg-blue-500 rounded-full transform -translate-x-1/2 translate-y-1"
                    animate={{
                      scale: [1, 1.2, 1],
                      opacity: [1, 0.7, 1],
                    }}
                    transition={{
                      duration: 2,
                      repeat: Infinity,
                      ease: "easeInOut"
                    }}
                  />
                )}

                {/* Peak Hours Indicator */}
                {isPeakHour && !isCurrentHour && (
                  <div className="absolute top-1 right-1 w-1 h-1 bg-amber-400 rounded-full" />
                )}
              </motion.div>
            )
          })}
        </div>
      </div>

      {/* Sub-header with intervals */}
      <div className="flex">
        {/* Empty space for worker column */}
        <div className="w-64"></div>
        
        {/* 15-minute intervals */}
        <div className="flex-1 flex border-t border-gray-100">
          {timeSlots.map((slot, index) => (
            <div 
              key={`intervals-${slot.toISOString()}`}
              className="relative"
              style={{ width: hourWidth }}
            >
              {/* Quarter hour marks */}
              {[15, 30, 45].map(minutes => (
                <div
                  key={minutes}
                  className="absolute top-0 h-2 w-px bg-gray-200"
                  style={{ left: (minutes / 60) * hourWidth }}
                />
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
} 