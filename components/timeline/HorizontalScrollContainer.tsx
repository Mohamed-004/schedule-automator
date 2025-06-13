'use client'

import React, { useEffect } from 'react'
import { TimeRange, getTotalGridWidth } from '@/lib/timeline-grid'
import { cn } from '@/lib/utils'
import { useResponsiveTimelineWidth } from '@/hooks/use-timeline-coordinates'

interface HorizontalScrollContainerProps {
  children: React.ReactNode
  className?: string
  timeRange: TimeRange
  scrollRef: React.RefObject<HTMLDivElement>
  contentRef: React.RefObject<HTMLDivElement>
}

export default function HorizontalScrollContainer({
  children,
  className,
  timeRange,
  scrollRef,
  contentRef,
}: HorizontalScrollContainerProps) {
  // Use the responsive width hook to adapt to viewport size
  const { responsiveWidth, isResponsive } = useResponsiveTimelineWidth(timeRange)
  
  // Get the fixed width as fallback
  const fixedWidth = getTotalGridWidth(timeRange)
  
  // Apply the width to the content element when it changes
  useEffect(() => {
    if (contentRef.current && isResponsive && responsiveWidth) {
      // Update the CSS variable for hour width if needed
      document.documentElement.style.setProperty('--timeline-hour-width', `${responsiveWidth / timeRange.totalHours}px`);
    }
  }, [responsiveWidth, isResponsive, timeRange.totalHours, contentRef]);

  return (
    <div
      ref={scrollRef}
      className={cn(
        "overflow-x-auto scrollbar-hide w-full",
        "transition-all duration-300 ease-in-out",
        className
      )}
    >
      <div
        ref={contentRef}
        className={cn(
          "relative w-full",
          isResponsive && "xl:transition-all xl:duration-300"
        )}
        style={{ 
          minWidth: isResponsive && responsiveWidth ? responsiveWidth : fixedWidth,
          width: isResponsive && responsiveWidth ? '100%' : undefined
        }}
      >
        {children}
      </div>
    </div>
  )
} 