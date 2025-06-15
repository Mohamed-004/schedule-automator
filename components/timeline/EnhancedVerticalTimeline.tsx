'use client'

import { useState, useEffect } from 'react'
import { Calendar, ChevronLeft, ChevronRight, RefreshCw, Users, Clock, CheckCircle, AlertCircle, MapPin } from 'lucide-react'
import { useRealTimelineData } from '@/hooks/useRealTimelineData'
import { sortTimeBlocks, formatDuration as utilFormatDuration } from '@/lib/time-utils'

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

const WorkerRow = ({ worker }: WorkerRowProps) => {
  const [showDetails, setShowDetails] = useState(false)

  const formatDuration = utilFormatDuration

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
                      </div>
                    )
                  } else {
                    return (
                      <div
                        key={block.id}
                        className="timeline-item p-3 md:p-4 rounded-lg border border-green-200 bg-green-50 hover:bg-green-100 transition-colors"
                      >
                        <div className="text-center">
                          <div className="w-6 h-6 md:w-8 md:h-8 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-2">
                            <Clock className="w-3 h-3 md:w-4 md:h-4 text-white" />
                          </div>
                          <h5 className="font-semibold text-green-800 mb-1 text-sm md:text-base">Available</h5>
                          <div className="text-xs md:text-sm text-green-700 font-medium">
                            {block.startTime} - {block.endTime}
                          </div>
                          <div className="text-xs text-green-600 mt-1">
                            {formatDuration(block.duration)} free
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
            <Clock className="w-3 h-3" />
            <span>Working: {worker.workingHours}</span>
          </div>
        </div>
      </div>

      {/* Empty State - Only show if no jobs AND no available slots */}
      {worker.jobs.length === 0 && worker.availableSlots.length === 0 && (
        <div className="text-center py-8">
          <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="w-8 h-8 text-orange-600" />
          </div>
          <h4 className="text-lg font-medium text-gray-900 mb-2">Not working today</h4>
          <p className="text-gray-600">No jobs or availability information found</p>
          <div className="mt-4 inline-flex items-center px-4 py-2 bg-orange-50 text-orange-700 rounded-lg border border-orange-200">
            <Clock className="w-4 h-4 mr-2" />
            <span className="font-medium">Working Hours: {worker.workingHours}</span>
          </div>
        </div>
      )}
    </div>
  )
}

const DatePicker = ({ selectedDate, onDateChange }: { 
  selectedDate: Date, 
  onDateChange: (date: Date) => void 
}) => {
  const [isOpen, setIsOpen] = useState(false)
  const [currentMonth, setCurrentMonth] = useState(selectedDate)
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768)
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    }).format(date)
  }

  const changeMonth = (offset: number) => {
    setCurrentMonth(prev => {
      const newMonth = new Date(prev)
      newMonth.setMonth(prev.getMonth() + offset)
      return newMonth
    })
  }

  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear()
    const month = date.getMonth()
    const firstDay = new Date(year, month, 1)
    const lastDay = new Date(year, month + 1, 0)
    
    const days = []
    for (let i = 1; i <= lastDay.getDate(); i++) {
      days.push(new Date(year, month, i))
    }
    
    const prefixDays = firstDay.getDay()
    for (let i = 0; i < prefixDays; i++) {
      days.unshift(null)
    }

    return days
  }

  const getFirstDayOfMonth = (date: Date) => {
    const year = date.getFullYear()
    const month = date.getMonth()
    return new Date(year, month, 1).getDay()
  }

  const isToday = (date: Date) => {
    const today = new Date()
    return today.getDate() === date.getDate() && today.getMonth() === date.getMonth() && today.getFullYear() === date.getFullYear()
  }

  const isSelected = (date: Date) => {
    return date.getDate() === selectedDate.getDate() &&
           date.getMonth() === selectedDate.getMonth() &&
           date.getFullYear() === selectedDate.getFullYear()
  }

  const handleDateSelect = (date: Date) => {
    onDateChange(date)
    setIsOpen(false)
  }

  const calendarDays = () => {
    const days = []
    const daysInMonth = getDaysInMonth(currentMonth).length

    // Days of the current month
    for (let day = 1; day <= daysInMonth; day++) {
      const currentDate = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day)
      days.push(
        <div key={`current-${day}`} className="flex items-center justify-center">
          <button
            onClick={() => handleDateSelect(currentDate)}
            className={`
              w-full h-full p-1 rounded-full text-sm transition-colors
              md:w-8 md:h-8
              ${isSelected(currentDate) ? 'bg-blue-600 text-white font-bold shadow-lg' : ''}
              ${!isSelected(currentDate) && isToday(currentDate) ? 'bg-blue-100 text-blue-700' : ''}
              ${!isSelected(currentDate) && !isToday(currentDate) ? 'text-gray-700 hover:bg-gray-100' : ''}
            `}
          >
            {day}
          </button>
        </div>
      )
    }

    return days
  }
  
  const calendarModal = (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="relative w-full max-w-sm rounded-xl border bg-white p-4 shadow-2xl">
        <div className="mb-4 flex items-center justify-between">
          <button onClick={() => changeMonth(-1)} className="p-2 rounded-full hover:bg-gray-100">
            <ChevronLeft className="h-5 w-5 text-gray-600" />
          </button>
          <div className="text-lg font-semibold text-gray-800">
            {currentMonth.toLocaleString('default', { month: 'long', year: 'numeric' })}
          </div>
          <button onClick={() => changeMonth(1)} className="p-2 rounded-full hover:bg-gray-100">
            <ChevronRight className="h-5 w-5 text-gray-600" />
          </button>
        </div>
        <div className="grid grid-cols-7 gap-1 text-center text-xs font-medium text-gray-500 mb-2">
          <div>Su</div>
          <div>Mo</div>
          <div>Tu</div>
          <div>We</div>
          <div>Th</div>
          <div>Fr</div>
          <div>Sa</div>
        </div>
        <div className="grid grid-cols-7 gap-y-1">
          {calendarDays()}
        </div>
        <div className="mt-4 flex justify-end gap-2">
          <button 
            onClick={() => setIsOpen(false)}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  )

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center space-x-2 rounded-lg border bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm transition-colors hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
      >
        <Calendar className="h-5 w-5 text-gray-500" />
        <span>{formatDate(selectedDate)}</span>
      </button>

      {isOpen && (
        isMobile ? calendarModal : (
          <div className="absolute left-0 mt-2 z-20 w-72 origin-top-left rounded-md bg-white shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none">
            <div className="p-3">
              <div className="mb-3 flex items-center justify-between">
                <button onClick={() => changeMonth(-1)} className="p-1.5 rounded-full hover:bg-gray-100">
                  <ChevronLeft className="h-5 w-5 text-gray-500" />
                </button>
                <div className="text-sm font-semibold text-gray-900">
                  {currentMonth.toLocaleString('default', { month: 'long', year: 'numeric' })}
                </div>
                <button onClick={() => changeMonth(1)} className="p-1.5 rounded-full hover:bg-gray-100">
                  <ChevronRight className="h-5 w-5 text-gray-500" />
                </button>
              </div>
              <div className="grid grid-cols-7 gap-1 text-center text-xs font-medium text-gray-500 mb-2">
                <div>Su</div>
                <div>Mo</div>
                <div>Tu</div>
                <div>We</div>
                <div>Th</div>
                <div>Fr</div>
                <div>Sa</div>
              </div>
              <div className="grid grid-cols-7 gap-y-1">
                {calendarDays()}
              </div>
            </div>
          </div>
        )
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
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Team Timeline</h1>
          <p className="text-base text-gray-600 mt-1">
            {`Schedule for ${formatDateForDisplay(selectedDate)}`}
          </p>
        </div>
        
        <div className="flex items-center space-x-2">
          <div className="flex items-center border rounded-md">
            <button
              onClick={() => changeDate(-1)}
              className="p-2 border-r hover:bg-gray-100 transition-colors"
              aria-label="Previous day"
            >
              <ChevronLeft className="w-5 h-5 text-gray-600" />
            </button>
            <DatePicker selectedDate={selectedDate} onDateChange={handleDateChange} />
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
            <WorkerRow key={worker.id} worker={worker} />
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
    </div>
  )
} 