'use client'

import React, { useState, useEffect, useMemo } from 'react'
import { format, startOfDay, addDays } from 'date-fns'
import { Calendar, Users, Clock, TrendingUp } from 'lucide-react'
import { cn } from '@/lib/utils'

// Grid system imports
import { 
  calculateOptimalTimeRange,
  TimeRange,
  GRID_CONFIG
} from '@/lib/timeline-grid'

// Component imports
import { TimelineGrid } from './TimelineGrid'
import { TimelineHeader } from './TimelineHeader'
import { GridAlignedJob } from './GridAlignedJob'
import { GridAlignedAvailability } from './GridAlignedAvailability'
import HorizontalScrollContainer from './HorizontalScrollContainer'
import { useWorkerAvailability } from '@/hooks/use-worker-availability'
import { useTimelineCoordinates, useResponsiveWorkerClasses } from '@/hooks/use-timeline-coordinates'
import { useHorizontalScroll } from '@/hooks/use-horizontal-scroll'
import { TimelineScrollbar } from './TimelineScrollbar'

// Types
interface Worker {
  id: string
  name: string
  email: string
  working_hours?: Array<{
    start: string
    end: string
    day?: number
  }>
}

interface Job {
  id: string
  title: string
  description?: string
  scheduled_at: string
  duration: number // Required for grid calculations
  duration_hours?: number
  status: 'scheduled' | 'in_progress' | 'completed' | 'cancelled'
  priority: 'low' | 'medium' | 'high'
  worker_id: string
  client_name?: string
  location?: string
}

interface TimelineSchedulerGridProps {
  workers: Worker[]
  jobs: Job[]
  selectedDate: Date
  onJobClick?: (job: Job) => void
  onTimeSlotClick?: (workerId: string, hour: number, minute: number) => void
  className?: string
  showAvailability?: boolean
  compact?: boolean
  timeRange?: TimeRange
}

export default function TimelineSchedulerGrid({
  workers,
  jobs,
  selectedDate,
  onJobClick,
  onTimeSlotClick,
  className = '',
  showAvailability = true,
  compact = false,
  timeRange: initialTimeRange = { startHour: 6, endHour: 18, totalHours: 12 }
}: TimelineSchedulerGridProps) {
  const [currentTime, setCurrentTime] = useState(new Date())
  const [selectedWorker, setSelectedWorker] = useState<string | null>(null)

  // Calculate dynamic time range based on actual data, but use the prop if provided
  const dynamicTimeRange = useMemo(() => {
    return calculateOptimalTimeRange(workers, jobs, selectedDate)
  }, [workers, jobs, selectedDate])
  
  // The single source of truth for the time range
  const timeRange = initialTimeRange || dynamicTimeRange

  const coordinates = useTimelineCoordinates(timeRange)
  const { workerColumnClasses } = useResponsiveWorkerClasses()
  const { scrollRef, contentRef, scrollTo, canScrollLeft, canScrollRight } = useHorizontalScroll(true)

  // Filter jobs for selected date
  const dayJobs = useMemo(() => {
    const dayStart = startOfDay(selectedDate)
    const dayEnd = addDays(dayStart, 1)
    
    return jobs.filter(job => {
      const jobDate = new Date(job.scheduled_at)
      return jobDate >= dayStart && jobDate < dayEnd
    })
  }, [jobs, selectedDate])

  // Calculate worker utilizations
  const workerUtilizations = useMemo(() => {
    const utilizations: Record<string, number> = {}
    
    workers.forEach(worker => {
      const workerJobs = dayJobs.filter(job => job.worker_id === worker.id)
      const workingHours = worker.working_hours?.[0] // Simplified - use first schedule
      
      if (workingHours && workerJobs.length > 0) {
        const [startHour, startMinute] = workingHours.start.split(':').map(Number)
        const [endHour, endMinute] = workingHours.end.split(':').map(Number)
        
        const workDayMinutes = (endHour * 60 + endMinute) - (startHour * 60 + startMinute)
        const jobMinutes = workerJobs.reduce((total, job) => total + job.duration, 0)
        
        utilizations[worker.id] = workDayMinutes > 0 ? (jobMinutes / workDayMinutes) * 100 : 0
      } else {
        utilizations[worker.id] = 0
      }
    })
    
    return utilizations
  }, [workers, dayJobs])

  // Update current time every minute
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date())
    }, 60000)
    
    return () => clearInterval(timer)
  }, [])

  // Check if we're viewing today
  const isToday = useMemo(() => {
    const today = new Date()
    return (
      selectedDate.getDate() === today.getDate() &&
      selectedDate.getMonth() === today.getMonth() &&
      selectedDate.getFullYear() === today.getFullYear()
    )
  }, [selectedDate])

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header with Stats */}
      <div className="bg-white rounded-lg border p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <Calendar className="w-6 h-6 text-blue-600" />
            <div>
              <h2 className="text-xl font-semibold text-gray-900">
                Smart Timeline Schedule
              </h2>
              <p className="text-gray-600">
                {format(selectedDate, 'EEEE, MMMM d, yyyy')}
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2 text-sm">
              <Clock className="w-4 h-4 text-gray-500" />
              <span className="text-gray-600">
                {timeRange.startHour}:00 - {timeRange.endHour}:00
              </span>
              <span className="text-gray-500">
                ({timeRange.totalHours} hours shown)
              </span>
            </div>
            
            <div className="flex items-center gap-2 text-sm">
              <Users className="w-4 h-4 text-gray-500" />
              <span className="text-gray-600">
                {workers.length} workers
              </span>
            </div>
            
            <div className="flex items-center gap-2 text-sm">
              <TrendingUp className="w-4 h-4 text-gray-500" />
              <span className="text-gray-600">
                {dayJobs.length} jobs
              </span>
            </div>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-4 gap-4">
          <div className="bg-blue-50 rounded-lg p-3">
            <div className="text-2xl font-bold text-blue-600">
              {Math.round(Object.values(workerUtilizations).reduce((a, b) => a + b, 0) / workers.length || 0)}%
            </div>
            <div className="text-sm text-blue-700">Avg Utilization</div>
          </div>
          
          <div className="bg-green-50 rounded-lg p-3">
            <div className="text-2xl font-bold text-green-600">
              {dayJobs.filter(job => job.status === 'completed').length}
            </div>
            <div className="text-sm text-green-700">Completed</div>
          </div>
          
          <div className="bg-yellow-50 rounded-lg p-3">
            <div className="text-2xl font-bold text-yellow-600">
              {dayJobs.filter(job => job.status === 'in_progress').length}
            </div>
            <div className="text-sm text-yellow-700">In Progress</div>
          </div>
          
          <div className="bg-red-50 rounded-lg p-3">
            <div className="text-2xl font-bold text-red-600">
              {dayJobs.filter(job => job.status === 'cancelled').length}
            </div>
            <div className="text-sm text-red-700">Cancelled</div>
          </div>
        </div>
      </div>

      {/* Timeline with Smart Horizontal Scroll - Responsive Container */}
      <div className="bg-white rounded-lg border overflow-hidden">
        <div className="p-2 sm:p-4 lg:p-6">
          <HorizontalScrollContainer
            scrollRef={scrollRef}
            contentRef={contentRef}
            timeRange={timeRange}
          >
            <div className="relative space-y-2 sm:space-y-4">
              <TimelineHeader 
                className="mb-2 sm:mb-4" 
                timeRange={timeRange}
                compact={typeof window !== 'undefined' && window.innerWidth < 768}
              />
              <TimelineGrid timeRange={timeRange} />
              <div className="space-y-1 sm:space-y-2">
                {workers.map((worker, workerIndex) => {
                  const workerJobs = dayJobs.filter(job => job.worker_id === worker.id)
                  const utilization = workerUtilizations[worker.id] || 0
                  const isSelected = selectedWorker === worker.id

                  return (
                    <div
                      key={worker.id}
                      className={`relative border border-gray-200 rounded-lg transition-all duration-200 ${
                        isSelected ? 'bg-blue-50 border-blue-300 shadow-md' : 'bg-white hover:bg-gray-50'
                      }`}
                      style={{ 
                        height: Math.max(60, GRID_CONFIG.WORKER_ROW_HEIGHT * 0.8), // Responsive height
                        minHeight: Math.max(60, GRID_CONFIG.WORKER_ROW_HEIGHT * 0.8)
                      }}
                      onClick={() => setSelectedWorker(isSelected ? null : worker.id)}
                    >
                      {/* Worker Info Card - STICKY */}
                      <div className={cn(
                        "sticky left-0 top-0 h-full bg-white border-r border-gray-200 p-2 sm:p-3 lg:p-4 flex flex-col justify-center z-20 rounded-l-lg",
                        workerColumnClasses
                      )}
                      style={{ width: coordinates.workerColumnWidth }}>
                        <div className="flex items-center gap-1 sm:gap-2 lg:gap-3">
                          <div className="relative">
                            <div className="w-6 h-6 sm:w-8 sm:h-8 lg:w-10 lg:h-10 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                              <span className="text-blue-600 font-semibold text-xs sm:text-sm">
                                {worker.name.split(' ').map(n => n[0]).join('')}
                              </span>
                            </div>
                            
                            {/* Dynamic Status Indicator - Based on actual data */}
                            <div className={cn(
                              "absolute -bottom-1 -right-1 w-3 h-3 sm:w-4 sm:h-4 rounded-full border-2 border-white shadow-sm",
                              (() => {
                                const { worker: processedWorker } = useWorkerAvailability(worker, selectedDate)
                                switch (processedWorker.status) {
                                  case 'available': return 'bg-green-500'
                                  case 'busy': return 'bg-yellow-500'
                                  case 'offline': return 'bg-red-500'
                                  case 'unavailable': return 'bg-gray-500'
                                  default: return 'bg-gray-400'
                                }
                              })()
                            )} />
                          </div>
                          
                          <div className="flex-1 min-w-0">
                            <div className="font-semibold text-gray-900 text-xs sm:text-sm lg:text-base truncate">
                              {worker.name}
                            </div>
                            
                            {/* Working Hours Display - No longer truncated */}
                            <div className="text-xs sm:text-sm text-gray-600">
                              {(() => {
                                const { displayText } = useWorkerAvailability(worker, selectedDate)
                                return displayText
                              })()}
                            </div>
                            
                            {/* Status Text */}
                            <div className={cn(
                              "text-xs font-medium capitalize",
                              (() => {
                                const { worker: processedWorker } = useWorkerAvailability(worker, selectedDate)
                                switch (processedWorker.status) {
                                  case 'available': return 'text-green-600'
                                  case 'busy': return 'text-yellow-600'
                                  case 'offline': return 'text-red-600'
                                  case 'unavailable': return 'text-gray-600'
                                  default: return 'text-gray-600'
                                }
                              })()
                            )}>
                              {(() => {
                                const { worker: processedWorker } = useWorkerAvailability(worker, selectedDate)
                                return processedWorker.status
                              })()}
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Worker Availability - Only render if worker has actual data */}
                      {showAvailability && (
                        <GridAlignedAvailability
                          worker={worker}
                          selectedDate={selectedDate}
                          opacity={0.6}
                          className="bg-green-100 border-green-300 border-2"
                          timeRange={timeRange}
                        />
                      )}

                      {/* Worker Jobs */}
                      {workerJobs.map(job => (
                        <GridAlignedJob
                          key={job.id}
                          job={job}
                          hasConflict={false} // Simplified for now
                          onClick={() => onJobClick?.(job)}
                          className="z-10"
                          timeRange={timeRange}
                        />
                      ))}
                    </div>
                  )
                })}
              </div>
            </div>
          </HorizontalScrollContainer>
          <TimelineScrollbar 
            scrollTo={scrollTo}
            canScrollLeft={canScrollLeft}
            canScrollRight={canScrollRight}
          />
        </div>
      </div>

      {/* Legend */}
      <div className="bg-white rounded-lg border p-4">
        <h3 className="font-medium text-gray-900 mb-3">Legend</h3>
        <div className="flex flex-wrap gap-6 text-sm">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-green-100 border-2 border-green-300 rounded"></div>
            <span className="text-gray-600">Available Hours</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-blue-500 rounded"></div>
            <span className="text-gray-600">Scheduled Job</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-yellow-500 rounded"></div>
            <span className="text-gray-600">In Progress</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-green-500 rounded"></div>
            <span className="text-gray-600">Completed</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-red-500 rounded border-2 border-red-700"></div>
            <span className="text-gray-600">Conflict</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-0.5 h-4 bg-red-500"></div>
            <span className="text-gray-600">Current Time</span>
          </div>
        </div>
      </div>

      {/* Smart Timeline Info */}
      <div className="bg-blue-50 rounded-lg border border-blue-200 p-4">
        <div className="flex items-start gap-3">
          <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
            <Clock className="w-3 h-3 text-white" />
          </div>
          <div>
            <h4 className="font-medium text-blue-900 mb-1">Smart Timeline Range</h4>
            <p className="text-sm text-blue-700">
              This timeline automatically adjusts to show only the relevant hours ({timeRange.startHour}:00 - {timeRange.endHour}:00) 
              based on your workers' schedules and job times. Use the navigation buttons above to scroll through different time periods.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
} 