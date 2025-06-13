'use client'

import React, { useState, useMemo, useCallback } from 'react'
import { parseISO, isSameDay, startOfWeek, addDays } from 'date-fns'
import { TooltipProvider } from '@/components/ui/tooltip'

// Import the improved timeline system with dynamic time ranges
import ImprovedTimelineScheduler from '@/components/timeline/TimelineSchedulerGrid'

export interface Job {
  id: string
  title: string
  description?: string
  client_name: string
  worker_id?: string
  worker_name?: string
  scheduled_at: string
  duration_hours: number
  status: 'scheduled' | 'in_progress' | 'completed' | 'cancelled' | 'overdue'
  priority: 'low' | 'medium' | 'high' | 'urgent'
  location?: string
  color?: string
  duration?: number // duration in minutes
  address?: string
}

export interface Worker {
  id: string
  name: string
  avatar?: string
  role: string
  skills?: string[]
  status: 'available' | 'busy' | 'offline'
  working_hours?: {
    start: string // Format: "HH:MM"
    end: string // Format: "HH:MM"
    day?: number // 0-6, Sunday-Saturday
  }[]
  utilization?: number // Worker's utilization percentage
}

interface TimelineSchedulerProps {
  jobs: Job[]
  workers: Worker[]
  selectedDate: Date
  viewMode: 'day' | 'week'
  onDateChange: (date: Date) => void
  onViewModeChange: (mode: 'day' | 'week') => void
  onJobUpdate: (jobId: string, updates: Partial<Job>) => void
  onJobMove: (jobId: string, newWorkerId: string | null, newTime: Date) => void
}

// Transform job data to match grid system expectations
const transformJobsForGrid = (jobs: Job[]) => {
  return jobs.map(job => ({
    ...job,
    // Ensure duration is in minutes
    duration: job.duration || (job.duration_hours ? job.duration_hours * 60 : 60),
    // Ensure worker_id is always a string
    worker_id: job.worker_id || 'unassigned',
    // Map status to grid system expectations
    status: job.status === 'overdue' ? 'cancelled' as const :
            job.status as 'scheduled' | 'in_progress' | 'completed' | 'cancelled',
    // Map priority to grid system expectations
    priority: job.priority === 'urgent' ? 'high' as const : 
              job.priority as 'low' | 'medium' | 'high'
  }))
}

// Transform worker data to match grid system expectations
const transformWorkersForGrid = (workers: Worker[]) => {
  return workers.map(worker => ({
    ...worker,
    // Add required email field
    email: `${worker.name.toLowerCase().replace(/\s+/g, '.')}@company.com`,
    // Ensure working_hours is in the expected format
    working_hours: worker.working_hours?.map(hours => ({
      start: hours.start,
      end: hours.end,
      day: hours.day
    }))
  }))
}

export const TimelineSchedulerGrid = React.memo(function TimelineSchedulerGrid({ 
  jobs, 
  workers, 
  selectedDate,
  viewMode,
  onDateChange,
  onViewModeChange,
  onJobUpdate, 
  onJobMove 
}: TimelineSchedulerProps) {
  
  // Transform data for the grid system
  const gridJobs = useMemo(() => transformJobsForGrid(jobs), [jobs])
  const gridWorkers = useMemo(() => transformWorkersForGrid(workers), [workers])

  // Handle job updates from the grid system
  const handleJobUpdate = useCallback((job: any) => {
    if (onJobUpdate) {
      onJobUpdate(job.id, job)
    }
  }, [onJobUpdate])

  // Handle job moves from the grid system
  const handleJobMove = useCallback((jobId: string, newPosition: any) => {
    // Convert grid position back to time
    const newHour = newPosition.hour
    const newMinute = newPosition.minute
    
    // Create new date with the new time
    const newDate = new Date(selectedDate)
    newDate.setHours(newHour, newMinute, 0, 0)
    
    // Find the job to get its worker_id
    const job = jobs.find(j => j.id === jobId)
    const workerId = job?.worker_id || null
    
    if (onJobMove) {
      onJobMove(jobId, workerId, newDate)
    }
  }, [jobs, selectedDate, onJobMove])

  return (
    <TooltipProvider>
      <div className="h-full bg-gray-50">
        <ImprovedTimelineScheduler
          jobs={gridJobs}
          workers={gridWorkers}
          selectedDate={selectedDate}
          onJobClick={handleJobUpdate}
          onTimeSlotClick={(workerId, hour, minute) => {
            // Handle time slot clicks for creating new jobs
            console.log('Time slot clicked:', workerId, hour, minute)
          }}
          className="h-full"
        />
      </div>
    </TooltipProvider>
  )
}) 