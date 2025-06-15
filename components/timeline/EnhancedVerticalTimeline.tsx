'use client'

import { useState } from 'react'
import { Calendar, ChevronLeft, ChevronRight, RefreshCw, Users, Clock, CheckCircle, AlertCircle, Database, MapPin } from 'lucide-react'
import { useRealTimelineData } from '@/hooks/useRealTimelineData'
import { seedDatabaseWithTestData } from '@/lib/seed-data'
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
      {/* Worker Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
        <div className="flex items-center space-x-3 md:space-x-4">
          <div className="relative flex-shrink-0">
            <div className="w-12 h-12 md:w-14 md:h-14 rounded-full bg-gradient-to-r from-blue-500 to-blue-600 flex items-center justify-center text-white font-bold text-base md:text-lg shadow-lg">
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
        
        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          <StatusIndicator status={worker.status} />
          <UtilizationBadge utilization={worker.utilization} />
        </div>
      </div>

      {/* Working Hours Summary */}
      <div className="grid grid-cols-3 gap-2 md:gap-4 mb-4 p-3 md:p-4 bg-gray-50 rounded-lg">
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
            <div className="text-xs text-gray-500 flex items-center space-x-1">
              <span>Scroll →</span>
              <div className="w-2 h-2 bg-gray-400 rounded-full animate-pulse"></div>
            </div>
          </div>
        </div>

        {/* Horizontal Scrollable Timeline */}
        <div className="relative -mx-4 md:-mx-6">
          <style jsx>{`
            .timeline-scroll {
              scrollbar-width: thin;
              scrollbar-color: #cbd5e1 #f1f5f9;
            }
            .timeline-scroll::-webkit-scrollbar {
              height: 8px;
            }
            .timeline-scroll::-webkit-scrollbar-track {
              background: #f1f5f9;
              border-radius: 4px;
            }
            .timeline-scroll::-webkit-scrollbar-thumb {
              background: #cbd5e1;
              border-radius: 4px;
            }
            .timeline-scroll::-webkit-scrollbar-thumb:hover {
              background: #94a3b8;
            }
          `}</style>
          <div className="timeline-scroll overflow-x-auto overflow-y-hidden pb-4">
            <div className="flex space-x-3 px-4 md:px-6" style={{ width: 'max-content' }}>
              {/* Create timeline blocks by combining jobs and available slots */}
              {(() => {
                // Sort all time blocks (jobs + available slots) by start time
                const allBlocks = [
                  ...worker.jobs.map(job => ({
                    type: 'job' as const,
                    startTime: job.startTime,
                    title: job.title,
                    client: job.client,
                    duration: job.duration,
                    status: job.status,
                    color: job.color,
                    id: job.id
                  })),
                  ...worker.availableSlots.map((slot, index) => ({
                    type: 'available' as const,
                    startTime: slot.startTime,
                    endTime: slot.endTime,
                    duration: formatDuration(slot.duration),
                    id: `slot-${index}`
                  }))
                ]

                // Use the utility function to sort chronologically
                const sortedBlocks = sortTimeBlocks(allBlocks)

                return sortedBlocks.map((block) => {
                  if (block.type === 'job') {
                    return (
                      <div
                        key={block.id}
                        className={`flex-shrink-0 p-3 md:p-4 rounded-lg border-l-4 ${block.color.replace('border-', 'border-l-')} bg-white shadow-sm hover:shadow-md transition-all duration-200 w-60 sm:w-72 md:w-80`}
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
                        className="flex-shrink-0 p-3 md:p-4 rounded-lg border border-green-200 bg-green-50 hover:bg-green-100 transition-colors w-52 sm:w-60 md:w-64"
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
                            {block.duration} free
                          </div>
                        </div>
                      </div>
                    )
                  }
                })
              })()}
            </div>
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
  const [currentMonth, setCurrentMonth] = useState(new Date())

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    })
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
    
    // Add days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      days.push(new Date(year, month, day))
    }
    
    return days
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

  const days = getDaysInMonth(currentMonth)
  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ]

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center space-x-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
      >
        <Calendar className="w-4 h-4 text-gray-500" />
        <span className="font-medium text-gray-900">{formatDate(selectedDate)}</span>
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 mt-2 bg-white border border-gray-200 rounded-lg shadow-lg z-50 p-4 min-w-80">
          {/* Month Navigation */}
          <div className="flex items-center justify-between mb-4">
            <button
              onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1))}
              className="p-2 hover:bg-gray-100 rounded-lg"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <h3 className="font-semibold text-gray-900">
              {monthNames[currentMonth.getMonth()]} {currentMonth.getFullYear()}
            </h3>
            <button
              onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1))}
              className="p-2 hover:bg-gray-100 rounded-lg"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {/* Day Labels */}
          <div className="grid grid-cols-7 gap-1 mb-2">
            {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map(day => (
              <div key={day} className="text-center text-sm font-medium text-gray-500 py-2">
                {day}
              </div>
            ))}
          </div>

          {/* Calendar Grid */}
          <div className="grid grid-cols-7 gap-1">
            {days.map((day, index) => (
              <div key={index} className="h-10 flex items-center justify-center">
                {day && (
                  <button
                    onClick={() => handleDateSelect(day)}
                    className={`w-8 h-8 rounded-full text-sm font-medium transition-colors ${
                      isSelected(day)
                        ? 'bg-blue-600 text-white'
                        : isToday(day)
                        ? 'bg-blue-100 text-blue-600'
                        : 'hover:bg-gray-100 text-gray-700'
                    }`}
                  >
                    {day.getDate()}
                  </button>
                )}
              </div>
            ))}
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
  const [isSeeding, setIsSeeding] = useState(false)
  
  const { workersData, stats, isLoading, error, refreshData } = useRealTimelineData(selectedDate)

  const changeDate = (days: number) => {
    const newDate = new Date(selectedDate)
    newDate.setDate(newDate.getDate() + days)
    setSelectedDate(newDate)
  }

  const handleSeedDatabase = async () => {
    setIsSeeding(true)
    try {
      const result = await seedDatabaseWithTestData()
      if (result.success) {
        refreshData()
        alert('✅ Database seeded successfully! Timeline will now show real data.')
      } else {
        alert('❌ Failed to seed database: ' + result.error)
      }
    } catch (error) {
      alert('❌ Error seeding database: ' + (error instanceof Error ? error.message : 'Unknown error'))
    } finally {
      setIsSeeding(false)
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
    <div className="space-y-4 md:space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg border border-gray-200 p-4 md:p-6">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Team Schedule</h1>
            <p className="text-gray-600 mt-1 text-sm md:text-base">Manage your team's daily schedule and track utilization</p>
          </div>
          
          {/* Date Navigation */}
          <div className="flex flex-wrap items-center gap-2 md:gap-3">
            <div className="flex items-center space-x-1 md:space-x-3">
              <button
                onClick={() => changeDate(-1)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <ChevronLeft className="w-4 h-4 md:w-5 md:h-5" />
              </button>
              
              <DatePicker selectedDate={selectedDate} onDateChange={setSelectedDate} />
              
              <button
                onClick={() => changeDate(1)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <ChevronRight className="w-4 h-4 md:w-5 md:h-5" />
              </button>
              
              <button
                onClick={refreshData}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                disabled={isLoading}
              >
                <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
              </button>
            </div>
            
            <button
              onClick={handleSeedDatabase}
              disabled={isSeeding}
              className="flex items-center space-x-2 px-3 md:px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
            >
              <Database className={`w-4 h-4 ${isSeeding ? 'animate-pulse' : ''}`} />
              <span className="text-sm">{isSeeding ? 'Seeding...' : 'Add Test Data'}</span>
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

      {/* Error Display */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-start space-x-3">
            <AlertCircle className="w-5 h-5 text-red-500 mt-0.5" />
            <div className="flex-1">
              <h3 className="text-red-800 font-medium">Database Error</h3>
              <p className="text-red-700 text-sm mt-1">{error}</p>
              <p className="text-red-600 text-sm mt-1">Showing demo data as fallback. Click "Add Test Data" to seed the database.</p>
              <button 
                onClick={refreshData}
                className="mt-3 text-red-600 hover:text-red-800 text-sm underline"
              >
                Try Again
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Workers Timeline - Vertical Stack */}
      <div className="space-y-4 md:space-y-6">
        {workersData.map((worker) => (
          <WorkerRow key={worker.id} worker={worker} />
        ))}
      </div>

      {/* Empty State */}
      {workersData.length === 0 && !isLoading && (
        <div className="text-center py-12 bg-white rounded-lg border border-gray-200">
          <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Users className="w-10 h-10 text-blue-600" />
          </div>
          <h3 className="text-xl font-medium text-gray-900 mb-2">No workers found</h3>
          <p className="text-gray-600 mb-4">Add some test data to see the timeline in action.</p>
          <button
            onClick={handleSeedDatabase}
            disabled={isSeeding}
            className="inline-flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            <Database className="w-4 h-4" />
            <span>Add Test Data</span>
          </button>
        </div>
      )}
    </div>
  )
} 