'use client'

import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react'
import { format, startOfDay, addDays, subDays, addMonths, subMonths, isSameDay, parseISO } from 'date-fns'
import { Calendar, Users, Clock, TrendingUp, CheckCircle2, AlertTriangle, ChevronLeft, ChevronRight, Percent, Gauge, CalendarDays, Settings, X, PlayCircle, MapPin, Info } from 'lucide-react'
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
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled'
  priority: 'low' | 'medium' | 'high' | 'urgent'
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

// Worker Info Button Component
const WorkerInfoButton = ({ onClick }: { 
  onClick: () => void 
}) => {
  return (
    <button
      onClick={(e) => {
        e.stopPropagation(); // Prevent parent div click
        onClick();
      }}
      className="ml-1 p-1 rounded-full hover:bg-blue-100 transition-colors"
      aria-label="Worker details"
      title="View worker details"
    >
      <Info className="w-3.5 h-3.5 xs:w-4 xs:h-4 text-blue-500" />
    </button>
  );
};

// Worker Details Popup Component
const WorkerDetailsPopup = ({ 
  workerId, 
  workers, 
  dayJobs, 
  selectedDate, 
  workerUtilizations, 
  onClose,
  onJobClick,
  onSetAvailability
}: { 
  workerId: string | null,
  workers: Worker[],
  dayJobs: Job[],
  selectedDate: Date,
  workerUtilizations: Record<string, number>,
  onClose: () => void,
  onJobClick?: (job: Job) => void,
  onSetAvailability: (workerId: string) => void
}) => {
  if (!workerId) return null;
  
  const worker = workers.find(w => w.id === workerId);
  if (!worker) return null;
  
  const workerJobs = dayJobs.filter(job => job.worker_id === worker.id);
  const utilization = workerUtilizations[worker.id] || 0;
  
  // Use the hook here, safely
  const { worker: processedWorker, displayText } = useWorkerAvailability(worker, selectedDate);
  
  return (
    <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50 p-4 animate-fadeIn" onClick={onClose}>
      <div 
        className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto animate-scaleIn"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header with Avatar */}
        <div className="relative bg-gradient-to-r from-blue-600 to-blue-800 text-white p-6 rounded-t-xl">
          <button 
            onClick={onClose}
            className="absolute top-4 right-4 p-1 rounded-full bg-white bg-opacity-20 hover:bg-opacity-30 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
          
          <div className="flex items-center gap-5">
            <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center shadow-md border-4 border-white">
              <span className="text-blue-600 font-bold text-2xl">
                {worker.name.split(' ').map(n => n[0]).join('')}
              </span>
            </div>
            
            <div>
              <h2 className="text-2xl font-bold mb-1">{worker.name}</h2>
              <div className="flex items-center gap-2 text-blue-100">
                <div className={cn(
                  "px-2.5 py-1 rounded-full text-sm font-medium flex items-center gap-1.5 bg-white bg-opacity-20",
                )}>
                  <span className="inline-block w-2 h-2 rounded-full bg-current" style={{ 
                    backgroundColor: processedWorker.status === 'available' ? '#10b981' : 
                                    processedWorker.status === 'busy' ? '#f59e0b' : 
                                    processedWorker.status === 'offline' ? '#ef4444' : '#6b7280'
                  }}></span>
                  <span className="capitalize">{processedWorker.status}</span>
                </div>
                <span>•</span>
                <span>{displayText || 'No schedule set'}</span>
              </div>
            </div>
          </div>
        </div>
        
        {/* Content - Simplified for brevity */}
        <div className="p-6 space-y-6">
          {/* Stats */}
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-blue-50 rounded-lg p-4 text-center">
              <div className="text-2xl font-bold text-blue-600 mb-1">{Math.round(utilization)}%</div>
              <div className="text-sm text-blue-700">Utilization</div>
            </div>
            
            <div className="bg-green-50 rounded-lg p-4 text-center">
              <div className="text-2xl font-bold text-green-600 mb-1">
                {workerJobs.filter(job => job.status === 'completed').length}
              </div>
              <div className="text-sm text-green-700">Completed</div>
            </div>
            
            <div className="bg-yellow-50 rounded-lg p-4 text-center">
              <div className="text-2xl font-bold text-yellow-600 mb-1">
                {workerJobs.filter(job => ['pending', 'in_progress'].includes(job.status)).length}
              </div>
              <div className="text-sm text-yellow-700">Pending/In Progress</div>
            </div>
          </div>
          
          {/* Quick Actions */}
          <div className="pt-4">
            <div className="grid grid-cols-3 gap-3">
              <button 
                onClick={() => {
                  onClose();
                  onSetAvailability(worker.id);
                }}
                className="p-3 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg flex flex-col items-center transition-colors"
              >
                <Calendar className="w-6 h-6 mb-1" />
                <span className="text-sm font-medium">Set Availability</span>
              </button>
              
              <button 
                className="p-3 bg-purple-50 hover:bg-purple-100 text-purple-700 rounded-lg flex flex-col items-center transition-colors"
              >
                <TrendingUp className="w-6 h-6 mb-1" />
                <span className="text-sm font-medium">Performance</span>
              </button>
              
              <button 
                className="p-3 bg-green-50 hover:bg-green-100 text-green-700 rounded-lg flex flex-col items-center transition-colors"
              >
                <Users className="w-6 h-6 mb-1" />
                <span className="text-sm font-medium">Assign Job</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// Availability Exception Modal Component
const AvailabilityExceptionModal = ({
  workerId,
  workers,
  selectedDate,
  dayJobs,
  onClose
}: {
  workerId: string | null,
  workers: Worker[],
  selectedDate: Date,
  dayJobs: Job[],
  onClose: () => void
}) => {
  const [exceptionType, setExceptionType] = useState<'custom' | 'unavailable'>('custom')
  const [startTime, setStartTime] = useState('09:00')
  const [endTime, setEndTime] = useState('17:00')
  const [reason, setReason] = useState('')

  if (!workerId) return null;
  
  const worker = workers.find(w => w.id === workerId);
  if (!worker) return null;

  const workerJobs = dayJobs.filter(job => job.worker_id === workerId);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 animate-fadeIn" onClick={onClose}>
      <div className="bg-white rounded-lg shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto animate-scaleIn"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">Set Availability Exception</h2>
            <p className="text-sm text-gray-600 mt-1">
              {worker.name} • {format(selectedDate, 'EEEE, MMMM d, yyyy')}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Current Appointments Warning */}
          {workerJobs.length > 0 && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-medium text-amber-800">Existing Appointments</h4>
                  <p className="text-sm text-amber-700 mt-1">
                    This worker has {workerJobs.length} appointment(s) scheduled for this day:
                  </p>
                  <ul className="mt-2 space-y-1">
                    {workerJobs.map(job => (
                      <li key={job.id} className="text-sm text-amber-700">
                        • {format(new Date(job.scheduled_at), 'h:mm a')} - {job.title}
                      </li>
                    ))}
                  </ul>
                  <p className="text-sm text-amber-700 mt-2">
                    Setting unavailability will require rescheduling these appointments.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Exception Type Selection */}
          <div className="space-y-4">
            <h3 className="font-medium text-gray-900">Exception Type</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button 
                onClick={() => setExceptionType('custom')}
                className={cn(
                  "p-4 border-2 rounded-lg text-left transition-colors",
                  exceptionType === 'custom' 
                    ? "border-green-500 bg-green-50 shadow-sm" 
                    : "border-green-200 bg-green-50/50 hover:border-green-300"
                )}
              >
                <div className="flex items-center gap-3">
                  <CheckCircle2 className="w-5 h-5 text-green-600" />
                  <div>
                    <div className="font-medium text-green-800">Custom Availability</div>
                    <div className="text-sm text-green-600">Set specific working hours</div>
                  </div>
                </div>
              </button>
              
              <button 
                onClick={() => setExceptionType('unavailable')}
                className={cn(
                  "p-4 border-2 rounded-lg text-left transition-colors",
                  exceptionType === 'unavailable' 
                    ? "border-red-500 bg-red-50 shadow-sm" 
                    : "border-red-200 bg-red-50/50 hover:border-red-300"
                )}
              >
                <div className="flex items-center gap-3">
                  <X className="w-5 h-5 text-red-600" />
                  <div>
                    <div className="font-medium text-red-800">Unavailable</div>
                    <div className="text-sm text-red-600">Whole day off</div>
                  </div>
                </div>
              </button>
            </div>
          </div>

          {/* Time Range Selection (shown for custom availability) */}
          {exceptionType === 'custom' && (
            <div className="space-y-4">
              <h3 className="font-medium text-gray-900">Available Hours</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-gray-600 mb-1">Start Time</label>
                  <input
                    type="time"
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-600 mb-1">End Time</label>
                  <input
                    type="time"
                    value={endTime}
                    onChange={(e) => setEndTime(e.target.value)}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Reason */}
          <div className="space-y-2">
            <label className="block font-medium text-gray-900">
              Reason <span className="text-sm text-gray-500 font-normal">(optional)</span>
            </label>
            <textarea
              placeholder={exceptionType === 'custom' 
                ? "e.g., Working from home, Different hours" 
                : "e.g., Doctor appointment, Personal day, Vacation"
              }
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-6 border-t bg-gray-50">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={() => {
              // Create exception data
              const exceptionData = {
                worker_id: workerId,
                date: format(selectedDate, 'yyyy-MM-dd'),
                is_available: exceptionType === 'custom',
                start_time: exceptionType === 'custom' ? startTime : null,
                end_time: exceptionType === 'custom' ? endTime : null,
                reason: reason.trim() || null
              }
              
              // Here you would implement the save logic to your API
              console.log('Saving exception:', exceptionData)
              
              // Close modal
              onClose();
            }}
            className="bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700 transition-colors font-medium"
          >
            Save Exception
          </button>
        </div>
      </div>
    </div>
  );
};

export default function TimelineSchedulerGrid({
  workers,
  jobs,
  selectedDate: initialSelectedDate,
  onJobClick,
  onTimeSlotClick,
  className = '',
  showAvailability = true,
  compact = false,
  timeRange: initialTimeRange = { startHour: 6, endHour: 18, totalHours: 12 }
}: TimelineSchedulerGridProps) {
  // State management
  const [currentTime, setCurrentTime] = useState(new Date())
  const [selectedWorker, setSelectedWorker] = useState<string | null>(null)
  const [selectedDate, setSelectedDate] = useState<Date>(initialSelectedDate)
  const [selectedWorkerForException, setSelectedWorkerForException] = useState<string | null>(null)
  const [showAvailabilityState, setShowAvailabilityState] = useState(showAvailability)
  const [timeRangeState, setTimeRangeState] = useState<TimeRange>(initialTimeRange)
  const [showWorkerDetails, setShowWorkerDetails] = useState<string | null>(null)

  // Calculate dynamic time range based on actual data, but use the prop if provided
  const timeRange = useMemo(() => {
    if (initialTimeRange && initialTimeRange.startHour !== 6) {
      // If a specific time range was provided, use it
      return initialTimeRange
    }
    
    // Otherwise, calculate optimal time range
    return calculateOptimalTimeRange(workers, jobs, selectedDate)
  }, [workers, jobs, selectedDate, initialTimeRange])
  
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

  // Calculate worker availability data at the top level to avoid hook violations
  // Call useWorkerAvailability for each worker at the top level
  const workerAvailabilityResults = workers.map(worker => ({
    workerId: worker.id,
    ...useWorkerAvailability(worker, selectedDate)
  }))
  
  const workerAvailabilityData = useMemo(() => {
    const availabilityMap: Record<string, {
      worker: any,
      displayText: string,
      status: string,
      statusColor: string,
      statusBgColor: string,
      indicatorColor: string
    }> = {}
    
    workerAvailabilityResults.forEach(({ workerId, worker: processedWorker, displayText }) => {
      let statusColor = 'text-gray-700 bg-gray-50'
      let indicatorColor = 'bg-gray-500'
      
      switch (processedWorker.status) {
        case 'available':
          statusColor = 'text-green-700 bg-green-50'
          indicatorColor = 'bg-green-500'
          break
        case 'busy':
          statusColor = 'text-yellow-700 bg-yellow-50'
          indicatorColor = 'bg-yellow-500'
          break
        case 'offline':
          statusColor = 'text-red-700 bg-red-50'
          indicatorColor = 'bg-red-500'
          break
        case 'unavailable':
          statusColor = 'text-gray-700 bg-gray-50'
          indicatorColor = 'bg-gray-500'
          break
      }
      
      availabilityMap[workerId] = {
        worker: processedWorker,
        displayText: displayText || 'No schedule set',
        status: processedWorker.status,
        statusColor,
        statusBgColor: statusColor,
        indicatorColor
      }
    })
    
    return availabilityMap
  }, [workerAvailabilityResults])

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
      <div className="bg-white rounded-lg border p-4 sm:p-6">
        {/* Title and Date - Always at the top */}
        <div className="flex flex-col items-center justify-center text-center mb-4 sm:mb-6">
          <div className="flex items-center gap-3 mb-2">
            <Calendar className="w-6 h-6 text-blue-600" />
            <h2 className="text-xl font-semibold text-gray-900">
              Smart Timeline Schedule
            </h2>
          </div>
          
          {/* Date Picker with Navigation */}
          <div className="relative flex flex-col items-center">
            <div className="flex items-center justify-center gap-2 mt-2 bg-white border rounded-lg shadow-sm p-2">
              <button 
                onClick={() => setSelectedDate(prevDate => subDays(prevDate, 1))}
                className="p-1.5 rounded-md hover:bg-blue-50 transition-colors text-gray-600 hover:text-blue-600"
                aria-label="Previous day"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              
              <div className="relative">
                <button 
                  onClick={() => document.getElementById('date-picker-dropdown')?.classList.toggle('hidden')}
                  className="flex items-center gap-2 px-4 py-2 rounded-md hover:bg-blue-50 transition-colors"
                  aria-label="Open date picker"
                  aria-haspopup="true"
                >
                  <Calendar className="w-5 h-5 text-blue-600" />
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-gray-900">
                      {format(selectedDate, 'MMM d, yyyy')}
                    </span>
                    <span className={cn(
                      "px-2 py-0.5 text-sm rounded-md",
                      isSameDay(selectedDate, new Date()) ? "bg-blue-100 text-blue-700" : "bg-gray-100 text-gray-600"
                    )}>
                      {format(selectedDate, 'EEE')}
                    </span>
                  </div>
                </button>
                
                <div 
                  id="date-picker-dropdown"
                  className="hidden absolute top-full left-1/2 transform -translate-x-1/2 mt-2 bg-white rounded-lg shadow-lg border p-4 z-50 w-72"
                >
                  <div className="flex justify-between items-center mb-4">
                    <button 
                      onClick={() => setSelectedDate(prevDate => subMonths(prevDate, 1))}
                      className="p-1.5 rounded-md hover:bg-gray-100 text-gray-500"
                      aria-label="Previous month"
                    >
                      <ChevronLeft className="w-5 h-5" />
                    </button>
                    <span className="font-medium text-base text-gray-800">
                      {format(selectedDate, 'MMMM yyyy')}
                    </span>
                    <button 
                      onClick={() => setSelectedDate(prevDate => addMonths(prevDate, 1))}
                      className="p-1.5 rounded-md hover:bg-gray-100 text-gray-500"
                      aria-label="Next month"
                    >
                      <ChevronRight className="w-5 h-5" />
                    </button>
                  </div>
                  
                  <div className="grid grid-cols-7 gap-1 mb-2">
                    {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map(day => (
                      <div key={day} className="text-xs text-center text-gray-500 font-medium p-1">
                        {day}
                      </div>
                    ))}
                  </div>
                  
                  <div className="grid grid-cols-7 gap-1">
                    {Array.from({ length: 35 }, (_, i) => {
                      const firstDayOfMonth = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1)
                      const startingDay = firstDayOfMonth.getDay()
                      const day = i - startingDay + 1
                      const date = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), day)
                      
                      const isCurrentMonth = date.getMonth() === selectedDate.getMonth()
                      const isToday = isSameDay(date, new Date())
                      const isSelected = isSameDay(date, selectedDate)
                      
                      return (
                        <button
                          key={i}
                          onClick={() => {
                            setSelectedDate(date)
                            document.getElementById('date-picker-dropdown')?.classList.add('hidden')
                          }}
                          disabled={!isCurrentMonth}
                          className={cn(
                            "w-9 h-9 flex items-center justify-center rounded-full text-sm transition-colors",
                            isCurrentMonth ? "hover:bg-blue-50" : "text-gray-300 cursor-default",
                            isToday && !isSelected && "border border-blue-300",
                            isSelected ? "bg-blue-600 text-white" : "text-gray-700"
                          )}
                        >
                          {isCurrentMonth ? day : ''}
                        </button>
                      )
                    })}
                  </div>
                  
                  <div className="mt-4 flex justify-between border-t pt-3">
                    <button 
                      onClick={() => {
                        setSelectedDate(new Date())
                        document.getElementById('date-picker-dropdown')?.classList.add('hidden')
                      }} 
                      className="text-sm bg-blue-50 text-blue-600 px-3 py-1.5 rounded hover:bg-blue-100 transition-colors font-medium"
                    >
                      Today
                    </button>
                    <button 
                      onClick={() => document.getElementById('date-picker-dropdown')?.classList.add('hidden')}
                      className="text-sm text-gray-500 hover:text-gray-700 transition-colors"
                    >
                      Close
                    </button>
                  </div>
                </div>
              </div>
              
              <button 
                onClick={() => setSelectedDate(prevDate => addDays(prevDate, 1))}
                className="p-1.5 rounded-md hover:bg-blue-50 transition-colors text-gray-600 hover:text-blue-600"
                aria-label="Next day"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
        
        {/* Schedule Information - Centered and stacks on mobile */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 sm:gap-6 mb-6 text-center">
          <div className="flex items-center gap-2 text-sm bg-gray-50 px-3 py-2 rounded-lg">
            <Clock className="w-4 h-4 text-blue-500" />
            <span className="text-gray-700 font-medium">
              {timeRange.startHour}:00 - {timeRange.endHour}:00
            </span>
            <span className="text-gray-500">
              ({timeRange.totalHours} hours)
            </span>
          </div>
          
          <div className="flex items-center gap-2 text-sm bg-gray-50 px-3 py-2 rounded-lg">
            <Users className="w-4 h-4 text-blue-500" />
            <span className="text-gray-700 font-medium">
              {workers.length} workers
            </span>
          </div>
          
          <div className="flex items-center gap-2 text-sm bg-gray-50 px-3 py-2 rounded-lg">
            <TrendingUp className="w-4 h-4 text-blue-500" />
            <span className="text-gray-700 font-medium">
              {dayJobs.length} jobs
            </span>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
          <div className="bg-blue-50 rounded-lg p-3 flex flex-col items-center justify-center">
            <div className="flex items-center gap-2 mb-1">
              <TrendingUp className="w-5 h-5 text-blue-500" />
              <div className="text-2xl font-bold text-blue-600">
                {Math.round(Object.values(workerUtilizations).reduce((a, b) => a + b, 0) / workers.length || 0)}%
              </div>
            </div>
            <div className="text-sm text-blue-700 text-center">Avg Utilization</div>
          </div>
          
          <div className="bg-green-50 rounded-lg p-3 flex flex-col items-center justify-center">
            <div className="flex items-center gap-2 mb-1">
              <CheckCircle2 className="w-5 h-5 text-green-500" />
              <div className="text-2xl font-bold text-green-600">
                {dayJobs.filter(job => job.status === 'completed').length}
              </div>
            </div>
            <div className="text-sm text-green-700 text-center">Completed</div>
          </div>
          
          <div className="bg-yellow-50 rounded-lg p-3 flex flex-col items-center justify-center">
            <div className="flex items-center gap-2 mb-1">
              <Clock className="w-5 h-5 text-yellow-500" />
              <div className="text-2xl font-bold text-yellow-600">
                {dayJobs.filter(job => job.status === 'pending').length}
              </div>
            </div>
            <div className="text-sm text-yellow-700 text-center">Pending</div>
          </div>
          
          <div className="bg-red-50 rounded-lg p-3 flex flex-col items-center justify-center">
            <div className="flex items-center gap-2 mb-1">
              <AlertTriangle className="w-5 h-5 text-red-500" />
              <div className="text-2xl font-bold text-red-600">
                {dayJobs.filter(job => job.status === 'cancelled').length}
              </div>
            </div>
            <div className="text-sm text-red-700 text-center">Cancelled</div>
          </div>
        </div>
      </div>

      {/* Exception Management Section */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mt-4 pt-4 border-t">
        <div className="flex items-center gap-3">
          <Settings className="w-5 h-5 text-gray-600" />
          <span className="text-sm font-medium text-gray-700">Availability Management</span>
        </div>
        
        <div className="flex items-center gap-3">
          <select
            value={selectedWorkerForException || ''}
            onChange={(e) => setSelectedWorkerForException(e.target.value || null)}
            className="text-sm border border-gray-300 rounded-md px-3 py-1.5 bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="">Select Worker</option>
            {workers.map(worker => (
              <option key={worker.id} value={worker.id}>
                {worker.name}
              </option>
            ))}
          </select>
          
          <button
            onClick={() => {
              if (!selectedWorkerForException) {
                alert('Please select a worker first')
                return
              }
              // The modal will open automatically when selectedWorkerForException is set
            }}
            disabled={!selectedWorkerForException}
            className={cn(
              "text-sm px-4 py-1.5 rounded-md font-medium transition-colors",
              selectedWorkerForException
                ? "bg-blue-600 text-white hover:bg-blue-700"
                : "bg-gray-200 text-gray-500 cursor-not-allowed"
            )}
          >
            Set Exception
          </button>
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
                className="mb-3 sm:mb-5" 
                timeRange={timeRange}
                compact={typeof window !== 'undefined' && window.innerWidth < 768}
              />
              <TimelineGrid timeRange={timeRange} />
              <div className="space-y-3 sm:space-y-4 mt-3 sm:mt-4">
                {workers.map((worker, workerIndex) => {
                  const workerJobs = dayJobs.filter(job => job.worker_id === worker.id)
                  const utilization = workerUtilizations[worker.id] || 0
                  const isSelected = selectedWorker === worker.id

                  return (
                    <div
                      key={worker.id}
                      className={`relative border border-gray-200 rounded-lg transition-all duration-200 cursor-pointer ${
                        isSelected ? 'bg-blue-50 border-blue-300 shadow-md' : 'bg-white hover:bg-gray-50 hover:shadow-md hover:border-blue-200'
                      }`}
                      style={{ 
                        height: Math.max(140, GRID_CONFIG.WORKER_ROW_HEIGHT), 
                        minHeight: Math.max(140, GRID_CONFIG.WORKER_ROW_HEIGHT)
                      }}
                      onClick={() => {
                        setSelectedWorker(isSelected ? null : worker.id);
                      }}
                    >
                      {/* Worker Info Card - STICKY */}
                      <div className={cn(
                        "sticky left-0 top-0 h-full bg-white border-r border-gray-200 p-2 xs:p-3 sm:p-4 flex flex-col justify-between z-40 rounded-l-lg",
                        isSelected ? "shadow-md bg-blue-50" : "shadow-sm",
                        workerColumnClasses
                      )}
                      style={{ width: coordinates.workerColumnWidth }}>
                        <div className="flex items-start gap-2 xs:gap-2.5 sm:gap-3.5 min-h-0">
                          <div className="relative flex-shrink-0">
                            <div className="w-8 h-8 xs:w-10 xs:h-10 sm:w-12 sm:h-12 lg:w-14 lg:h-14 bg-blue-100 rounded-full flex items-center justify-center shadow-sm">
                              <span className="text-blue-600 font-semibold text-xs xs:text-sm sm:text-base lg:text-lg">
                                {worker.name.split(' ').map(n => n[0]).join('')}
                              </span>
                            </div>
                            
                            {/* Dynamic Status Indicator - Based on actual data */}
                            <div className={cn(
                              "absolute -bottom-0.5 -right-0.5 w-3 h-3 xs:w-4 xs:h-4 sm:w-5 sm:h-5 rounded-full border-2 border-white shadow-sm",
                              workerAvailabilityData[worker.id]?.indicatorColor || 'bg-gray-400'
                            )} />
                          </div>
                          
                          <div className="flex-1 min-w-0 overflow-hidden">
                            {/* Worker Name */}
                            <h3 className="font-medium text-gray-900 text-xs xs:text-sm sm:text-base lg:text-lg leading-tight flex items-center">
                              <span className="block truncate" title={worker.name}>
                                {worker.name}
                              </span>
                              <WorkerInfoButton 
                                onClick={() => setShowWorkerDetails(worker.id)}
                              />
                            </h3>
                            
                            {/* Working Hours Display - Always visible with proper overflow handling */}
                            <div className="text-xs sm:text-sm text-gray-600 mt-0.5 leading-tight">
                              <span className="block truncate" title={workerAvailabilityData[worker.id]?.displayText}>
                                {workerAvailabilityData[worker.id]?.displayText || 'No schedule set'}
                              </span>
                            </div>
                          </div>
                        </div>
                        
                        {/* Status and Utilization */}
                        <div className="mt-2 xs:mt-3 sm:mt-4">
                          {/* Status Badge */}
                          <div className="flex items-center justify-between mb-1.5 xs:mb-2">
                            <div className={cn(
                              "text-xs sm:text-sm font-medium capitalize px-1.5 xs:px-2.5 py-0.5 xs:py-1 rounded-full flex items-center gap-1 xs:gap-1.5 w-fit",
                              workerAvailabilityData[worker.id]?.statusColor || 'text-gray-700 bg-gray-50'
                            )}>
                              <span className="inline-block w-1.5 h-1.5 xs:w-2 xs:h-2 rounded-full bg-current"></span>
                              <span className="hidden xs:inline">
                                {workerAvailabilityData[worker.id]?.status || 'offline'}
                              </span>
                            </div>
                            
                            {/* Utilization Badge */}
                            <div className={cn(
                              "flex items-center gap-1 xs:gap-1.5 px-1.5 xs:px-2.5 py-0.5 xs:py-1 rounded-full text-xs sm:text-sm font-medium",
                              utilization > 80 ? "text-red-700 bg-red-50" :
                              utilization > 50 ? "text-yellow-700 bg-yellow-50" : 
                              "text-green-700 bg-green-50"
                            )}>
                              <Gauge className="w-3 h-3 xs:w-3.5 xs:h-3.5" />
                              <span>{Math.round(utilization)}%</span>
                            </div>
                          </div>
                          
                          {/* Utilization Bar */}
                          <div className="mt-1 xs:mt-1.5 h-2 xs:h-2.5 bg-gray-100 rounded-full overflow-hidden">
                            <div 
                              className={cn(
                                "h-full rounded-full",
                                utilization > 80 ? "bg-red-500" :
                                utilization > 50 ? "bg-yellow-500" : 
                                "bg-green-500"
                              )}
                              style={{ width: `${Math.min(100, utilization)}%` }}
                            />
                          </div>
                        </div>
                      </div>

                      {/* Timeline Content Container - Contains both availability and jobs */}
                      <div className="absolute inset-0 z-10 overflow-visible">
                        {/* Worker Availability - Only render if worker has actual data */}
                        {showAvailabilityState && (
                          <GridAlignedAvailability
                            worker={worker}
                            selectedDate={selectedDate}
                            opacity={0.7}
                            className="bg-green-100 border-green-300 border-2 z-10 shadow-sm"
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
                            className="z-20 shadow-sm"
                            timeRange={timeRange}
                          />
                        ))}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </HorizontalScrollContainer>
          
          {/* Centered Timeline Navigation */}
          <div className="flex justify-center mt-4">
            <TimelineScrollbar 
              scrollTo={scrollTo}
              canScrollLeft={canScrollLeft}
              canScrollRight={canScrollRight}
            />
          </div>
        </div>
      </div>

      {/* Legend */}
      <div className="bg-white rounded-lg border p-4 sm:p-6">
        <h3 className="font-medium text-gray-900 mb-3 text-center">Legend</h3>
        <div className="flex flex-wrap justify-center gap-3 sm:gap-6 text-sm">
          <div className="flex items-center gap-2 bg-gray-50 px-3 py-1.5 rounded-md">
            <div className="w-4 h-4 bg-green-100 border-2 border-green-300 rounded"></div>
            <span className="text-gray-700">Available Hours</span>
          </div>
          <div className="flex items-center gap-2 bg-gray-50 px-3 py-1.5 rounded-md">
            <div className="w-4 h-4 bg-blue-500 rounded"></div>
            <span className="text-gray-700">In Progress</span>
          </div>
          <div className="flex items-center gap-2 bg-gray-50 px-3 py-1.5 rounded-md">
            <div className="w-4 h-4 bg-yellow-500 rounded"></div>
            <span className="text-gray-700">Pending</span>
          </div>
          <div className="flex items-center gap-2 bg-gray-50 px-3 py-1.5 rounded-md">
            <div className="w-4 h-4 bg-green-500 rounded"></div>
            <span className="text-gray-700">Completed</span>
          </div>
          <div className="flex items-center gap-2 bg-gray-50 px-3 py-1.5 rounded-md">
            <div className="w-4 h-4 bg-red-500 rounded border-2 border-red-700"></div>
            <span className="text-gray-700">Conflict</span>
          </div>
          <div className="flex items-center gap-2 bg-gray-50 px-3 py-1.5 rounded-md">
            <div className="w-0.5 h-4 bg-red-500"></div>
            <span className="text-gray-700">Current Time</span>
          </div>
        </div>
      </div>

      {/* Smart Timeline Info */}
      <div className="bg-blue-50 rounded-lg border border-blue-200 p-4 sm:p-6">
        <div className="flex flex-col sm:flex-row items-center sm:items-start text-center sm:text-left gap-3">
          <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center flex-shrink-0">
            <Clock className="w-5 h-5 text-white" />
          </div>
          <div>
            <h4 className="font-medium text-blue-900 mb-2">Smart Timeline Range</h4>
            <p className="text-sm text-blue-700">
              This timeline automatically adjusts to show only the relevant hours ({timeRange.startHour}:00 - {timeRange.endHour}:00) 
              based on your workers' schedules and job times. Use the navigation buttons above to scroll through different time periods.
            </p>
          </div>
        </div>
      </div>

      {/* Availability Exception Modal */}
      {selectedWorkerForException && (
        <AvailabilityExceptionModal
          workerId={selectedWorkerForException}
          workers={workers}
          selectedDate={selectedDate}
          dayJobs={dayJobs}
          onClose={() => setSelectedWorkerForException(null)}
        />
      )}

      {/* Worker Details Popup */}
      {showWorkerDetails && (
        <WorkerDetailsPopup
          workerId={showWorkerDetails}
          workers={workers}
          dayJobs={dayJobs}
          selectedDate={selectedDate}
          workerUtilizations={workerUtilizations}
          onClose={() => setShowWorkerDetails(null)}
          onJobClick={onJobClick}
          onSetAvailability={(workerId) => {
            setShowWorkerDetails(null);
            setSelectedWorkerForException(workerId);
          }}
        />
      )}
    </div>
  )
} 