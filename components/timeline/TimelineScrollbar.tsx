import React from 'react'
import { ChevronLeft, ChevronRight, Sun, Moon, Clock } from 'lucide-react'
import { cn } from '@/lib/utils'

interface TimelineScrollbarProps {
  scrollTo: (direction: 'left' | 'right' | 'start' | 'business' | 'end') => void
  canScrollLeft: boolean
  canScrollRight: boolean
}

export function TimelineScrollbar({ scrollTo, canScrollLeft, canScrollRight }: TimelineScrollbarProps) {
  const buttonStyle = "flex items-center gap-2 px-3 py-2 text-sm font-semibold text-gray-700 bg-white rounded-md border border-gray-300 shadow-sm hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
  const timeButtonStyle = "flex flex-col items-center gap-1 text-xs text-gray-600 hover:text-blue-600 transition-colors px-3 py-1 rounded-md hover:bg-gray-100"

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between mt-4 p-2 bg-gray-50/80 rounded-lg border gap-4">
      <button 
        onClick={() => scrollTo('left')} 
        disabled={!canScrollLeft}
        className={buttonStyle}
        aria-label="Scroll earlier"
      >
        <ChevronLeft className="w-5 h-5" />
        <span className="hidden sm:inline">Earlier</span>
      </button>

      <div className="flex items-center gap-2 sm:gap-4">
        <button onClick={() => scrollTo('start')} className={timeButtonStyle} aria-label="Scroll to start">
          <Clock className="w-5 h-5" />
          <span>Start</span>
        </button>
        <button onClick={() => scrollTo('business')} className={timeButtonStyle} aria-label="Scroll to morning">
          <Sun className="w-5 h-5" />
          <span>Morning</span>
        </button>
        <button onClick={() => scrollTo('end')} className={timeButtonStyle} aria-label="Scroll to evening">
          <Moon className="w-5 h-5" />
          <span>Evening</span>
        </button>
      </div>

      <button 
        onClick={() => scrollTo('right')} 
        disabled={!canScrollRight}
        className={buttonStyle}
        aria-label="Scroll later"
      >
        <span className="hidden sm:inline">Later</span>
        <ChevronRight className="w-5 h-5" />
      </button>
    </div>
  )
} 