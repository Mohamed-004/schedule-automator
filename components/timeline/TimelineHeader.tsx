'use client'

import React from 'react'
import { TrendingUp, Clock, Users, CheckCircle } from 'lucide-react'
import { cn } from '@/lib/utils'
import { DatePicker } from './DatePicker'

interface TimelineStats {
  totalJobs: number
  completedJobs: number
  remainingJobs: number
  totalWorkers: number
  averageUtilization: number
  totalScheduledHours: number
  totalAvailableHours: number
}

interface TimelineHeaderProps {
  selectedDate: Date
  onDateChange: (date: Date) => void
  stats: TimelineStats
  className?: string
}

/**
 * Enhanced TimelineHeader with date picker and comprehensive stats
 * Shows calendar selector and important timeline metrics
 */
export function TimelineHeader({
  selectedDate,
  onDateChange,
  stats,
  className
}: TimelineHeaderProps) {
  const {
    totalJobs,
    completedJobs,
    remainingJobs,
    totalWorkers,
    averageUtilization,
    totalScheduledHours,
    totalAvailableHours
  } = stats

  // Get utilization color
  const getUtilizationColor = (percentage: number) => {
    if (percentage >= 70) return 'text-green-600 bg-green-50'
    if (percentage >= 30) return 'text-yellow-600 bg-yellow-50'
    return 'text-red-600 bg-red-50'
  }

  // Format hours display
  const formatHours = (hours: number) => {
    if (hours < 1) return `${Math.round(hours * 60)}m`
    return hours % 1 === 0 ? `${hours}h` : `${Math.floor(hours)}h ${Math.round((hours % 1) * 60)}m`
  }

  return (
    <div className={cn(
      'sticky top-0 z-20 bg-white border-b border-gray-200 shadow-sm',
      className
    )}>
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
            onDateChange={onDateChange}
            className="flex-shrink-0"
          />
        </div>
      </div>

      {/* Stats Dashboard */}
      <div className="px-4 py-3 bg-gray-50 border-t border-gray-100">
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-4">
          {/* Total Jobs */}
          <div className="bg-white rounded-lg p-3 border border-gray-200">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                <Clock className="h-4 w-4 text-blue-600" />
              </div>
              <div>
                <div className="text-xl font-bold text-gray-900">{totalJobs}</div>
                <div className="text-xs text-gray-500">Total Jobs</div>
              </div>
            </div>
          </div>

          {/* Completed Jobs */}
          <div className="bg-white rounded-lg p-3 border border-gray-200">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                <CheckCircle className="h-4 w-4 text-green-600" />
              </div>
              <div>
                <div className="text-xl font-bold text-gray-900">{completedJobs}</div>
                <div className="text-xs text-gray-500">Completed</div>
              </div>
            </div>
          </div>

          {/* Remaining Jobs */}
          <div className="bg-white rounded-lg p-3 border border-gray-200">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-orange-100 rounded-lg flex items-center justify-center">
                <Clock className="h-4 w-4 text-orange-600" />
              </div>
              <div>
                <div className="text-xl font-bold text-gray-900">{remainingJobs}</div>
                <div className="text-xs text-gray-500">Remaining</div>
              </div>
            </div>
          </div>

          {/* Active Workers */}
          <div className="bg-white rounded-lg p-3 border border-gray-200">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center">
                <Users className="h-4 w-4 text-purple-600" />
              </div>
              <div>
                <div className="text-xl font-bold text-gray-900">{totalWorkers}</div>
                <div className="text-xs text-gray-500">Workers</div>
              </div>
            </div>
          </div>

          {/* Average Utilization */}
          <div className="bg-white rounded-lg p-3 border border-gray-200">
            <div className="flex items-center gap-2">
              <div className={cn(
                'w-8 h-8 rounded-lg flex items-center justify-center',
                getUtilizationColor(averageUtilization)
              )}>
                <TrendingUp className="h-4 w-4" />
              </div>
              <div>
                <div className="text-xl font-bold text-gray-900">
                  {Math.round(averageUtilization)}%
                </div>
                <div className="text-xs text-gray-500">Avg Util</div>
              </div>
            </div>
          </div>

          {/* Capacity Overview */}
          <div className="bg-white rounded-lg p-3 border border-gray-200">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center">
                <Clock className="h-4 w-4 text-gray-600" />
              </div>
              <div>
                <div className="text-sm font-bold text-gray-900">
                  {formatHours(totalScheduledHours)} / {formatHours(totalAvailableHours)}
                </div>
                <div className="text-xs text-gray-500">Scheduled / Available</div>
              </div>
            </div>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="mt-3">
          <div className="flex items-center justify-between text-xs text-gray-600 mb-1">
            <span>Daily Progress</span>
            <span>{totalJobs > 0 ? Math.round((completedJobs / totalJobs) * 100) : 0}% Complete</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${totalJobs > 0 ? (completedJobs / totalJobs) * 100 : 0}%` }}
            />
          </div>
        </div>
      </div>
    </div>
  )
} 