'use client'

import React, { useState } from 'react'
import { Calendar, ChevronLeft, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'

interface DatePickerProps {
  selectedDate: Date
  onDateChange: (date: Date) => void
  className?: string
}

/**
 * DatePicker component for selecting specific days in the timeline
 * Shows current date and allows navigation through dates
 */
export function DatePicker({ selectedDate, onDateChange, className }: DatePickerProps) {
  const [isOpen, setIsOpen] = useState(false)

  // Format date for display
  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }

  // Format date for short display
  const formatShortDate = (date: Date) => {
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    })
  }

  // Navigation functions
  const goToPreviousDay = () => {
    const newDate = new Date(selectedDate)
    newDate.setDate(newDate.getDate() - 1)
    onDateChange(newDate)
  }

  const goToNextDay = () => {
    const newDate = new Date(selectedDate)
    newDate.setDate(newDate.getDate() + 1)
    onDateChange(newDate)
  }

  const goToToday = () => {
    onDateChange(new Date())
  }

  // Generate calendar days for current month
  const generateCalendarDays = () => {
    const year = selectedDate.getFullYear()
    const month = selectedDate.getMonth()
    const firstDay = new Date(year, month, 1)
    const lastDay = new Date(year, month + 1, 0)
    const startDate = new Date(firstDay)
    startDate.setDate(startDate.getDate() - firstDay.getDay()) // Start from Sunday

    const days = []
    const currentDate = new Date(startDate)

    for (let i = 0; i < 42; i++) { // 6 weeks × 7 days
      days.push(new Date(currentDate))
      currentDate.setDate(currentDate.getDate() + 1)
    }

    return days
  }

  const calendarDays = generateCalendarDays()
  const today = new Date()
  const isToday = (date: Date) => date.toDateString() === today.toDateString()
  const isSelected = (date: Date) => date.toDateString() === selectedDate.toDateString()
  const isCurrentMonth = (date: Date) => date.getMonth() === selectedDate.getMonth()

  return (
    <div className={cn('flex items-center gap-2', className)}>
      {/* Date Navigation */}
      <div className="flex items-center gap-1">
        <Button
          variant="ghost"
          size="sm"
          onClick={goToPreviousDay}
          className="h-8 w-8 p-0 hover:bg-gray-100"
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>

        <Popover open={isOpen} onOpenChange={setIsOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="ghost"
              className="flex items-center gap-2 hover:bg-gray-100 min-w-0"
            >
              <Calendar className="h-4 w-4 text-gray-500" />
              <span className="font-medium text-gray-900">
                <span className="hidden sm:inline">{formatDate(selectedDate)}</span>
                <span className="sm:hidden">{formatShortDate(selectedDate)}</span>
              </span>
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <div className="p-4">
              {/* Calendar Header */}
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold">
                  {selectedDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                </h3>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={goToToday}
                  className="text-xs"
                >
                  Today
                </Button>
              </div>

              {/* Calendar Grid */}
              <div className="grid grid-cols-7 gap-1 text-center">
                {/* Day headers */}
                {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map(day => (
                  <div key={day} className="text-xs font-medium text-gray-500 p-2">
                    {day}
                  </div>
                ))}

                {/* Calendar days */}
                {calendarDays.map((date, index) => (
                  <button
                    key={index}
                    onClick={() => {
                      onDateChange(date)
                      setIsOpen(false)
                    }}
                    className={cn(
                      'w-8 h-8 text-sm rounded-md hover:bg-gray-100 transition-colors',
                      {
                        'text-gray-400': !isCurrentMonth(date),
                        'bg-blue-600 text-white hover:bg-blue-700': isSelected(date),
                        'bg-blue-100 text-blue-700': isToday(date) && !isSelected(date),
                        'font-medium': isToday(date) || isSelected(date)
                      }
                    )}
                  >
                    {date.getDate()}
                  </button>
                ))}
              </div>
            </div>
          </PopoverContent>
        </Popover>

        <Button
          variant="ghost"
          size="sm"
          onClick={goToNextDay}
          className="h-8 w-8 p-0 hover:bg-gray-100"
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      {/* Quick Actions */}
      <div className="hidden md:flex items-center gap-1 ml-2">
        {!isToday(selectedDate) && (
          <Button
            variant="outline"
            size="sm"
            onClick={goToToday}
            className="text-xs"
          >
            Today
          </Button>
        )}
      </div>
    </div>
  )
} 