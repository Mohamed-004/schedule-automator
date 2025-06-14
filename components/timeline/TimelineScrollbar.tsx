import React from 'react'
import { ChevronLeft, ChevronRight, Sun, Moon, Clock } from 'lucide-react'
import { cn } from '@/lib/utils'

interface TimelineScrollbarProps {
  scrollTo: (direction: 'left' | 'right' | 'start' | 'business' | 'end') => void
  canScrollLeft: boolean
  canScrollRight: boolean
}

export function TimelineScrollbar({ scrollTo, canScrollLeft, canScrollRight }: TimelineScrollbarProps) {
  const buttonStyle = "flex items-center justify-center gap-1 px-3 py-2 text-sm font-medium text-gray-700 bg-white rounded-md border border-gray-300 shadow-sm hover:bg-gray-50 hover:text-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
  const timeButtonStyle = "flex flex-col items-center justify-center gap-1 text-xs font-medium text-gray-600 hover:text-blue-600 transition-colors px-2 sm:px-3 py-1.5 rounded-md hover:bg-blue-50 border border-transparent hover:border-blue-100"

  return (
    <div className="flex flex-col sm:flex-row items-center justify-center mt-4 p-2 sm:p-3 bg-gray-50/80 rounded-lg border gap-3 sm:gap-6">
      <button 
        onClick={() => scrollTo('left')} 
        disabled={!canScrollLeft}
        className={cn(buttonStyle, "w-full sm:w-auto")}
        aria-label="Scroll earlier"
      >
        <ChevronLeft className="w-4 h-4" />
        <span>Earlier</span>
      </button>

      <div className="flex items-center justify-center gap-2 sm:gap-4">
        <button onClick={() => scrollTo('start')} className={timeButtonStyle} aria-label="Scroll to start">
          <Clock className="w-4 h-4" />
          <span>Start</span>
        </button>
        <button onClick={() => scrollTo('business')} className={timeButtonStyle} aria-label="Scroll to morning">
          <Sun className="w-4 h-4" />
          <span>Morning</span>
        </button>
        <button onClick={() => scrollTo('end')} className={timeButtonStyle} aria-label="Scroll to evening">
          <Moon className="w-4 h-4" />
          <span>Evening</span>
        </button>
      </div>

      <button 
        onClick={() => scrollTo('right')} 
        disabled={!canScrollRight}
        className={cn(buttonStyle, "w-full sm:w-auto")}
        aria-label="Scroll later"
      >
        <span>Later</span>
        <ChevronRight className="w-4 h-4" />
      </button>
    </div>
  )
} 