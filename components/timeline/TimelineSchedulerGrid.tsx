'use client'

import React, { useState, useEffect, useMemo } from 'react'
import { format, startOfDay, addDays } from 'date-fns'
import { Calendar, Users, Clock, TrendingUp } from 'lucide-react'

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
import { CurrentTimeIndicator } from './CurrentTimeIndicator'
import HorizontalScrollContainer from './HorizontalScrollContainer'

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
}

export default function TimelineSchedulerGrid({
  workers,
  jobs,
  selectedDate,
  onJobClick,
  onTimeSlotClick,
  className = ''
}: TimelineSchedulerGridProps) {
  const [currentTime, setCurrentTime] = useState(new Date())
  const [selectedWorker, setSelectedWorker] = useState<string | null>(null)

  // Calculate dynamic time range based on actual data
  const timeRange: TimeRange = useMemo(() => {
    return calculateOptimalTimeRange(workers, jobs, selectedDate)
  }, [workers, jobs, selectedDate])

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
        <HorizontalScrollContainer 
          timeRange={timeRange}
          className="p-2 sm:p-4 lg:p-6"
          showScrollIndicators={true}
          autoScrollToBusiness={true}
        >
          {/* Timeline Content - Responsive */}
          <div className="space-y-2 sm:space-y-4 min-w-0">
            {/* Timeline Header */}
            <TimelineHeader 
              className="mb-2 sm:mb-4" 
              timeRange={timeRange}
              compact={window.innerWidth < 768}
            />

            {/* Timeline Grid Background */}
            <TimelineGrid timeRange={timeRange} />

            {/* Current Time Indicator */}
            {isToday && (
              <CurrentTimeIndicator 
                className="pointer-events-none" 
                timeRange={timeRange}
              />
            )}

            {/* Workers and Content - Responsive */}
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
                    {/* Worker Info Card - Responsive */}
                                          <div className="absolute left-0 top-0 w-32 sm:w-40 lg:w-48 h-full bg-white border-r border-gray-200 p-2 sm:p-3 lg:p-4 flex flex-col justify-center z-20 rounded-l-lg">
                        <div className="flex items-center gap-1 sm:gap-2 lg:gap-3">
                          <div className="w-6 h-6 sm:w-8 sm:h-8 lg:w-10 lg:h-10 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                            <span className="text-blue-600 font-semibold text-xs sm:text-sm">
                              {worker.name.split(' ').map(n => n[0]).join('')}
                            </span>
                          </div>
                          <div className="flex-1 min-w-0">
                            <h3 className="font-medium text-gray-900 truncate text-xs sm:text-sm lg:text-base">
                              {worker.name}
                            </h3>
                            <div className="flex items-center gap-1 sm:gap-2 mt-0.5 sm:mt-1">
                              <div className="text-xs text-gray-500 whitespace-nowrap">
                                {utilization.toFixed(0)}%
                              </div>
                              <div className="flex-1 bg-gray-200 rounded-full h-1 sm:h-1.5">
                                <div
                                  className={`h-1 sm:h-1.5 rounded-full transition-all ${
                                    utilization > 80 ? 'bg-red-500' :
                                    utilization > 60 ? 'bg-yellow-500' : 'bg-green-500'
                                  }`}
                                  style={{ width: `${Math.min(100, utilization)}%` }}
                                />
                              </div>
                            </div>
                            {worker.working_hours?.[0] && (
                              <div className="text-xs text-gray-500 mt-0.5 sm:mt-1 truncate">
                                {worker.working_hours[0].start} - {worker.working_hours[0].end}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>

                    {/* Worker Availability - Enhanced with green background matching work hours */}
                    {worker.working_hours?.map((schedule, scheduleIndex) => (
                      <GridAlignedAvailability
                        key={scheduleIndex}
                        worker={{
                          ...worker,
                          status: 'available' // Add required status field
                        }}
                        selectedDate={selectedDate}
                        opacity={0.6}
                        className="bg-green-100 border-green-300 border-2"
                        timeRange={timeRange}
                      />
                    ))}

                    {/* Worker Jobs */}
                    {workerJobs.map(job => (
                      <GridAlignedJob
                        key={job.id}
                        job={job}
                        hasConflict={false} // Simplified for now
                        onClick={() => onJobClick?.(job)}
                        className="z-10"
                      />
                    ))}
                  </div>
                )
              })}
            </div>
          </div>
        </HorizontalScrollContainer>
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