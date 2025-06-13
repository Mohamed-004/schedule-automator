'use client'

import React, { useRef, useEffect, useState, useCallback } from 'react'
import { ChevronLeft, ChevronRight, Clock, Sun, Moon } from 'lucide-react'
import { TimeRange } from '@/lib/timeline-grid'

interface HorizontalScrollContainerProps {
  children: React.ReactNode
  timeRange: TimeRange
  className?: string
  showScrollIndicators?: boolean
  autoScrollToBusiness?: boolean
}

interface ScrollIndicator {
  position: number
  label: string
  icon: React.ReactNode
  description: string
}

export default function HorizontalScrollContainer({
  children,
  timeRange,
  className = '',
  showScrollIndicators = true,
  autoScrollToBusiness = true
}: HorizontalScrollContainerProps) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const [canScrollLeft, setCanScrollLeft] = useState(false)
  const [canScrollRight, setCanScrollRight] = useState(false)
  const [isScrolling, setIsScrolling] = useState(false)
  const [scrollProgress, setScrollProgress] = useState(0)

  // Calculate scroll indicators based on time range
  const scrollIndicators: ScrollIndicator[] = [
    {
      position: 0,
      label: 'Start',
      icon: <Sun className="w-4 h-4" />,
      description: `${timeRange.startHour}:00`
    },
    {
      position: 0.33,
      label: 'Morning',
      icon: <Clock className="w-4 h-4" />,
      description: '9:00 AM'
    },
    {
      position: 0.66,
      label: 'Evening',
      icon: <Clock className="w-4 h-4" />,
      description: '5:00 PM'
    },
    {
      position: 1,
      label: 'End',
      icon: <Moon className="w-4 h-4" />,
      description: `${timeRange.endHour}:00`
    }
  ]

  // Update scroll state
  const updateScrollState = useCallback(() => {
    if (!scrollRef.current) return

    const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current
    const maxScroll = scrollWidth - clientWidth

    setCanScrollLeft(scrollLeft > 0)
    setCanScrollRight(scrollLeft < maxScroll - 1) // -1 for rounding
    setScrollProgress(maxScroll > 0 ? scrollLeft / maxScroll : 0)
  }, [])

  // Smooth scroll to position
  const scrollToPosition = useCallback((position: number) => {
    if (!scrollRef.current) return

    const { scrollWidth, clientWidth } = scrollRef.current
    const maxScroll = scrollWidth - clientWidth
    const targetScroll = position * maxScroll

    setIsScrolling(true)
    scrollRef.current.scrollTo({
      left: targetScroll,
      behavior: 'smooth'
    })

    // Reset scrolling state after animation
    setTimeout(() => setIsScrolling(false), 500)
  }, [])

  // Scroll by amount
  const scrollBy = useCallback((amount: number) => {
    if (!scrollRef.current) return

    setIsScrolling(true)
    scrollRef.current.scrollBy({
      left: amount,
      behavior: 'smooth'
    })

    setTimeout(() => setIsScrolling(false), 300)
  }, [])

  // Auto-scroll to business hours on mount
  useEffect(() => {
    if (autoScrollToBusiness && scrollRef.current) {
      // Delay to ensure content is rendered
      setTimeout(() => {
        scrollToPosition(0.33) // Scroll to morning/business hours
      }, 100)
    }
  }, [autoScrollToBusiness, scrollToPosition])

  // Set up scroll event listener
  useEffect(() => {
    const scrollElement = scrollRef.current
    if (!scrollElement) return

    const handleScroll = () => {
      if (!isScrolling) {
        updateScrollState()
      }
    }

    scrollElement.addEventListener('scroll', handleScroll, { passive: true })
    updateScrollState() // Initial state

    return () => scrollElement.removeEventListener('scroll', handleScroll)
  }, [updateScrollState, isScrolling])

  // Handle resize
  useEffect(() => {
    const handleResize = () => updateScrollState()
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [updateScrollState])

  return (
    <div className="relative">
      {/* Scroll Navigation Bar - Responsive */}
      {showScrollIndicators && (
        <div className="flex flex-col sm:flex-row items-center justify-between mb-2 sm:mb-4 p-2 sm:p-3 bg-gray-50 rounded-lg border gap-2 sm:gap-0">
          {/* Left Scroll Button */}
          <button
            onClick={() => scrollBy(-200)}
            disabled={!canScrollLeft}
            className={`flex items-center gap-1 sm:gap-2 px-2 sm:px-3 py-1 sm:py-2 rounded-md text-xs sm:text-sm font-medium transition-all ${
              canScrollLeft
                ? 'bg-blue-500 text-white hover:bg-blue-600 shadow-sm'
                : 'bg-gray-200 text-gray-400 cursor-not-allowed'
            }`}
          >
            <ChevronLeft className="w-3 h-3 sm:w-4 sm:h-4" />
            <span className="hidden sm:inline">Earlier</span>
          </button>

          {/* Quick Jump Indicators - Responsive */}
          <div className="flex items-center gap-1 sm:gap-2 overflow-x-auto">
            {scrollIndicators.map((indicator, index) => (
              <button
                key={index}
                onClick={() => scrollToPosition(indicator.position)}
                className="flex flex-col items-center gap-0.5 sm:gap-1 px-1 sm:px-3 py-1 sm:py-2 rounded-md text-xs hover:bg-white hover:shadow-sm transition-all group whitespace-nowrap"
                title={`Jump to ${indicator.description}`}
              >
                <div className="flex items-center gap-0.5 sm:gap-1 text-gray-600 group-hover:text-blue-600">
                  {React.cloneElement(indicator.icon as React.ReactElement, { 
                    className: "w-3 h-3 sm:w-4 sm:h-4" 
                  })}
                  <span className="font-medium text-xs sm:text-sm">{indicator.label}</span>
                </div>
                <span className="text-gray-500 group-hover:text-blue-500 text-xs">
                  {indicator.description}
                </span>
              </button>
            ))}
          </div>

          {/* Right Scroll Button */}
          <button
            onClick={() => scrollBy(200)}
            disabled={!canScrollRight}
            className={`flex items-center gap-1 sm:gap-2 px-2 sm:px-3 py-1 sm:py-2 rounded-md text-xs sm:text-sm font-medium transition-all ${
              canScrollRight
                ? 'bg-blue-500 text-white hover:bg-blue-600 shadow-sm'
                : 'bg-gray-200 text-gray-400 cursor-not-allowed'
            }`}
          >
            <span className="hidden sm:inline">Later</span>
            <ChevronRight className="w-3 h-3 sm:w-4 sm:h-4" />
          </button>
        </div>
      )}

      {/* Progress Bar */}
      {showScrollIndicators && (
        <div className="mb-4">
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-blue-500 h-2 rounded-full transition-all duration-300"
              style={{ width: `${scrollProgress * 100}%` }}
            />
          </div>
          <div className="flex justify-between text-xs text-gray-500 mt-1">
            <span>{timeRange.startHour}:00</span>
            <span className="font-medium">
              Timeline ({timeRange.totalHours} hours)
            </span>
            <span>{timeRange.endHour}:00</span>
          </div>
        </div>
      )}

      {/* Scroll Container */}
      <div
        ref={scrollRef}
        className={`
          overflow-x-auto overflow-y-hidden
          scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100
          hover:scrollbar-thumb-gray-400
          ${className}
        `}
        style={{
          // Ensure proper scrolling behavior
          scrollBehavior: isScrolling ? 'smooth' : 'auto',
          // Hide scrollbar on mobile but keep functionality
          scrollbarWidth: 'thin',
          WebkitOverflowScrolling: 'touch'
        }}
      >
        {/* Content with proper width */}
        <div
          style={{
            minWidth: '100%',
            width: 'max-content'
          }}
        >
          {children}
        </div>
      </div>

      {/* Scroll Shadows */}
      <div
        className={`absolute left-0 top-0 bottom-0 w-8 bg-gradient-to-r from-white to-transparent pointer-events-none transition-opacity duration-300 ${
          canScrollLeft ? 'opacity-100' : 'opacity-0'
        }`}
        style={{ zIndex: 10 }}
      />
      <div
        className={`absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-white to-transparent pointer-events-none transition-opacity duration-300 ${
          canScrollRight ? 'opacity-100' : 'opacity-0'
        }`}
        style={{ zIndex: 10 }}
      />

      {/* Mobile Touch Indicators */}
      <div className="md:hidden">
        {canScrollLeft && (
          <div className="absolute left-2 top-1/2 transform -translate-y-1/2 bg-blue-500 text-white p-2 rounded-full shadow-lg animate-pulse">
            <ChevronLeft className="w-4 h-4" />
          </div>
        )}
        {canScrollRight && (
          <div className="absolute right-2 top-1/2 transform -translate-y-1/2 bg-blue-500 text-white p-2 rounded-full shadow-lg animate-pulse">
            <ChevronRight className="w-4 h-4" />
          </div>
        )}
      </div>
    </div>
  )
} 