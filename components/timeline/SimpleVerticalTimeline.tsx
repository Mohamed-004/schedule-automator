'use client'

import { useState } from 'react'
import { Calendar, ChevronLeft, ChevronRight, RefreshCw, Users, Clock, CheckCircle, AlertCircle, Database } from 'lucide-react'
import { useRealTimelineData } from '@/hooks/useRealTimelineData'
import { seedDatabaseWithTestData } from '@/lib/seed-data'

interface WorkerRowProps {
  worker: {
    id: string
    name: string
    status: 'busy' | 'scheduled' | 'available'
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
  }
}

const WorkerRow = ({ worker }: WorkerRowProps) => {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'busy': return 'bg-red-100 text-red-800 border-red-200'
      case 'scheduled': return 'bg-blue-100 text-blue-800 border-blue-200'
      case 'available': return 'bg-green-100 text-green-800 border-green-200'
      default: return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  const getUtilizationColor = (utilization: number) => {
    if (utilization >= 70) return 'bg-green-500'
    if (utilization >= 30) return 'bg-yellow-500'
    return 'bg-red-500'
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm hover:shadow-md transition-shadow">
      {/* Worker Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-4">
          <div className="w-12 h-12 rounded-full bg-blue-500 flex items-center justify-center text-white font-semibold text-lg">
            {worker.name.split(' ').map(n => n[0]).join('')}
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900">{worker.name}</h3>
            <p className="text-sm text-gray-600">{worker.workingHours}</p>
            <p className="text-sm text-gray-500">{worker.jobs.length} jobs today</p>
          </div>
        </div>
        
        <div className="flex items-center space-x-3">
          <span className={`px-3 py-1 rounded-full text-sm font-medium border ${getStatusColor(worker.status)}`}>
            {worker.status}
          </span>
          <div className="flex items-center space-x-2">
            <div className={`w-3 h-3 rounded-full ${getUtilizationColor(worker.utilization)}`}></div>
            <span className="text-sm font-medium text-gray-700">{worker.utilization}% util</span>
          </div>
        </div>
      </div>

      {/* Jobs List */}
      {worker.jobs.length > 0 ? (
        <div className="space-y-3">
          <h4 className="text-sm font-medium text-gray-700 mb-3">Today's Schedule</h4>
          {worker.jobs.map((job) => (
            <div
              key={job.id}
              className={`p-4 rounded-lg border-l-4 ${job.color.replace('border-', 'border-l-')} bg-gray-50`}
            >
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center space-x-3 mb-2">
                    <h5 className="font-medium text-gray-900">{job.title}</h5>
                    <span className={`px-2 py-1 text-xs rounded-full ${
                      job.status === 'completed' ? 'bg-green-100 text-green-800' :
                      job.status === 'in_progress' ? 'bg-blue-100 text-blue-800' :
                      'bg-yellow-100 text-yellow-800'
                    }`}>
                      {job.status.replace('_', ' ')}
                    </span>
                  </div>
                  <div className="flex items-center space-x-4 text-sm text-gray-600">
                    <span className="flex items-center">
                      <Clock className="w-4 h-4 mr-1" />
                      {job.startTime}
                    </span>
                    <span>{job.duration}</span>
                    <span className="flex items-center">
                      <Users className="w-4 h-4 mr-1" />
                      {job.client}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-8 text-gray-500">
          <Users className="w-8 h-8 mx-auto mb-2 opacity-50" />
          <p>No jobs scheduled for today</p>
        </div>
      )}
    </div>
  )
}

/**
 * Simple vertical timeline component that displays workers stacked vertically
 * More informative and clean design without complex time grids
 */
export default function SimpleVerticalTimeline() {
  const [selectedDate, setSelectedDate] = useState(new Date())
  const [isSeeding, setIsSeeding] = useState(false)
  
  const { workersData, stats, isLoading, error, refreshData } = useRealTimelineData(selectedDate)

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
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Team Schedule</h1>
            <p className="text-gray-600">Manage your team's daily schedule and track utilization</p>
          </div>
          
          {/* Date Navigation */}
          <div className="flex items-center space-x-3">
            <button
              onClick={() => changeDate(-1)}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            
            <div className="flex items-center space-x-2 px-4 py-2 border border-gray-300 rounded-lg bg-gray-50">
              <Calendar className="w-4 h-4 text-gray-500" />
              <span className="font-medium text-gray-900">{formatDate(selectedDate)}</span>
            </div>
            
            <button
              onClick={() => changeDate(1)}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
            
            <button
              onClick={refreshData}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              disabled={isLoading}
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            </button>
            
            <button
              onClick={handleSeedDatabase}
              disabled={isSeeding}
              className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
            >
              <Database className={`w-4 h-4 ${isSeeding ? 'animate-pulse' : ''}`} />
              <span className="text-sm">{isSeeding ? 'Seeding...' : 'Add Test Data'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
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
      <div className="space-y-6">
        {workersData.map((worker) => (
          <WorkerRow key={worker.id} worker={worker} />
        ))}
      </div>

      {/* Empty State */}
      {workersData.length === 0 && !isLoading && (
        <div className="text-center py-12 bg-white rounded-lg border border-gray-200">
          <Users className="w-16 h-16 text-gray-400 mx-auto mb-4" />
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