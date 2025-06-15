'use client'

import { useState, useEffect, useMemo } from 'react'
import { useJobs } from './use-jobs'
import { useWorkers } from './use-workers'
import { useWorkerAvailability } from './use-worker-availability'
import { TimelineJob, WorkerTimelineData, TimelineConfig, AvailabilitySlot } from '@/lib/types'
import { createDemoTimelineData, createDemoJobs, demoAvailability } from '@/lib/timeline-demo-data'

/**
 * Hook to manage timeline-specific data processing for the jobs timeline view
 * Processes jobs, workers, and availability data for horizontal timeline display
 */
export function useTimelineJobs(selectedDate: Date = new Date()) {
  const { jobs, loading: jobsLoading, error: jobsError } = useJobs()
  const { workers, loading: workersLoading, error: workersError } = useWorkers()
  const [timelineData, setTimelineData] = useState<WorkerTimelineData[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  // Timeline configuration
  const timelineConfig: TimelineConfig = useMemo(() => ({
    hourWidth: 80,
    minJobWidth: 120,
    timeRange: { startHour: 6, endHour: 20 }, // Default range, will be dynamic
    workerColumnWidth: 280
  }), [])

  // Calculate job duration based on job type or default estimates
  const calculateJobDuration = (job: any): number => {
    // Default durations by job type/title
    const durationMap: Record<string, number> = {
      'plumbing repair': 120,
      'kitchen installation': 240,
      'bathroom renovation': 180,
      'emergency repair': 90,
      'maintenance': 60,
      'inspection': 30,
      'consultation': 60
    }

    const jobTitle = job.title?.toLowerCase() || ''
    for (const [key, duration] of Object.entries(durationMap)) {
      if (jobTitle.includes(key)) {
        return duration
      }
    }

    // Default duration
    return 120
  }

  // Process jobs for timeline display
  const processTimelineJobs = (rawJobs: any[]): TimelineJob[] => {
    return rawJobs
      .filter(job => {
        const jobDate = new Date(job.scheduled_at)
        return jobDate.toDateString() === selectedDate.toDateString()
      })
      .map(job => {
        const startTime = new Date(job.scheduled_at)
        const duration = calculateJobDuration(job)
        const endTime = new Date(startTime.getTime() + duration * 60000)

        return {
          ...job,
          duration,
          startTime,
          endTime,
          conflictStatus: 'valid' as const
        }
      })
      .sort((a, b) => a.startTime.getTime() - b.startTime.getTime())
  }

  // Get worker status based on jobs and availability
  const getWorkerStatus = (workerJobs: TimelineJob[], availability: any[]): 'busy' | 'scheduled' | 'available' => {
    if (workerJobs.length === 0) return 'available'
    
    const now = new Date()
    const currentJobs = workerJobs.filter(job => 
      job.startTime <= now && job.endTime >= now && job.status === 'in_progress'
    )
    
    if (currentJobs.length > 0) return 'busy'
    return 'scheduled'
  }

  // Calculate dynamic time range based on worker availability (not just jobs)
  const calculateTimeRange = (allJobs: TimelineJob[], workers: any[]) => {
    let earliestHour = 6 // Default start
    let latestHour = 20 // Default end

         // Check worker availability first to get the full working day range
     workers.forEach((worker: any) => {
       const availability: AvailabilitySlot[] = demoAvailability[worker.id] || []
       availability.forEach((slot: AvailabilitySlot) => {
         const startHour = parseInt(slot.start.split(':')[0])
         const endHour = parseInt(slot.end.split(':')[0])
         
         if (startHour < earliestHour) earliestHour = startHour
         if (endHour > latestHour) latestHour = endHour
       })
     })

    // Also check job times to ensure they're included
    allJobs.forEach(job => {
      const startHour = job.startTime.getHours()
      const endHour = job.endTime.getHours()
      
      if (startHour < earliestHour) earliestHour = Math.max(0, startHour - 1)
      if (endHour > latestHour) latestHour = Math.min(23, endHour + 1)
    })

    // Ensure minimum 8-hour range
    if (latestHour - earliestHour < 8) {
      const center = Math.floor((earliestHour + latestHour) / 2)
      earliestHour = Math.max(0, center - 4)
      latestHour = Math.min(23, center + 4)
    }

    return { startHour: earliestHour, endHour: latestHour }
  }

  // Process all data when dependencies change
  useEffect(() => {
    if (jobsLoading || workersLoading) {
      setLoading(true)
      return
    }

    if (jobsError || workersError) {
      setError(jobsError || workersError)
      setLoading(false)
      return
    }

    try {
      // Use demo data if no real data is available
      if (!jobs || jobs.length === 0 || !workers || workers.length === 0) {
        console.log('Using demo data for timeline')
        const demoData = createDemoTimelineData(selectedDate)
        setTimelineData(demoData)
        setError(null)
        setLoading(false)
        return
      }

      const timelineJobs = processTimelineJobs(jobs || [])
      const timeRange = calculateTimeRange(timelineJobs, workers || [])

      const processedData: WorkerTimelineData[] = (workers || []).map(worker => {
        const workerJobs = timelineJobs.filter(job => job.worker_id === worker.id)
        const status = getWorkerStatus(workerJobs, []) // availability would be fetched separately
        
        return {
          worker,
          availability: [], // Would be populated by separate availability hook
          jobs: workerJobs,
          timeRange: { start: timeRange.startHour, end: timeRange.endHour },
          totalJobs: workerJobs.length,
          status
        }
      })

      setTimelineData(processedData)
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to process timeline data'))
    } finally {
      setLoading(false)
    }
  }, [jobs, workers, selectedDate, jobsLoading, workersLoading, jobsError, workersError])

  // Get total jobs count for the selected date
  const totalJobs = useMemo(() => {
    return timelineData.reduce((sum, worker) => sum + worker.totalJobs, 0)
  }, [timelineData])

  return {
    timelineData,
    timelineConfig,
    totalJobs,
    selectedDate,
    loading,
    error,
    refreshData: () => {
      // Trigger refresh of underlying hooks
      window.location.reload() // Simple refresh for now
    }
  }
} 