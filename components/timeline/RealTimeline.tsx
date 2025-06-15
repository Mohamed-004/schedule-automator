'use client'

import { useState } from 'react'
import { Calendar, ChevronLeft, ChevronRight, RefreshCw, Users, Clock, CheckCircle, AlertCircle, Database } from 'lucide-react'
import { useRealTimelineData } from '@/hooks/useRealTimelineData'
import { seedDatabaseWithTestData } from '@/lib/seed-data'

interface WorkerCardProps {
  worker: {
    id: string
    name: string
    status: 'busy' | 'scheduled' | 'available' | 'unavailable'
    workingHours: string
    utilization: number
    availabilityType: 'regular' | 'exception' | 'unavailable' | 'none'
    availabilityReason?: string
    jobs: Array<{
      id: string
      title: string
      client: string
      startTime: string
      duration: string
      status: 'scheduled' | 'in_progress' | 'completed'
      color: string
    }>
  }
}

const WorkerCard = ({ worker }: WorkerCardProps) => {
  const [isExpanded, setIsExpanded] = useState(false)
  
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'busy': return 'bg-red-100 text-red-800 border-red-200'
      case 'scheduled': return 'bg-blue-100 text-blue-800 border-blue-200'
      case 'available': return 'bg-green-100 text-green-800 border-green-200'
      case 'unavailable': return 'bg-orange-100 text-orange-800 border-orange-200'
      default: return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  const getUtilizationColor = (utilization: number) => {
    if (utilization >= 70) return 'bg-green-500'
    if (utilization >= 30) return 'bg-yellow-500'
    return 'bg-red-500'
  }

  const getAvailabilityTypeIcon = (type: string) => {
    switch (type) {
      case 'exception': return '⚡'
      case 'unavailable': return '🚫'
      case 'none': return '❓'
      default: return '📅'
    }
  }

  const getAvailabilityTypeColor = (type: string) => {
    switch (type) {
      case 'exception': return 'text-blue-600'
      case 'unavailable': return 'text-red-600'
      case 'none': return 'text-gray-600'
      default: return 'text-green-600'
    }
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
      <div className="p-4">
        {/* Worker Header */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-full bg-blue-500 flex items-center justify-center text-white font-medium">
              {worker.name.split(' ').map(n => n[0]).join('')}
            </div>
            <div>
              <h3 className="font-semibold text-gray-900">{worker.name}</h3>
              <div className="flex items-center space-x-1 text-sm text-gray-500">
                <span className={getAvailabilityTypeColor(worker.availabilityType)}>
                  {getAvailabilityTypeIcon(worker.availabilityType)}
                </span>
                <p>{worker.workingHours}</p>
              </div>
              {worker.availabilityReason && (
                <p className="text-xs text-gray-400 italic">{worker.availabilityReason}</p>
              )}
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            <span className={`px-2 py-1 rounded-full text-xs font-medium border ${getStatusColor(worker.status)}`}>
              {worker.status}
            </span>
            {worker.status !== 'unavailable' && (
              <div className="flex items-center space-x-1">
                <div className={`w-2 h-2 rounded-full ${getUtilizationColor(worker.utilization)}`}></div>
                <span className="text-xs text-gray-600">{worker.utilization}%</span>
              </div>
            )}
          </div>
        </div>

        {/* Job Count and Toggle */}
        <div className="flex items-center justify-between mb-3">
          {worker.status === 'unavailable' ? (
            <span className="text-sm text-gray-500">Not available today</span>
          ) : (
            <span className="text-sm text-gray-600">{worker.jobs.length} jobs today</span>
          )}
          {worker.jobs.length > 0 && (
            <button 
              onClick={() => setIsExpanded(!isExpanded)}
              className="text-sm text-blue-600 hover:text-blue-800 flex items-center"
            >
              {isExpanded ? 'Hide' : 'Show'} timeline
              <ChevronRight className={`w-4 h-4 ml-1 transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
            </button>
          )}
        </div>

        {/* Mobile Timeline - Horizontally Scrollable */}
        {isExpanded && worker.jobs.length > 0 && (
          <div className="border-t pt-3">
            <div className="overflow-x-auto">
              <div className="flex space-x-2 min-w-max pb-2">
                {/* Timeline hours (8 AM to 6 PM) */}
                {Array.from({ length: 11 }, (_, i) => {
                  const hour = i + 8
                  const timeLabel = hour <= 12 ? `${hour}:00 AM` : `${hour - 12}:00 PM`
                  
                  return (
                    <div key={hour} className="flex-shrink-0 w-16 text-center">
                      <div className="text-xs text-gray-500 mb-2">{timeLabel}</div>
                      <div className="h-12 bg-gray-50 border border-gray-200 rounded relative">
                        {/* Jobs that fall in this hour */}
                        {worker.jobs
                          .filter(job => {
                            const jobHour = parseInt(job.startTime.split(':')[0])
                            const jobPeriod = job.startTime.includes('PM') ? 'PM' : 'AM'
                            let jobHour24 = jobHour
                            if (jobPeriod === 'PM' && jobHour !== 12) jobHour24 += 12
                            if (jobPeriod === 'AM' && jobHour === 12) jobHour24 = 0
                            return jobHour24 === hour
                          })
                          .map((job, jobIndex) => (
                            <div
                              key={job.id}
                              className={`absolute inset-x-0 top-0 h-full rounded text-xs p-1 ${job.color} flex items-center justify-center`}
                              style={{ zIndex: jobIndex + 1 }}
                            >
                              <div className="text-center">
                                <div className="font-medium truncate">{job.title}</div>
                                <div className="text-xs opacity-75">{job.duration}</div>
                              </div>
                            </div>
                          ))}
                      </div>
                    </div>
                  )
                })}
              </div>

              {/* Status legend */}
              <div className="flex flex-wrap gap-3 mt-3 text-xs">
                <div className="flex items-center">
                  <div className="w-3 h-3 bg-green-100 border border-green-300 rounded mr-1"></div>
                  <span>Available</span>
                </div>
                <div className="flex items-center">
                  <div className="w-3 h-3 bg-yellow-100 border border-yellow-300 rounded mr-1"></div>
                  <span>Scheduled</span>
                </div>
                <div className="flex items-center">
                  <div className="w-3 h-3 bg-blue-100 border border-blue-300 rounded mr-1"></div>
                  <span>In Progress</span>
                </div>
                <div className="flex items-center">
                  <div className="w-3 h-3 bg-green-100 border border-green-300 rounded mr-1"></div>
                  <span>Completed</span>
                </div>
                <div className="flex items-center">
                  <div className="w-3 h-3 bg-gray-100 border border-gray-300 rounded mr-1"></div>
                  <span>Unavailable</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* No availability message for workers with no schedule */}
        {worker.availabilityType === 'none' && (
          <div className="border-t pt-3">
            <div className="bg-orange-50 border border-orange-200 rounded-lg p-3">
              <div className="flex items-center space-x-2">
                <AlertCircle className="w-4 h-4 text-orange-600" />
                <span className="text-sm text-orange-800">
                  Not available today
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Unavailable message */}
        {worker.availabilityType === 'unavailable' && (
          <div className="border-t pt-3">
            <div className="bg-orange-50 border border-orange-200 rounded-lg p-3">
              <div className="flex items-center space-x-2">
                <Clock className="w-4 h-4 text-orange-600" />
                <span className="text-sm text-orange-800">
                  Not available today
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Special hours indicator */}
        {worker.availabilityType === 'exception' && worker.jobs.length === 0 && (
          <div className="border-t pt-3">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <div className="flex items-center space-x-2">
                <CheckCircle className="w-4 h-4 text-blue-600" />
                <span className="text-sm text-blue-800">
                  Working special hours today: {worker.workingHours.split(' (')[0]}
                </span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

/**
 * Real timeline component that fetches data from Supabase database
 * Features horizontal scrolling for mobile and responsive design
 */
export default function RealTimeline() {
  const [selectedDate, setSelectedDate] = useState(new Date())
  const [showCalendar, setShowCalendar] = useState(false)
  const [isSeeding, setIsSeeding] = useState(false)
  
  const { workersData, stats, isLoading, error, refreshData } = useRealTimelineData(selectedDate)

  const handleSeedDatabase = async () => {
    setIsSeeding(true)
    try {
      const result = await seedDatabaseWithTestData()
      if (result.success) {
        // Refresh data after seeding
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

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    })
  }

  const changeDate = (days: number) => {
    const newDate = new Date(selectedDate)
    newDate.setDate(newDate.getDate() + days)
    setSelectedDate(newDate)
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="flex items-center space-x-2">
          <RefreshCw className="w-5 h-5 animate-spin" />
          <span>Loading timeline data...</span>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Team Schedule</h1>
            <p className="text-gray-600">Manage your team's daily schedule and track utilization</p>
          </div>
          
          {/* Date Navigation */}
          <div className="flex items-center space-x-2">
            <button
              onClick={() => changeDate(-1)}
              className="p-2 hover:bg-gray-100 rounded-lg"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            
            <button
              onClick={() => setShowCalendar(!showCalendar)}
              className="flex items-center space-x-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              <Calendar className="w-4 h-4" />
              <span className="font-medium">{formatDate(selectedDate)}</span>
            </button>
            
            <button
              onClick={() => changeDate(1)}
              className="p-2 hover:bg-gray-100 rounded-lg"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
            
            <button
              onClick={refreshData}
              className="p-2 hover:bg-gray-100 rounded-lg"
              disabled={isLoading}
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            </button>
            
            <button
              onClick={handleSeedDatabase}
              disabled={isSeeding}
              className="flex items-center space-x-2 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              <Database className={`w-4 h-4 ${isSeeding ? 'animate-pulse' : ''}`} />
              <span className="text-sm">{isSeeding ? 'Seeding...' : 'Add Test Data'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Stats Dashboard */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <div className="flex items-center space-x-2 mb-1">
            <Clock className="w-4 h-4 text-blue-500" />
            <span className="text-sm font-medium text-gray-600">Total Jobs</span>
          </div>
          <div className="text-2xl font-bold text-gray-900">{stats.totalJobs}</div>
        </div>

        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <div className="flex items-center space-x-2 mb-1">
            <CheckCircle className="w-4 h-4 text-green-500" />
            <span className="text-sm font-medium text-gray-600">Completed</span>
          </div>
          <div className="text-2xl font-bold text-gray-900">{stats.completedJobs}</div>
        </div>

        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <div className="flex items-center space-x-2 mb-1">
            <AlertCircle className="w-4 h-4 text-yellow-500" />
            <span className="text-sm font-medium text-gray-600">Remaining</span>
          </div>
          <div className="text-2xl font-bold text-gray-900">{stats.remainingJobs}</div>
        </div>

        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <div className="flex items-center space-x-2 mb-1">
            <Users className="w-4 h-4 text-purple-500" />
            <span className="text-sm font-medium text-gray-600">Workers</span>
          </div>
          <div className="text-2xl font-bold text-gray-900">{stats.totalWorkers}</div>
        </div>

        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <div className="flex items-center space-x-2 mb-1">
            <div className="w-4 h-4 bg-blue-500 rounded"></div>
            <span className="text-sm font-medium text-gray-600">Avg Util</span>
          </div>
          <div className="text-2xl font-bold text-gray-900">{Math.round(stats.averageUtilization)}%</div>
        </div>

        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <div className="flex items-center space-x-2 mb-1">
            <div className="w-4 h-4 bg-green-500 rounded"></div>
            <span className="text-sm font-medium text-gray-600">Capacity</span>
          </div>
          <div className="text-lg font-bold text-gray-900">{stats.totalScheduledHours}h/{stats.totalAvailableHours}h</div>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="bg-white p-4 rounded-lg border border-gray-200">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-gray-700">Daily Progress</span>
          <span className="text-sm text-gray-500">
            {stats.completedJobs > 0 ? Math.round((stats.completedJobs / stats.totalJobs) * 100) : 0}% Complete
          </span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div 
            className="bg-blue-600 h-2 rounded-full transition-all duration-300" 
            style={{ 
              width: `${stats.totalJobs > 0 ? (stats.completedJobs / stats.totalJobs) * 100 : 0}%` 
            }}
          ></div>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center space-x-2">
            <AlertCircle className="w-5 h-5 text-red-500" />
            <span className="text-red-700">Database Error: {error}</span>
            <button 
              onClick={refreshData}
              className="ml-auto text-red-600 hover:text-red-800 text-sm underline"
            >
              Try Again
            </button>
          </div>
          <p className="text-sm text-red-600 mt-1">Showing demo data as fallback</p>
        </div>
      )}

      {/* No schedule data message */}
      {workersData.length === 0 && (
        <div className="text-center py-12">
          <div className="bg-orange-50 border border-orange-200 rounded-lg p-6 max-w-md mx-auto">
            <div className="flex items-center justify-center space-x-2 mb-2">
              <AlertCircle className="w-6 h-6 text-orange-600" />
              <span className="text-lg font-medium text-orange-800">
                Not working today
              </span>
            </div>
            <p className="text-orange-700">
              No workers or availability information found
            </p>
            <div className="mt-4 flex items-center justify-center space-x-2">
              <Clock className="w-4 h-4 text-orange-600" />
              <span className="text-sm text-orange-800">
                Working Hours: Not available
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Worker Cards Grid - Mobile Horizontal Scroll Support */}
      <div className="block md:hidden">
        <div className="flex gap-4 overflow-x-auto mobile-scroll pb-4">
          {workersData.map((worker) => (
            <div key={worker.id} className="flex-shrink-0 w-80">
              <WorkerCard worker={worker} />
            </div>
          ))}
        </div>
      </div>
      
      {/* Worker Cards Grid - Desktop */}
      <div className="hidden md:grid grid-cols-2 xl:grid-cols-3 gap-6">
        {workersData.map((worker) => (
          <WorkerCard key={worker.id} worker={worker} />
        ))}
      </div>
    </div>
  )
} 