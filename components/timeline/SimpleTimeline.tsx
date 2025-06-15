'use client'

import React, { useState } from 'react'
import { cn } from '@/lib/utils'
import { TimelineHeader } from './TimelineHeader'
import { DatePicker } from './DatePicker'
import { UtilizationBadge } from './UtilizationBadge'

interface SimpleTimelineProps {
  className?: string
}

/**
 * Simplified timeline component that works without complex type dependencies
 * Focuses on core functionality and proper responsive design
 */
export function SimpleTimeline({ className }: SimpleTimelineProps) {
  const [selectedDate, setSelectedDate] = useState(new Date())

  // Demo data that matches the requirements
  const workersData = [
    {
      id: '1',
      name: 'Ameer Gailan',
      status: 'busy',
      workingHours: '06:00 - 20:00',
      utilization: 85,
      jobs: [
        {
          id: '1',
          title: 'Office Cleaning',
          client: 'Tech Corp',
          startTime: '09:00',
          duration: '2h',
          status: 'scheduled',
          color: 'bg-yellow-100 border-yellow-300'
        },
        {
          id: '2',
          title: 'Window Cleaning',
          client: 'Retail Store',
          startTime: '14:00',
          duration: '1h 30m',
          status: 'in_progress',
          color: 'bg-blue-100 border-blue-300'
        }
      ]
    },
    {
      id: '2',
      name: 'Test Worker',
      status: 'scheduled',
      workingHours: '08:00 - 17:00',
      utilization: 33,
      jobs: [
        {
          id: '3',
          title: 'Maintenance Check',
          client: 'Property Co',
          startTime: '10:30',
          duration: '1h',
          status: 'completed',
          color: 'bg-green-100 border-green-300'
        }
      ]
    },
    {
      id: '3',
      name: 'Part Time Worker',
      status: 'available',
      workingHours: '12:00 - 18:00',
      utilization: 0,
      jobs: []
    }
  ]

  // Calculate stats
  const stats = {
    totalJobs: workersData.reduce((sum, worker) => sum + worker.jobs.length, 0),
    completedJobs: workersData.reduce((sum, worker) => 
      sum + worker.jobs.filter(job => job.status === 'completed').length, 0),
    remainingJobs: workersData.reduce((sum, worker) => 
      sum + worker.jobs.filter(job => job.status !== 'completed').length, 0),
    totalWorkers: workersData.length,
    averageUtilization: workersData.reduce((sum, worker) => sum + worker.utilization, 0) / workersData.length,
    totalScheduledHours: 4.5,
    totalAvailableHours: 18
  }

  // Status color mapping
  const getStatusDot = (status: string) => {
    switch (status) {
      case 'busy': return 'bg-yellow-500'
      case 'scheduled': return 'bg-blue-500'
      case 'available': return 'bg-green-500'
      default: return 'bg-gray-500'
    }
  }

  // Generate initials
  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase()
  }

  return (
    <div className={cn('flex flex-col h-screen bg-gray-50 overflow-hidden', className)}>
      {/* Enhanced Header with Calendar and Stats */}
      <div className="flex-shrink-0 sticky top-0 z-20 bg-white border-b border-gray-200 shadow-sm">
        {/* Main header with date picker */}
        <div className="px-4 py-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center gap-4">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Team Schedule</h1>
                <p className="text-sm text-gray-600 mt-1">
                  Manage your team's daily schedule and track utilization
                </p>
              </div>
            </div>

            {/* Date Picker */}
            <DatePicker
              selectedDate={selectedDate}
              onDateChange={setSelectedDate}
              className="flex-shrink-0"
            />
          </div>
        </div>

        {/* Stats Dashboard */}
        <div className="px-4 py-3 bg-gray-50 border-t border-gray-100">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            {/* Total Jobs */}
            <div className="bg-white rounded-lg p-3 border border-gray-200">
              <div className="text-2xl font-bold text-gray-900">{stats.totalJobs}</div>
              <div className="text-xs text-gray-500">Total Jobs</div>
            </div>

            {/* Completed Jobs */}
            <div className="bg-white rounded-lg p-3 border border-gray-200">
              <div className="text-2xl font-bold text-gray-900">{stats.completedJobs}</div>
              <div className="text-xs text-gray-500">Completed</div>
            </div>

            {/* Remaining Jobs */}
            <div className="bg-white rounded-lg p-3 border border-gray-200">
              <div className="text-2xl font-bold text-gray-900">{stats.remainingJobs}</div>
              <div className="text-xs text-gray-500">Remaining</div>
            </div>

            {/* Workers */}
            <div className="bg-white rounded-lg p-3 border border-gray-200">
              <div className="text-2xl font-bold text-gray-900">{stats.totalWorkers}</div>
              <div className="text-xs text-gray-500">Workers</div>
            </div>

            {/* Average Utilization */}
            <div className="bg-white rounded-lg p-3 border border-gray-200">
              <div className="text-2xl font-bold text-gray-900">{Math.round(stats.averageUtilization)}%</div>
              <div className="text-xs text-gray-500">Avg Util</div>
            </div>

            {/* Capacity */}
            <div className="bg-white rounded-lg p-3 border border-gray-200">
              <div className="text-sm font-bold text-gray-900">{stats.totalScheduledHours}h / {stats.totalAvailableHours}h</div>
              <div className="text-xs text-gray-500">Scheduled / Available</div>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="mt-3">
            <div className="flex items-center justify-between text-xs text-gray-600 mb-1">
              <span>Daily Progress</span>
              <span>{stats.totalJobs > 0 ? Math.round((stats.completedJobs / stats.totalJobs) * 100) : 0}% Complete</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${stats.totalJobs > 0 ? (stats.completedJobs / stats.totalJobs) * 100 : 0}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Timeline Content */}
      <div className="flex-1 overflow-auto">
        <div className="p-4 space-y-4">
          {workersData.map((worker) => (
            <div key={worker.id} className="bg-white border border-gray-200 rounded-lg overflow-hidden">
              {/* Worker Information Header */}
              <div className="p-4 border-b border-gray-100">
                <div className="flex items-start gap-3">
                  {/* Avatar */}
                  <div className="w-12 h-12 rounded-full bg-blue-500 text-white flex items-center justify-center font-medium text-sm flex-shrink-0">
                    {getInitials(worker.name)}
                  </div>

                  {/* Worker Details */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <h3 className="text-lg font-semibold text-gray-900 truncate">
                          {worker.name}
                        </h3>
                        <div className="flex items-center gap-2 mt-1 text-sm text-gray-600">
                          <div className={cn('w-2 h-2 rounded-full', getStatusDot(worker.status))} />
                          <span className="capitalize">{worker.status}</span>
                          <span className="ml-2">{worker.workingHours}</span>
                        </div>
                      </div>

                      {/* Utilization Badge */}
                      <UtilizationBadge 
                        percentage={worker.utilization}
                        size="md"
                        showLabel={true}
                        className="flex-shrink-0"
                      />
                    </div>

                    {/* Job Count */}
                    <div className="flex items-center justify-between mt-2">
                      <span className="text-sm text-gray-500">
                        {worker.jobs.length} jobs today
                      </span>
                      <span className="text-xs text-gray-500">
                        {worker.utilization < 100 ? `${100 - worker.utilization}% available` : 'Fully booked'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Timeline Section */}
              <div className="p-4">
                <div className="relative h-24 bg-gray-50 rounded-lg overflow-x-auto">
                  {/* Availability background */}
                  <div className="absolute inset-2 bg-green-100 rounded opacity-30" />
                  
                  {/* Job blocks */}
                  <div className="relative h-full">
                    {worker.jobs.map((job, index) => (
                      <div
                        key={job.id}
                        className={cn(
                          'absolute top-2 h-16 rounded-lg border-2 cursor-pointer p-2',
                          'flex flex-col justify-between overflow-hidden shadow-sm',
                          job.color
                        )}
                        style={{
                          left: `${20 + index * 140}px`,
                          width: '120px'
                        }}
                        title={`${job.title} - ${job.client} (${job.startTime} - ${job.duration})`}
                      >
                        <div className="flex-1">
                          <h4 className="font-semibold text-sm truncate">
                            {job.title}
                          </h4>
                          <p className="text-xs opacity-75 truncate">
                            {job.client}
                          </p>
                        </div>
                        <div className="text-xs">
                          <span className="font-medium">{job.startTime}</span>
                          <span className="ml-1 opacity-60">• {job.duration}</span>
                        </div>
                      </div>
                    ))}

                    {/* Empty state */}
                    {worker.jobs.length === 0 && (
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className="text-center text-gray-500">
                          <div className="text-sm">No jobs scheduled</div>
                          <div className="text-xs mt-1 opacity-75">Fully available</div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Timeline legend */}
                <div className="flex items-center gap-4 mt-3 text-xs text-gray-500">
                  <div className="flex items-center gap-1">
                    <div className="w-3 h-3 bg-green-100 border border-green-200 rounded" />
                    <span>Available</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <div className="w-3 h-3 bg-yellow-100 border border-yellow-300 rounded" />
                    <span>Scheduled</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <div className="w-3 h-3 bg-blue-100 border border-blue-300 rounded" />
                    <span>In Progress</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <div className="w-3 h-3 bg-green-100 border border-green-300 rounded" />
                    <span>Completed</span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
} 