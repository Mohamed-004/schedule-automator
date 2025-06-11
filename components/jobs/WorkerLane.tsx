'use client'

import React, { useMemo } from 'react'
import { format, parseISO, differenceInMinutes, addHours, startOfDay } from 'date-fns'
import { motion } from 'framer-motion'
import { useDroppable } from '@dnd-kit/core'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { JobCard } from './JobCard'
import type { Job, Worker } from './TimelineScheduler'

interface WorkerLaneProps {
  worker: Worker & {
    utilization: number
    totalHours: number
    jobCount: number
  }
  jobs: Job[]
  timeSlots: Date[]
  hourWidth: number
  height: number
  isEven: boolean
  selectedDate: Date
}

const statusColors = {
  available: 'bg-green-500',
  busy: 'bg-amber-500',
  offline: 'bg-red-500'
}

export function WorkerLane({ 
  worker, 
  jobs, 
  timeSlots, 
  hourWidth, 
  height, 
  isEven, 
  selectedDate 
}: WorkerLaneProps) {
  const { setNodeRef } = useDroppable({
    id: `worker-${worker.id}`,
    data: {
      type: 'worker-lane',
      workerId: worker.id,
    },
  })

  // Calculate job positions
  const jobPositions = useMemo(() => {
    const dayStart = startOfDay(selectedDate)
    const startHour = 6 // 6 AM
    
    return jobs.map(job => {
      const jobStart = parseISO(job.scheduled_at)
      const minutesFromDayStart = differenceInMinutes(jobStart, addHours(dayStart, startHour))
      const left = (minutesFromDayStart / 60) * hourWidth
      const width = job.duration_hours * hourWidth - 4 // 4px gap
      
      return {
        job,
        left: Math.max(0, left),
        width: Math.max(hourWidth * 0.5, width), // Minimum width
      }
    })
  }, [jobs, selectedDate, hourWidth])

  // Check for overlapping jobs
  const hasConflicts = useMemo(() => {
    for (let i = 0; i < jobPositions.length; i++) {
      for (let j = i + 1; j < jobPositions.length; j++) {
        const job1 = jobPositions[i]
        const job2 = jobPositions[j]
        
        if (job1.left < job2.left + job2.width && job2.left < job1.left + job1.width) {
          return true
        }
      }
    }
    return false
  }, [jobPositions])

  // Calculate utilization color
  const getUtilizationColor = (utilization: number) => {
    if (utilization >= 100) return 'bg-red-100 border-red-200'
    if (utilization >= 80) return 'bg-amber-100 border-amber-200'
    if (utilization >= 60) return 'bg-yellow-100 border-yellow-200'
    return 'bg-green-100 border-green-200'
  }

  const timelineWidth = timeSlots.length * hourWidth

  return (
    <motion.div
      ref={setNodeRef}
      className={cn(
        'relative border-b border-gray-200 hover:bg-gray-50/50 transition-colors group',
        isEven && 'bg-gray-50/30',
        hasConflicts && 'border-l-4 border-l-red-400'
      )}
      style={{ height }}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      {/* Worker Info Panel */}
      <div className="absolute left-0 top-0 bottom-0 w-64 bg-white border-r border-gray-200 flex items-center px-4 z-10">
        <div className="flex items-center gap-3 w-full">
          {/* Avatar */}
          <div className="relative">
            <Avatar className="h-10 w-10">
              <AvatarImage src={worker.avatar} alt={worker.name} />
              <AvatarFallback>{worker.name.charAt(0)}</AvatarFallback>
            </Avatar>
            {/* Status Indicator */}
            <div className={cn(
              'absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-white',
              statusColors[worker.status]
            )} />
          </div>

          {/* Worker Details */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-sm text-gray-900 truncate">
                {worker.name}
              </h3>
              {hasConflicts && (
                <Badge variant="destructive" className="text-xs">
                  Conflict
                </Badge>
              )}
            </div>
            <p className="text-xs text-gray-500 truncate">{worker.role}</p>
            
            {/* Stats */}
            <div className="flex items-center gap-3 mt-1">
              <span className="text-xs text-gray-600">
                {worker.jobCount} jobs
              </span>
              <span className="text-xs text-gray-600">
                {worker.totalHours}h
              </span>
              <div className="flex items-center gap-1">
                <div className={cn(
                  'w-12 h-1.5 rounded-full border',
                  getUtilizationColor(worker.utilization)
                )}>
                  <div 
                    className="h-full bg-blue-500 rounded-full transition-all"
                    style={{ width: `${Math.min(worker.utilization, 100)}%` }}
                  />
                </div>
                <span className="text-xs text-gray-500">
                  {Math.round(worker.utilization)}%
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Timeline Area */}
      <div 
        className="absolute left-64 top-0 bottom-0 relative"
        style={{ width: timelineWidth }}
      >
        {/* Time Grid Lines */}
        {timeSlots.map((slot, index) => (
          <div
            key={slot.toISOString()}
            className="absolute top-0 bottom-0 border-l border-gray-100"
            style={{ left: index * hourWidth }}
          />
        ))}

        {/* Current Time Line */}
        {/* TODO: Add current time indicator */}

        {/* Jobs */}
        {jobPositions.map(({ job, left, width }, index) => (
          <div
            key={job.id}
            className="absolute top-2 z-20"
            style={{ 
              left: left + 8, // 8px padding from left edge
              width: width - 16, // Account for padding
              top: index * 30 + 8, // Stack overlapping jobs
              maxHeight: height - 16,
            }}
          >
            <JobCard job={job} />
          </div>
        ))}

        {/* Drop Zone Overlay */}
        <div className="absolute inset-0 z-30 opacity-0 group-hover:opacity-100 transition-opacity">
          {timeSlots.map((slot, index) => (
            <div
              key={`drop-${slot.toISOString()}`}
              className="absolute top-0 bottom-0 hover:bg-blue-100/20 border border-transparent hover:border-blue-200 transition-colors"
              style={{ 
                left: index * hourWidth,
                width: hourWidth,
              }}
              data-time={slot.toISOString()}
            />
          ))}
        </div>
      </div>

      {/* Utilization Background */}
      <div 
        className="absolute left-64 top-0 bottom-0 opacity-10 pointer-events-none"
        style={{ 
          width: timelineWidth,
          background: worker.utilization >= 100 
            ? 'linear-gradient(90deg, rgba(239, 68, 68, 0.2) 0%, rgba(239, 68, 68, 0.1) 100%)'
            : worker.utilization >= 80
            ? 'linear-gradient(90deg, rgba(245, 158, 11, 0.2) 0%, rgba(245, 158, 11, 0.1) 100%)'
            : 'transparent'
        }}
      />
    </motion.div>
  )
} 