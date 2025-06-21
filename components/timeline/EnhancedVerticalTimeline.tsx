'use client'

import { useState, useEffect, useRef } from 'react'
import { Calendar, ChevronLeft, ChevronRight, RefreshCw, Users, Clock, CheckCircle, AlertCircle, MapPin, Send, MoreHorizontal, Zap } from 'lucide-react'
import { format } from 'date-fns'
import { useRealTimelineData } from '@/hooks/useRealTimelineData'
import { sortTimeBlocks, formatDuration as utilFormatDuration } from '@/lib/time-utils'
import { WorkerSwapModal } from './WorkerSwapModal'
import { EnhancedRescheduleModal } from './EnhancedRescheduleModal'
import { SmartAssignmentModal } from './SmartAssignmentModal'
import { Button } from '@/components/ui/button'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'

interface WorkerRowProps {
  worker: {
    id: string
    name: string
    status: 'busy' | 'scheduled' | 'available' | 'unavailable'
    workingHours: string
    utilization: number
    jobs: Array<{
      id: string
      title: string
      client: string
      startTime: string
      duration: string
      status: 'scheduled' | 'in_progress' | 'completed'
      color: string
    }>
    availableSlots: Array<{
      startTime: string
      endTime: string
      type: 'available' | 'scheduled'
      duration: number
    }>
    totalWorkingMinutes: number
    totalScheduledMinutes: number
  }
  onSwapWorker?: (jobId: string) => void
  onReschedule?: (jobId: string) => void
  onAvailabilityClick?: (workerId: string, workerName: string, timeSlot: { startTime: string; endTime: string }) => void
  selectedDate: Date
}

const StatusIndicator = ({ status }: { status: 'busy' | 'scheduled' | 'available' | 'unavailable' }) => {
  const getStatusConfig = (status: string) => {
    switch (status) {
      case 'busy':
        return {
          color: 'bg-red-500',
          label: 'Busy',
          textColor: 'text-red-700',
          bgColor: 'bg-red-50',
          borderColor: 'border-red-200'
        }
      case 'scheduled':
        return {
          color: 'bg-blue-500',
          label: 'Scheduled',
          textColor: 'text-blue-700',
          bgColor: 'bg-blue-50',
          borderColor: 'border-blue-200'
        }
      case 'available':
        return {
          color: 'bg-green-500',
          label: 'Available',
          textColor: 'text-green-700',
          bgColor: 'bg-green-50',
          borderColor: 'border-green-200'
        }
      case 'unavailable':
        return {
          color: 'bg-orange-500',
          label: 'Not Available',
          textColor: 'text-orange-700',
          bgColor: 'bg-orange-50',
          borderColor: 'border-orange-200'
        }
      default:
        return {
          color: 'bg-gray-500',
          label: 'Unknown',
          textColor: 'text-gray-700',
          bgColor: 'bg-gray-50',
          borderColor: 'border-gray-200'
        }
    }
  }

  const config = getStatusConfig(status)

  return (
    <div className={`flex items-center space-x-2 px-3 py-1 rounded-full border ${config.bgColor} ${config.borderColor}`}>
      <div className={`w-2 h-2 rounded-full ${config.color} animate-pulse`}></div>
      <span className={`text-sm font-medium ${config.textColor}`}>{config.label}</span>
    </div>
  )
}

const UtilizationBadge = ({ utilization }: { utilization: number }) => {
  const getUtilizationConfig = (util: number) => {
    if (util >= 70) {
      return {
        color: 'bg-green-500',
        textColor: 'text-green-700',
        bgColor: 'bg-green-50',
        borderColor: 'border-green-200',
        label: 'High Efficiency'
      }
    } else if (util >= 30) {
      return {
        color: 'bg-yellow-500',
        textColor: 'text-yellow-700',
        bgColor: 'bg-yellow-50',
        borderColor: 'border-yellow-200',
        label: 'Medium Efficiency'
      }
    } else {
      return {
        color: 'bg-red-500',
        textColor: 'text-red-700',
        bgColor: 'bg-red-50',
        borderColor: 'border-red-200',
        label: 'Low Efficiency'
      }
    }
  }

  const config = getUtilizationConfig(utilization)

  return (
    <div className={`flex items-center space-x-2 px-2 md:px-3 py-1.5 rounded-full border ${config.bgColor} ${config.borderColor}`}>
      <div className={`w-3 h-3 rounded-full ${config.color} animate-pulse`}></div>
      <div className="flex items-center space-x-2">
        <span className={`text-base md:text-lg font-bold ${config.textColor}`}>{utilization}%</span>
        <span className={`text-xs md:text-sm ${config.textColor} font-medium`}>{config.label}</span>
      </div>
    </div>
  )
}

const WorkerRow = ({ worker, onSwapWorker, onReschedule, onAvailabilityClick, selectedDate }: WorkerRowProps) => {
  const [showDetails, setShowDetails] = useState(false)

  const formatDuration = utilFormatDuration

  const handleAvailabilityClick = (timeSlot: { startTime: string; endTime: string }) => {
    if (onAvailabilityClick) {
      onAvailabilityClick(worker.id, worker.name, timeSlot)
    }
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4 md:p-6 shadow-sm hover:shadow-lg transition-all duration-200">
      <style jsx>{`
        .timeline-wrapper {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }
        .timeline-content {
          display: flex;
          flex-direction: column;
          gap: 16px;
          width: 100%;
        }
        .timeline-item {
          width: 100%;
        }
        
        /* Tablet and larger screens */
        @media (min-width: 768px) {
          .timeline-wrapper {
            flex-direction: row;
            overflow-x: auto;
            overflow-y: hidden;
            padding-bottom: 16px; /* For scrollbar spacing */
            margin-bottom: -16px;
            gap: 0;
            scrollbar-width: thin;
            scrollbar-color: #cbd5e1 #f1f5f9;
          }
          .timeline-wrapper::-webkit-scrollbar {
            height: 8px;
          }
          .timeline-wrapper::-webkit-scrollbar-track {
            background: #f1f5f9;
            border-radius: 4px;
          }
          .timeline-wrapper::-webkit-scrollbar-thumb {
            background: #cbd5e1;
            border-radius: 4px;
          }
          .timeline-wrapper::-webkit-scrollbar-thumb:hover {
            background: #94a3b8;
          }
          .timeline-content {
            flex-direction: row;
            gap: 16px;
            min-width: max-content;
            padding: 0 4px; /* Small padding for visual separation */
          }
          .timeline-item {
            width: 280px; /* Base width for tablet */
            flex-shrink: 0;
          }
        }

        /* Desktop */
        @media (min-width: 1024px) {
          .timeline-item {
            width: 320px;
          }
        }
      `}</style>
      {/* Worker Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
        <div className="flex items-center space-x-3 md:space-x-4">
          <div className="relative flex-shrink-0">
            <div className="w-12 h-12 md:w-14 md:h-14 rounded-full bg-gradient-to-r from-blue-500 to-blue-600 flex items-center justify-center text-white font-bold text-base md:text-lg shadow-lg worker-avatar-mobile">
              {worker.name.split(' ').map(n => n[0]).join('')}
            </div>
            {/* Status indicator positioned on avatar */}
            <div className="absolute -top-1 -right-1">
              <div className={`w-3 h-3 md:w-4 md:h-4 rounded-full border-2 border-white ${
                worker.status === 'busy' ? 'bg-red-500' :
                worker.status === 'scheduled' ? 'bg-blue-500' :
                worker.status === 'available' ? 'bg-green-500' : 'bg-orange-500'
              }`}></div>
            </div>
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="text-lg md:text-xl font-bold text-gray-900 truncate">{worker.name}</h3>
            <div className="flex items-center space-x-2 text-sm text-gray-600 mt-1">
              <Clock className="w-4 h-4 flex-shrink-0" />
              <span>{worker.workingHours}</span>
            </div>
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-gray-500 mt-1">
              <span>{worker.jobs.length} jobs scheduled</span>
              <span className="hidden sm:inline">•</span>
              <span>{formatDuration(worker.totalScheduledMinutes)} booked</span>
            </div>
          </div>
        </div>
        
        <div className="flex flex-wrap items-center gap-2 sm:gap-3 worker-status-mobile">
          <StatusIndicator status={worker.status} />
          <UtilizationBadge utilization={worker.utilization} />
        </div>
      </div>

      {/* Working Hours Summary */}
      <div className="grid grid-cols-3 gap-2 md:gap-4 mb-4 p-3 md:p-4 bg-gray-50 rounded-lg worker-stats-mobile">
        <div className="text-center">
          <div className="text-lg md:text-2xl font-bold text-gray-900">{formatDuration(worker.totalWorkingMinutes)}</div>
          <div className="text-xs md:text-sm text-gray-600">Total Hours</div>
        </div>
        <div className="text-center">
          <div className="text-lg md:text-2xl font-bold text-blue-600">{formatDuration(worker.totalScheduledMinutes)}</div>
          <div className="text-xs md:text-sm text-gray-600">Scheduled</div>
        </div>
        <div className="text-center">
          <div className="text-lg md:text-2xl font-bold text-green-600">
            {formatDuration(worker.totalWorkingMinutes - worker.totalScheduledMinutes)}
          </div>
          <div className="text-xs md:text-sm text-gray-600">Available</div>
        </div>
      </div>

      {/* Horizontal Timeline */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h4 className="font-semibold text-gray-800">Daily Timeline</h4>
          <div className="flex items-center space-x-3">
            <div className="text-sm text-gray-600">
              {worker.jobs.length} jobs • {worker.availableSlots.length} available slots
            </div>
          </div>
        </div>
        
        <div className="timeline-wrapper">
          <div className="timeline-content">
              {(() => {
                const allBlocks = [
                  ...worker.jobs.map(job => ({
                    ...job,
                    type: 'job' as const
                  })),
                  ...worker.availableSlots.map((slot, index) => ({
                    ...slot,
                    type: 'available' as const,
                    id: `slot-${index}`
                  }))
                ]

                const sortedBlocks = sortTimeBlocks(allBlocks)

                return sortedBlocks.map((block) => {
                  if (block.type === 'job') {
                    return (
                      <div
                        key={block.id}
                        className={`timeline-item p-3 md:p-4 rounded-lg border-l-4 ${block.color.replace('border-', 'border-l-')} bg-white shadow-sm hover:shadow-md transition-all duration-200`}
                      >
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex-1 min-w-0">
                            <h5 className="font-semibold text-gray-900 text-sm md:text-base truncate">{block.title}</h5>
                            <p className="text-xs md:text-sm text-gray-600 truncate">{block.client}</p>
                          </div>
                          <span className={`ml-2 px-2 py-1 text-xs font-medium rounded-full whitespace-nowrap ${
                            block.status === 'completed' ? 'bg-green-100 text-green-800' :
                            block.status === 'in_progress' ? 'bg-blue-100 text-blue-800' :
                            'bg-yellow-100 text-yellow-800'
                          }`}>
                            {block.status.replace('_', ' ')}
                          </span>
                        </div>
                        
                        <div className="space-y-1 md:space-y-2">
                          <div className="flex items-center text-xs md:text-sm text-gray-600">
                            <Clock className="w-3 h-3 md:w-4 md:h-4 mr-2 flex-shrink-0" />
                            <span className="font-medium">{block.startTime}</span>
                            <span className="mx-1 md:mx-2">•</span>
                            <span>{block.duration}</span>
                          </div>
                          <div className="flex items-center text-xs md:text-sm text-gray-600">
                            <MapPin className="w-3 h-3 md:w-4 md:h-4 mr-2 flex-shrink-0" />
                            <span className="truncate">{block.client}</span>
                          </div>
                        </div>
                        
                        {/* Action buttons for scheduled jobs */}
                        {block.status === 'scheduled' && (onSwapWorker || onReschedule) && (
                          <div className="mt-3 pt-3 border-t border-gray-100">
                            <div className="flex items-center justify-end space-x-2">
                              {onSwapWorker && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => onSwapWorker(block.id)}
                                  className="text-xs"
                                >
                                  <Users className="w-3 h-3 mr-1" />
                                  Swap Worker
                                </Button>
                              )}
                              {onReschedule && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => onReschedule(block.id)}
                                  className="text-xs"
                                >
                                  <Send className="w-3 h-3 mr-1" />
                                  Reschedule
                                </Button>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    )
                  } else {
                    return (
                      <div
                        key={block.id}
                        className="timeline-item p-3 md:p-4 rounded-lg border-2 border-green-200 bg-green-50 hover:bg-green-100 hover:border-green-300 transition-all duration-200 cursor-pointer group"
                        onClick={() => handleAvailabilityClick({ startTime: block.startTime, endTime: block.endTime })}
                        title="Click to assign a job to this time slot"
                      >
                        <div className="text-center relative">
                          <div className="w-6 h-6 md:w-8 md:h-8 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-2 group-hover:bg-green-600 transition-colors">
                            <Clock className="w-3 h-3 md:w-4 md:h-4 text-white" />
                          </div>
                          <h5 className="font-semibold text-green-800 mb-1 text-sm md:text-base">Available</h5>
                          <div className="text-xs md:text-sm text-green-700 font-medium">
                            {block.startTime} - {block.endTime}
                          </div>
                          <div className="text-xs text-green-600 mt-1">
                            {formatDuration(block.duration)} free
                          </div>
                          
                          {/* Smart Assignment Indicator */}
                          <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200 bg-green-100 bg-opacity-90 rounded-lg">
                            <div className="flex items-center gap-1 bg-green-600 text-white text-xs px-2 py-1 rounded shadow-lg font-medium">
                              <Zap className="w-3 h-3" />
                              <span className="hidden sm:inline">Click to Assign Job</span>
                              <span className="sm:hidden">Assign</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    )
                  }
                })
              })()}
            </div>
        </div>

        {/* Timeline Summary */}
        <div className="flex flex-wrap gap-4 text-sm text-gray-600 pt-2 border-t border-gray-100">
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 bg-blue-500 rounded"></div>
            <span>Scheduled Jobs ({worker.jobs.length})</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 bg-green-500 rounded"></div>
            <span>Available Slots ({worker.availableSlots.length})</span>
          </div>
          <div className="flex items-center space-x-2">
            <Zap className="w-3 h-3 text-green-600" />
            <span className="text-green-600 font-medium">Click available slots to assign jobs</span>
          </div>
        </div>
      </div>
    </div>
  )
}

const DatePicker = ({ selectedDate, onDateChange }: { 
  selectedDate: Date, 
  onDateChange: (date: Date) => void 
}) => {
  const [isOpen, setIsOpen] = useState(false)
  const [currentMonth, setCurrentMonth] = useState(new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1))
  const [isMobile, setIsMobile] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768)
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('en-US', {
      weekday: isMobile ? 'short' : 'long',
      month: isMobile ? 'short' : 'long',
      day: 'numeric'
    }).format(date)
  }

  const changeMonth = (offset: number) => {
    const newMonth = new Date(currentMonth)
    newMonth.setMonth(newMonth.getMonth() + offset)
    setCurrentMonth(newMonth)
  }

  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear()
    const month = date.getMonth()
    const firstDay = new Date(year, month, 1)
    const lastDay = new Date(year, month + 1, 0)
    const daysInMonth = lastDay.getDate()
    const startingDayOfWeek = firstDay.getDay()

    const days = []
    
    // Add empty cells for days before the first day of the month
    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(null)
    }
    
    // Add all days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      days.push(new Date(year, month, day))
    }
    
    return days
  }

  const getFirstDayOfMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth(), 1)
  }

  const isToday = (date: Date) => {
    const today = new Date()
    return date.toDateString() === today.toDateString()
  }

  const isSelected = (date: Date) => {
    return date.toDateString() === selectedDate.toDateString()
  }

  const handleDateSelect = (date: Date) => {
    onDateChange(date)
    setIsOpen(false)
  }

  const calendarDays = () => {
    const days = getDaysInMonth(currentMonth)
    const weeks = []
    
    for (let i = 0; i < days.length; i += 7) {
      weeks.push(days.slice(i, i + 7))
    }
    
    return weeks
  }

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center space-x-2 px-3 md:px-4 py-2 text-sm md:text-base font-medium text-gray-700 bg-white hover:bg-gray-50 transition-colors min-w-0"
      >
        <Calendar className="w-4 h-4 md:w-5 md:h-5 text-gray-500 flex-shrink-0" />
        <span className="truncate">{formatDate(selectedDate)}</span>
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-50 min-w-[280px]">
          <div className="p-4">
            {/* Month navigation */}
            <div className="flex items-center justify-between mb-4">
              <button
                onClick={() => changeMonth(-1)}
                className="p-1 hover:bg-gray-100 rounded transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <h3 className="font-semibold text-gray-900">
                {new Intl.DateTimeFormat('en-US', { 
                  month: 'long', 
                  year: 'numeric' 
                }).format(currentMonth)}
              </h3>
              <button
                onClick={() => changeMonth(1)}
                className="p-1 hover:bg-gray-100 rounded transition-colors"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            {/* Calendar grid */}
            <div className="grid grid-cols-7 gap-1 mb-2">
              {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map(day => (
                <div key={day} className="text-center text-xs font-medium text-gray-500 py-2">
                  {day}
                </div>
              ))}
            </div>

            <div className="grid grid-cols-7 gap-1">
              {calendarDays().map((week, weekIndex) => 
                week.map((date, dayIndex) => (
                  <div key={`${weekIndex}-${dayIndex}`} className="aspect-square">
                    {date ? (
                      <button
                        onClick={() => handleDateSelect(date)}
                        className={`w-full h-full flex items-center justify-center text-sm rounded transition-colors ${
                          isSelected(date)
                            ? 'bg-blue-500 text-white font-medium'
                            : isToday(date)
                            ? 'bg-blue-100 text-blue-600 font-medium'
                            : 'hover:bg-gray-100 text-gray-700'
                        }`}
                      >
                        {date.getDate()}
                      </button>
                    ) : (
                      <div className="w-full h-full"></div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

/**
 * Enhanced vertical timeline component with improved status indicators, utilization display, 
 * time slots management, and proper date picker
 */
export default function EnhancedVerticalTimeline() {
  const [selectedDate, setSelectedDate] = useState(new Date())
  
  const { workersData, stats, isLoading, error, refreshData } = useRealTimelineData(selectedDate)
  
  // Modal states
  const [swapModalOpen, setSwapModalOpen] = useState(false)
  const [rescheduleModalOpen, setRescheduleModalOpen] = useState(false)
  const [smartAssignmentModalOpen, setSmartAssignmentModalOpen] = useState(false)
  const [selectedJobId, setSelectedJobId] = useState<string | null>(null)
  const [selectedWorker, setSelectedWorker] = useState<{ id: string; name: string } | null>(null)
  const [selectedTimeSlot, setSelectedTimeSlot] = useState<{ startTime: string; endTime: string } | null>(null)

  const changeDate = (days: number) => {
    const newDate = new Date(selectedDate)
    newDate.setDate(newDate.getDate() + days)
    setSelectedDate(newDate)
  }

  const handleDateChange = (date: Date) => {
    setSelectedDate(date)
  }
  
  const formatDateForDisplay = (date: Date) => {
    const today = new Date();
    const tomorrow = new Date();
    tomorrow.setDate(today.getDate() + 1);
    
    if (date.toDateString() === today.toDateString()) return 'Today';
    if (date.toDateString() === tomorrow.toDateString()) return 'Tomorrow';
    
    return new Intl.DateTimeFormat('en-US', {
      weekday: 'long',
      month: 'short',
      day: 'numeric'
    }).format(date);
  }

  // Modal handlers
  const handleSwapWorker = (jobId: string) => {
    setSelectedJobId(jobId)
    setSwapModalOpen(true)
  }

  const handleReschedule = (jobId: string) => {
    setSelectedJobId(jobId)
    setRescheduleModalOpen(true)
  }

  const handleAvailabilityClick = (workerId: string, workerName: string, timeSlot: { startTime: string; endTime: string }) => {
    setSelectedWorker({ id: workerId, name: workerName })
    setSelectedTimeSlot(timeSlot)
    setSmartAssignmentModalOpen(true)
  }

  const handleModalComplete = () => {
    // Refresh data after successful operation
    refreshData()
    setSelectedJobId(null)
    setSelectedWorker(null)
    setSelectedTimeSlot(null)
  }

  // Find the selected job from workers data
  const selectedJob = selectedJobId ? workersData
    .flatMap(worker => worker.jobs)
    .find(job => job.id === selectedJobId) : null

  // Convert job format for the modal
  const modalJob = selectedJob ? (() => {
    try {
      // Parse duration - could be "60m", "1h 30m", "90", etc.
      let duration = 60 // Default duration
      if (selectedJob.duration) {
        const durationStr = selectedJob.duration.toString()
        
        // Handle different duration formats
        if (durationStr.includes('h')) {
          const hourMatch = durationStr.match(/(\d+)h/)
          const minuteMatch = durationStr.match(/(\d+)m/)
          const hours = hourMatch ? parseInt(hourMatch[1]) : 0
          const minutes = minuteMatch ? parseInt(minuteMatch[1]) : 0
          duration = hours * 60 + minutes
        } else if (durationStr.includes('m')) {
          const minuteMatch = durationStr.match(/(\d+)m/)
          duration = minuteMatch ? parseInt(minuteMatch[1]) : 60
        } else {
          // Assume it's just a number (minutes)
          const numDuration = parseInt(durationStr)
          if (!isNaN(numDuration)) {
            duration = numDuration
          }
        }
      }
      
      // Handle startTime - it's a time string like "09:00 AM"
      let scheduledAt: string
      if (selectedJob.startTime) {
        // Convert time string to full datetime
        const dateStr = format(selectedDate, 'yyyy-MM-dd')
        
        // Handle 12-hour format like "09:00 AM"
        if (selectedJob.startTime.includes('AM') || selectedJob.startTime.includes('PM')) {
          const timeStr = selectedJob.startTime.replace(/\s*(AM|PM)/i, '')
          const [hours, minutes] = timeStr.split(':').map(Number)
          const isPM = selectedJob.startTime.toUpperCase().includes('PM')
          let hour24 = hours
          
          if (isPM && hours !== 12) hour24 += 12
          if (!isPM && hours === 12) hour24 = 0
          
          const timeFormatted = `${hour24.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`
          scheduledAt = `${dateStr}T${timeFormatted}:00`
        } else {
          // Handle 24-hour format
          scheduledAt = `${dateStr}T${selectedJob.startTime}:00`
        }
      } else {
        scheduledAt = new Date().toISOString()
      }
      
      return {
        id: selectedJob.id,
        title: selectedJob.title,
        description: '',
        scheduled_at: scheduledAt,
        duration_minutes: duration,
        client_name: selectedJob.client || 'Unknown Client',
        client_phone: '',
        location: '',
        status: selectedJob.status,
        worker_id: '',
        worker: undefined
      }
    } catch (error) {
      console.error('Error converting job format:', error)
      return null
    }
  })() : null

  // Handle reschedule operation
  const handleRescheduleJob = async (jobId: string, newDateTime: string, workerId: string, reason?: string, notifyClient?: boolean) => {
    try {
      const requestBody = {
        action: 'manual-reschedule',
        newDateTime,
        newWorkerId: workerId,
        reason,
        notifyClient
      }
      
      console.log('🚀 TIMELINE DEBUG - Making reschedule API call:', {
        url: `/api/jobs/${jobId}/reschedule`,
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: requestBody,
        jobId,
        newDateTime,
        workerId,
        reason,
        notifyClient
      })

      const response = await fetch(`/api/jobs/${jobId}/reschedule`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody)
      })

      console.log('📡 TIMELINE DEBUG - API Response received:', {
        status: response.status,
        statusText: response.statusText,
        ok: response.ok,
        headers: Object.fromEntries(response.headers.entries())
      })

      if (!response.ok) {
        const errorData = await response.json()
        console.error('❌ TIMELINE DEBUG - API Error Response:', {
          status: response.status,
          statusText: response.statusText,
          errorData
        })
        throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`)
      }

      const successData = await response.json()
      console.log('✅ TIMELINE DEBUG - API Success Response:', successData)

      handleModalComplete()
    } catch (error) {
      console.error('❌ TIMELINE DEBUG - Error in handleRescheduleJob:', error)
      
      // Enhanced error logging
      if (error instanceof Error) {
        console.error('❌ TIMELINE DEBUG - Error details:', {
          message: error.message,
          stack: error.stack,
          name: error.name
        })
      }
      
      throw error
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="flex items-center space-x-3">
          <RefreshCw className="w-6 h-6 animate-spin text-blue-500" />
          <span className="text-lg text-gray-600">Loading timeline data...</span>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6 max-w-full overflow-hidden">
      {/* Header - Title on left, calendar below */}
      <div className="flex flex-col gap-4">
        {/* Title section - back to left */}
        <div className="text-left">
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Team Timeline</h1>
          <p className="text-base text-gray-600 mt-1">
            {`Schedule for ${formatDateForDisplay(selectedDate)}`}
          </p>
          <div className="flex items-center gap-2 mt-2 text-sm text-green-600">
            <Zap className="w-4 h-4" />
            <span className="font-medium">Click on available time slots to assign jobs instantly</span>
          </div>
        </div>
        
        {/* Date picker section - below title */}
        <div className="flex items-center space-x-2">
          <div className="flex items-center border rounded-md bg-white shadow-sm">
            <button
              onClick={() => changeDate(-1)}
              className="p-2 border-r hover:bg-gray-100 transition-colors"
              aria-label="Previous day"
            >
              <ChevronLeft className="w-5 h-5 text-gray-600" />
            </button>
            <div className="relative">
              <DatePicker selectedDate={selectedDate} onDateChange={handleDateChange} />
            </div>
            <button
              onClick={() => changeDate(1)}
              className="p-2 border-l hover:bg-gray-100 transition-colors"
              aria-label="Next day"
            >
              <ChevronRight className="w-5 h-5 text-gray-600" />
            </button>
          </div>
        </div>
      </div>

      {/* Enhanced Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
        <div className="bg-white p-3 md:p-4 rounded-lg border border-gray-200 hover:shadow-md transition-shadow">
          <div className="flex items-center space-x-2 mb-1">
            <Clock className="w-3 h-3 md:w-4 md:h-4 text-blue-500 flex-shrink-0" />
            <span className="text-xs md:text-sm font-medium text-gray-600 truncate">Total Jobs</span>
          </div>
          <div className="text-xl md:text-2xl font-bold text-gray-900">{stats.totalJobs}</div>
          <div className="text-xs text-gray-500 mt-1">
            {stats.totalJobs === 1 ? 'job' : 'jobs'} scheduled
          </div>
        </div>

        <div className="bg-white p-3 md:p-4 rounded-lg border border-gray-200 hover:shadow-md transition-shadow">
          <div className="flex items-center space-x-2 mb-1">
            <CheckCircle className="w-3 h-3 md:w-4 md:h-4 text-green-500 flex-shrink-0" />
            <span className="text-xs md:text-sm font-medium text-gray-600 truncate">Completed</span>
          </div>
          <div className="text-xl md:text-2xl font-bold text-gray-900">{stats.completedJobs}</div>
          <div className="text-xs text-gray-500 mt-1">
            {stats.totalJobs > 0 ? Math.round((stats.completedJobs / stats.totalJobs) * 100) : 0}% completion rate
          </div>
        </div>

        <div className="bg-white p-3 md:p-4 rounded-lg border border-gray-200 hover:shadow-md transition-shadow">
          <div className="flex items-center space-x-2 mb-1">
            <Users className="w-3 h-3 md:w-4 md:h-4 text-purple-500 flex-shrink-0" />
            <span className="text-xs md:text-sm font-medium text-gray-600 truncate">Workers</span>
          </div>
          <div className="text-xl md:text-2xl font-bold text-gray-900">{stats.totalWorkers}</div>
          <div className="text-xs text-gray-500 mt-1">
            {stats.totalWorkers === 1 ? 'worker' : 'workers'} active
          </div>
        </div>

        <div className="bg-white p-3 md:p-4 rounded-lg border border-gray-200 hover:shadow-md transition-shadow">
          <div className="flex items-center space-x-2 mb-1">
            <div className={`w-3 h-3 md:w-4 md:h-4 rounded flex-shrink-0 ${
              stats.averageUtilization >= 70 ? 'bg-green-500' :
              stats.averageUtilization >= 30 ? 'bg-yellow-500' : 'bg-red-500'
            }`}></div>
            <span className="text-xs md:text-sm font-medium text-gray-600 truncate">Avg Utilization</span>
          </div>
          <div className="text-xl md:text-2xl font-bold text-gray-900">{Math.round(stats.averageUtilization)}%</div>
          <div className="text-xs text-gray-500 mt-1">
            Team efficiency
          </div>
        </div>
      </div>

      {/* Worker Rows */}
      {error ? (
        <div className="text-center py-12">
          <div className="bg-red-50 border border-red-200 rounded-lg p-6 max-w-md mx-auto">
            <div className="flex items-center justify-center space-x-2 mb-2">
              <AlertCircle className="w-6 h-6 text-red-600" />
              <span className="text-lg font-medium text-red-800">
                Error Loading Data
              </span>
            </div>
            <p className="text-red-700">{error}</p>
          </div>
        </div>
      ) : workersData.length > 0 ? (
        <div className="space-y-6">
          {workersData.map(worker => (
            <WorkerRow 
              key={worker.id} 
              worker={worker} 
              onSwapWorker={handleSwapWorker}
              onReschedule={handleReschedule}
              onAvailabilityClick={handleAvailabilityClick}
              selectedDate={selectedDate}
            />
          ))}
        </div>
      ) : (
        <div className="text-center py-12">
          <div className="bg-orange-50 border border-orange-200 rounded-lg p-6 max-w-md mx-auto">
            <div className="flex items-center justify-center space-x-2 mb-2">
              <AlertCircle className="w-6 h-6 text-orange-600" />
              <span className="text-lg font-medium text-orange-800">
                No Schedule Data
              </span>
            </div>
            <p className="text-orange-700">
              No workers or availability information found for this day.
            </p>
          </div>
        </div>
      )}

      {/* Modals */}
      {selectedJobId && (
        <>
          <WorkerSwapModal
            isOpen={swapModalOpen}
            onClose={() => setSwapModalOpen(false)}
            jobId={selectedJobId}
            onSwapComplete={handleModalComplete}
          />
          <EnhancedRescheduleModal
            isOpen={rescheduleModalOpen}
            onClose={() => setRescheduleModalOpen(false)}
            job={modalJob}
            onReschedule={handleRescheduleJob}
          />
        </>
      )}

      {/* Smart Assignment Modal */}
      {selectedWorker && selectedTimeSlot && (
        <SmartAssignmentModal
          isOpen={smartAssignmentModalOpen}
          onClose={() => {
            setSmartAssignmentModalOpen(false)
            setSelectedWorker(null)
            setSelectedTimeSlot(null)
          }}
          workerId={selectedWorker.id}
          workerName={selectedWorker.name}
          selectedDate={selectedDate}
          selectedTimeSlot={selectedTimeSlot}
          onJobCreated={handleModalComplete}
        />
      )}
    </div>
  )
}