'use client'

import React, { useState, useRef, useEffect } from 'react'
import { cn } from '@/lib/utils'
import { TimelineHeader } from './TimelineHeader'
import { TimelineSidebar } from './TimelineSidebar'
import { TimelineGrid } from './TimelineGrid'
import { TimelineModal } from './TimelineModal'
import { useTimelineData } from '@/hooks/useTimelineData'
import { TimelineJob } from '@/lib/types'

interface TimelineContainerProps {
  className?: string
}

/**
 * Main timeline container with proper responsive layout
 * Features: Fixed sidebar, scrollable timeline, synchronized scrolling
 */
export function TimelineContainer({ className }: TimelineContainerProps) {
  const [selectedDate, setSelectedDate] = useState(new Date())
  const [selectedJob, setSelectedJob] = useState<TimelineJob | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [scrollPosition, setScrollPosition] = useState(0)
  
  // Refs for scroll synchronization
  const headerScrollRef = useRef<HTMLDivElement>(null)
  const contentScrollRef = useRef<HTMLDivElement>(null)

  // Fetch real timeline data
  const {
    workersData,
    timelineConfig,
    isLoading,
    error,
    refreshData,
    stats
  } = useTimelineData(selectedDate)

  // Handle synchronized scrolling
  const handleScrollSync = (scrollLeft: number, source: 'header' | 'content') => {
    setScrollPosition(scrollLeft)
    
    if (source === 'header' && contentScrollRef.current) {
      contentScrollRef.current.scrollLeft = scrollLeft
    } else if (source === 'content' && headerScrollRef.current) {
      headerScrollRef.current.scrollLeft = scrollLeft
    }
  }

  // Handle job interactions
  const handleJobClick = (job: TimelineJob) => {
    setSelectedJob(job)
    setIsModalOpen(true)
  }

  const handleJobReassign = (job: TimelineJob) => {
    // TODO: Implement job reassignment logic
    console.log('Reassigning job:', job)
  }

  const handleModalClose = () => {
    setIsModalOpen(false)
    setSelectedJob(null)
  }

  // Loading state
  if (isLoading) {
    return (
      <div className={cn('flex flex-col h-full bg-gray-50', className)}>
        <div className="animate-pulse">
          <div className="h-32 bg-gray-200 mb-4" />
          <div className="space-y-4 p-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="flex gap-4">
                <div className="w-12 h-12 bg-gray-200 rounded-full" />
                <div className="flex-1 h-20 bg-gray-200 rounded-lg" />
              </div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  // Error state
  if (error) {
    return (
      <div className={cn('flex flex-col h-full bg-gray-50', className)}>
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center p-8">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4 mx-auto">
              <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">Unable to Load Timeline</h3>
            <p className="text-gray-600 mb-4">{error}</p>
            <button
              onClick={refreshData}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
            >
              Try Again
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className={cn('flex flex-col h-screen bg-gray-50 overflow-hidden', className)}>
      {/* Timeline Header with Stats */}
      <TimelineHeader
        selectedDate={selectedDate}
        onDateChange={setSelectedDate}
        stats={stats}
        className="flex-shrink-0"
      />

      {/* Main Timeline Layout */}
      <div className="flex-1 flex overflow-hidden">
        {/* Desktop Layout: Sidebar + Timeline */}
        <div className="hidden lg:flex flex-1 overflow-hidden">
          {/* Fixed Sidebar */}
          <TimelineSidebar
            workersData={workersData}
            onWorkerSelect={(workerId) => console.log('Selected worker:', workerId)}
            className="flex-shrink-0"
            style={{ width: `${timelineConfig.workerColumnWidth}px` }}
          />

          {/* Scrollable Timeline */}
          <div className="flex-1 flex flex-col overflow-hidden">
            {/* Time Header */}
            <div
              ref={headerScrollRef}
              className="bg-white border-b border-gray-200 overflow-x-auto scrollbar-thin"
              onScroll={(e) => handleScrollSync(e.currentTarget.scrollLeft, 'header')}
            >
              <TimelineGrid
                workersData={workersData}
                timelineConfig={timelineConfig}
                onJobClick={handleJobClick}
                onJobReassign={handleJobReassign}
                showHeaderOnly={true}
                className="min-w-fit"
              />
            </div>

            {/* Timeline Content */}
            <div
              ref={contentScrollRef}
              className="flex-1 overflow-auto scrollbar-thin"
              onScroll={(e) => handleScrollSync(e.currentTarget.scrollLeft, 'content')}
            >
              <TimelineGrid
                workersData={workersData}
                timelineConfig={timelineConfig}
                onJobClick={handleJobClick}
                onJobReassign={handleJobReassign}
                showContentOnly={true}
                className="min-w-fit"
              />
            </div>
          </div>
        </div>

        {/* Mobile/Tablet Layout: Stacked Cards */}
        <div className="lg:hidden flex-1 overflow-auto">
          <div className="p-4 space-y-4">
            <TimelineGrid
              workersData={workersData}
              timelineConfig={timelineConfig}
              onJobClick={handleJobClick}
              onJobReassign={handleJobReassign}
              isMobileLayout={true}
            />
          </div>
        </div>
      </div>

      {/* Job Details Modal */}
      {selectedJob && (
        <TimelineModal
          job={selectedJob}
          isOpen={isModalOpen}
          onClose={handleModalClose}
          onEdit={(job) => {
            console.log('Editing job:', job)
            handleModalClose()
          }}
          onReassign={(job) => {
            handleJobReassign(job)
            handleModalClose()
          }}
          onCancel={(job) => {
            console.log('Cancelling job:', job)
            handleModalClose()
          }}
        />
      )}
    </div>
  )
} 