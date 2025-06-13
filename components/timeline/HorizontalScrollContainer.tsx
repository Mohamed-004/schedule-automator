'use client'

import React from 'react'
import { TimeRange, getTotalGridWidth } from '@/lib/timeline-grid'
import { cn } from '@/lib/utils'

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
  return (
    <div
      ref={scrollRef}
      className={cn("overflow-x-auto scrollbar-thin scrollbar-thumb-gray-300 hover:scrollbar-thumb-gray-400", className)}
    >
      <div
        ref={contentRef}
        className="relative"
        style={{ minWidth: getTotalGridWidth(timeRange) }}
      >
        {children}
      </div>
    </div>
  )
} 