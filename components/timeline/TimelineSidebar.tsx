'use client'

import React from 'react'
import { Clock, Phone, Mail } from 'lucide-react'
import { cn } from '@/lib/utils'
import { WorkerTimelineData } from '@/lib/types'
import { UtilizationBadge, calculateUtilization, getTotalScheduledTime, getTotalAvailableTime } from './UtilizationBadge'

interface TimelineSidebarProps {
  workersData: WorkerTimelineData[]
  onWorkerSelect: (workerId: string) => void
  className?: string
  style?: React.CSSProperties
}

/**
 * Fixed sidebar showing worker information
 * Stays visible while timeline scrolls horizontally
 */
export function TimelineSidebar({ 
  workersData, 
  onWorkerSelect, 
  className,
  style 
}: TimelineSidebarProps) {
  // Generate initials for avatar
  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(part => part.charAt(0))
      .join('')
      .toUpperCase()
      .slice(0, 2)
  }

  // Status-based styling
  const getStatusDot = (status: string) => {
    switch (status) {
      case 'busy':
        return 'bg-yellow-500'
      case 'scheduled':
        return 'bg-blue-500'
      case 'available':
        return 'bg-green-500'
      default:
        return 'bg-gray-500'
    }
  }

  // Format working hours display
  const formatWorkingHours = (availability: any[]) => {
    if (!availability || availability.length === 0) {
      return 'No schedule'
    }
    const firstSlot = availability[0]
    return `${firstSlot.start} - ${firstSlot.end}`
  }

  return (
    <div 
      className={cn('bg-white border-r border-gray-200 overflow-y-auto', className)}
      style={style}
    >
      {/* Sidebar Header */}
      <div className="p-4 border-b border-gray-100 bg-gray-50">
        <h3 className="font-semibold text-gray-900">Team Members</h3>
        <p className="text-sm text-gray-600 mt-1">{workersData.length} workers</p>
      </div>

      {/* Worker List */}
      <div className="divide-y divide-gray-100">
        {workersData.map((workerData) => {
          const { worker, jobs, status, availability } = workerData
          
          // Calculate utilization
          const scheduledMinutes = getTotalScheduledTime(jobs)
          const availableMinutes = getTotalAvailableTime(availability)
          const utilizationPercentage = calculateUtilization(scheduledMinutes, availableMinutes)

          return (
            <div
              key={worker.id}
              className="p-4 hover:bg-gray-50 cursor-pointer transition-colors"
              onClick={() => onWorkerSelect(worker.id)}
              style={{ height: '120px' }} // Fixed height to match timeline rows
            >
              <div className="flex items-start gap-3 h-full">
                {/* Worker Avatar */}
                <div className="w-10 h-10 rounded-full bg-blue-500 text-white flex items-center justify-center font-medium text-sm flex-shrink-0">
                  {getInitials(worker.name)}
                </div>

                {/* Worker Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="flex-1 min-w-0">
                      <h4 className="font-medium text-gray-900 truncate text-sm">
                        {worker.name}
                      </h4>
                      <div className="flex items-center gap-2 mt-1">
                        <div className={cn('w-2 h-2 rounded-full', getStatusDot(status))} />
                        <span className="text-xs text-gray-600 capitalize">{status}</span>
                      </div>
                    </div>
                    
                    {/* Utilization Badge */}
                    <UtilizationBadge 
                      percentage={utilizationPercentage}
                      size="sm"
                      showLabel={false}
                      className="flex-shrink-0"
                    />
                  </div>

                  {/* Contact Info */}
                  <div className="space-y-1 text-xs text-gray-500">
                    {worker.email && (
                      <div className="flex items-center gap-1">
                        <Mail className="h-3 w-3" />
                        <span className="truncate">{worker.email}</span>
                      </div>
                    )}
                    {worker.phone && (
                      <div className="flex items-center gap-1">
                        <Phone className="h-3 w-3" />
                        <span>{worker.phone}</span>
                      </div>
                    )}
                  </div>

                  {/* Schedule Info */}
                  <div className="flex items-center justify-between mt-2 text-xs">
                    <div className="flex items-center gap-1 text-gray-500">
                      <Clock className="h-3 w-3" />
                      <span>{formatWorkingHours(availability)}</span>
                    </div>
                    <span className="text-gray-600 font-medium">
                      {jobs.length} jobs
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Empty State */}
      {workersData.length === 0 && (
        <div className="p-8 text-center text-gray-500">
          <div className="w-12 h-12 bg-gray-200 rounded-full flex items-center justify-center mb-3 mx-auto">
            <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
            </svg>
          </div>
          <p className="text-sm">No workers available</p>
        </div>
      )}
    </div>
  )
} 