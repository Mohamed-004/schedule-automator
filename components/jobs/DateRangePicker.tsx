'use client'

import React, { useState } from 'react'
import { format, addDays, startOfWeek, endOfWeek, isSameDay } from 'date-fns'
import { motion, AnimatePresence } from 'framer-motion'
import { Calendar, ChevronDown, ChevronLeft, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'

interface DateRangePickerProps {
  selectedDate: Date
  onDateChange: (date: Date) => void
  viewMode: 'day' | 'week'
  onViewModeChange: (mode: 'day' | 'week') => void
}

export function DateRangePicker({ 
  selectedDate, 
  onDateChange, 
  viewMode, 
  onViewModeChange 
}: DateRangePickerProps) {
  const [isOpen, setIsOpen] = useState(false)

  const goToPrevious = () => {
    if (viewMode === 'day') {
      onDateChange(addDays(selectedDate, -1))
    } else {
      onDateChange(addDays(selectedDate, -7))
    }
  }

  const goToNext = () => {
    if (viewMode === 'day') {
      onDateChange(addDays(selectedDate, 1))
    } else {
      onDateChange(addDays(selectedDate, 7))
    }
  }

  const goToToday = () => {
    onDateChange(new Date())
  }

  const getDisplayText = () => {
    if (viewMode === 'day') {
      const isToday = isSameDay(selectedDate, new Date())
      if (isToday) return 'Today'
      return format(selectedDate, 'MMM d, yyyy')
    } else {
      const weekStart = startOfWeek(selectedDate, { weekStartsOn: 1 })
      const weekEnd = endOfWeek(selectedDate, { weekStartsOn: 1 })
      
      if (weekStart.getMonth() === weekEnd.getMonth()) {
        return `${format(weekStart, 'MMM d')} - ${format(weekEnd, 'd, yyyy')}`
      } else {
        return `${format(weekStart, 'MMM d')} - ${format(weekEnd, 'MMM d, yyyy')}`
      }
    }
  }

  const quickDates = [
    { label: 'Today', date: new Date() },
    { label: 'Tomorrow', date: addDays(new Date(), 1) },
    { label: 'This Week', date: new Date(), isWeek: true },
    { label: 'Next Week', date: addDays(new Date(), 7), isWeek: true },
  ]

  return (
    <div className="relative">
      {/* View Mode Toggle */}
      <div className="flex items-center gap-2 mb-3">
        <div className="flex bg-gray-100 rounded-lg p-1">
          <button
            onClick={() => onViewModeChange('day')}
            className={cn(
              'px-3 py-1.5 text-sm font-medium rounded-md transition-all',
              viewMode === 'day'
                ? 'bg-white text-blue-600 shadow-sm'
                : 'text-gray-600 hover:text-gray-800'
            )}
          >
            Day View
          </button>
          <button
            onClick={() => onViewModeChange('week')}
            className={cn(
              'px-3 py-1.5 text-sm font-medium rounded-md transition-all',
              viewMode === 'week'
                ? 'bg-white text-blue-600 shadow-sm'
                : 'text-gray-600 hover:text-gray-800'
            )}
          >
            Week View
          </button>
        </div>
      </div>

      {/* Date Navigation */}
      <div className="flex items-center gap-2">
        {/* Previous Button */}
        <Button
          variant="outline"
          size="sm"
          onClick={goToPrevious}
          className="h-9 w-9 p-0"
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>

        {/* Date Display & Picker */}
        <div className="relative">
          <button
            onClick={() => setIsOpen(!isOpen)}
            className={cn(
              'flex items-center gap-2 px-3 py-2 bg-white border border-gray-200 rounded-lg',
              'hover:bg-gray-50 transition-colors min-w-[200px] justify-between',
              isOpen && 'border-blue-300 ring-2 ring-blue-100'
            )}
          >
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-gray-500" />
              <span className="text-sm font-medium text-gray-900">
                {getDisplayText()}
              </span>
            </div>
            <ChevronDown className={cn(
              'h-4 w-4 text-gray-500 transition-transform',
              isOpen && 'rotate-180'
            )} />
          </button>

          {/* Dropdown Menu */}
          <AnimatePresence>
            {isOpen && (
              <motion.div
                initial={{ opacity: 0, y: -10, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -10, scale: 0.95 }}
                transition={{ duration: 0.15 }}
                className="absolute top-full left-0 mt-2 w-64 bg-white rounded-lg border border-gray-200 shadow-lg z-50"
              >
                <div className="p-3 border-b border-gray-100">
                  <h3 className="text-sm font-semibold text-gray-900 mb-2">Quick Select</h3>
                  <div className="grid grid-cols-2 gap-2">
                    {quickDates.map((item) => (
                      <button
                        key={item.label}
                        onClick={() => {
                          if (item.isWeek) {
                            onViewModeChange('week')
                          }
                          onDateChange(item.date)
                          setIsOpen(false)
                        }}
                        className="p-2 text-sm text-left hover:bg-gray-50 rounded-md transition-colors"
                      >
                        {item.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="p-3">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Custom Date
                  </label>
                  <input
                    type="date"
                    value={format(selectedDate, 'yyyy-MM-dd')}
                    onChange={(e) => {
                      onDateChange(new Date(e.target.value))
                      setIsOpen(false)
                    }}
                    className="w-full px-3 py-2 border border-gray-200 rounded-md text-sm focus:ring-2 focus:ring-blue-100 focus:border-blue-300"
                  />
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Next Button */}
        <Button
          variant="outline"
          size="sm"
          onClick={goToNext}
          className="h-9 w-9 p-0"
        >
          <ChevronRight className="h-4 w-4" />
        </Button>

        {/* Today Button */}
        <Button
          variant="outline"
          size="sm"
          onClick={goToToday}
          className="text-sm"
        >
          Today
        </Button>
      </div>

      {/* Click outside to close */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setIsOpen(false)}
        />
      )}
    </div>
  )
} 