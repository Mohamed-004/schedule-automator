import { useState, useEffect, useMemo } from 'react'
import { WorkerTimelineData, TimelineConfig } from '@/lib/types'
import { createClient } from '@/lib/supabase/client'

interface TimelineDataReturn {
  workersData: WorkerTimelineData[]
  timelineConfig: TimelineConfig
  isLoading: boolean
  error: string | null
  refreshData: () => void
  stats: {
    totalJobs: number
    completedJobs: number
    remainingJobs: number
    totalWorkers: number
    averageUtilization: number
    totalScheduledHours: number
    totalAvailableHours: number
  }
}

/**
 * Hook to fetch and prepare real timeline data from Supabase database
 * Provides comprehensive worker scheduling data with proper error handling
 */
export function useTimelineData(selectedDate: Date): TimelineDataReturn {
  const [workersData, setWorkersData] = useState<WorkerTimelineData[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  const supabase = createClient()

  // Timeline configuration
  const timelineConfig: TimelineConfig = {
    hourWidth: 80, // Increased for better visibility
    minJobWidth: 100, // Increased minimum width
    timeRange: { startHour: 6, endHour: 20 },
    workerColumnWidth: 280 // Increased for better worker info display
  }

  // Fetch data from Supabase
  const fetchTimelineData = async () => {
    try {
      setIsLoading(true)
      setError(null)

      // Format selected date for query
      const dateString = selectedDate.toISOString().split('T')[0]

      // Fetch workers with their jobs for the selected date
      const { data: workers, error: workersError } = await supabase
        .from('workers')
        .select(`
          *,
          jobs!jobs_assigned_worker_id_fkey (
            *,
            clients (
              name
            )
          )
        `)
        .eq('status', 'active')

      if (workersError) throw workersError

      // Process workers data
      const processedData: WorkerTimelineData[] = (workers || []).map(worker => {
        // Filter jobs for selected date
        const dayJobs = (worker.jobs || [])
          .filter(job => {
            if (!job.scheduled_start) return false
            const jobDate = new Date(job.scheduled_start).toISOString().split('T')[0]
            return jobDate === dateString
          })
          .map(job => ({
            ...job,
            duration: job.estimated_duration || 120, // Default 2 hours
            startTime: new Date(job.scheduled_start),
            endTime: new Date(new Date(job.scheduled_start).getTime() + (job.estimated_duration || 120) * 60000),
            client_name: job.clients?.name || 'Unknown Client'
          }))

        // Generate availability (default business hours for now)
        const availability = [
          { start: '08:00', end: '17:00' }
        ]

        // Determine worker status
        const now = new Date()
        const currentJobs = dayJobs.filter(job => {
          const jobEnd = new Date(job.startTime.getTime() + job.duration * 60000)
          return job.startTime <= now && now <= jobEnd && job.status === 'in_progress'
        })

        let status: 'available' | 'busy' | 'scheduled' = 'available'
        if (currentJobs.length > 0) {
          status = 'busy'
        } else if (dayJobs.length > 0) {
          status = 'scheduled'
        }

        return {
          worker: {
            id: worker.id,
            name: worker.name,
            email: worker.email || '',
            phone: worker.phone || '',
            hourlyRate: worker.hourly_rate || 0
          },
          jobs: dayJobs,
          status,
          totalJobs: dayJobs.length,
          timeRange: { start: 6, end: 20 },
          availability
        }
      })

      setWorkersData(processedData)
    } catch (err) {
      console.error('Error fetching timeline data:', err)
      setError(err instanceof Error ? err.message : 'Failed to load timeline data')
      
      // Fallback to demo data if database fails
      const fallbackData = createFallbackData(selectedDate)
      setWorkersData(fallbackData)
    } finally {
      setIsLoading(false)
    }
  }

  // Calculate comprehensive stats
  const stats = useMemo(() => {
    const allJobs = workersData.flatMap(w => w.jobs)
    const totalJobs = allJobs.length
    const completedJobs = allJobs.filter(j => j.status === 'completed').length
    const remainingJobs = totalJobs - completedJobs
    const totalWorkers = workersData.length

    // Calculate utilization
    let totalScheduledMinutes = 0
    let totalAvailableMinutes = 0
    
    workersData.forEach(workerData => {
      const scheduledMinutes = workerData.jobs.reduce((sum, job) => sum + job.duration, 0)
      const availableMinutes = workerData.availability.reduce((sum, slot) => {
        const [startHour, startMin] = slot.start.split(':').map(Number)
        const [endHour, endMin] = slot.end.split(':').map(Number)
        return sum + ((endHour * 60 + endMin) - (startHour * 60 + startMin))
      }, 0)
      
      totalScheduledMinutes += scheduledMinutes
      totalAvailableMinutes += availableMinutes
    })

    const totalScheduledHours = totalScheduledMinutes / 60
    const totalAvailableHours = totalAvailableMinutes / 60
    const averageUtilization = totalAvailableMinutes > 0 
      ? (totalScheduledMinutes / totalAvailableMinutes) * 100 
      : 0

    return {
      totalJobs,
      completedJobs,
      remainingJobs,
      totalWorkers,
      averageUtilization,
      totalScheduledHours,
      totalAvailableHours
    }
  }, [workersData])

  // Refresh function
  const refreshData = () => {
    fetchTimelineData()
  }

  // Fetch data on mount and date change
  useEffect(() => {
    fetchTimelineData()
  }, [selectedDate])

  return {
    workersData,
    timelineConfig,
    isLoading,
    error,
    refreshData,
    stats
  }
}

/**
 * Create fallback demo data when database is unavailable
 */
function createFallbackData(selectedDate: Date): WorkerTimelineData[] {
  return [
    {
      worker: {
        id: 'demo-1',
        name: 'Ameer Gailan',
        email: 'ameer@example.com',
        phone: '+1234567890',
        hourlyRate: 25
      },
      jobs: [
        {
          id: 'demo-job-1',
          business_id: 'demo-business',
          client_id: 'demo-client-1',
          worker_id: 'demo-1',
          title: 'Office Cleaning',
          description: 'Complete office cleaning service',
          status: 'scheduled',
          priority: 'high',
          scheduled_at: new Date(selectedDate.getFullYear(), selectedDate.getMonth(), selectedDate.getDate(), 9, 0).toISOString(),
          completed_at: null,
          location: 'Downtown Office',
          client_name: 'Tech Corp',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          duration: 120,
          startTime: new Date(selectedDate.getFullYear(), selectedDate.getMonth(), selectedDate.getDate(), 9, 0),
          endTime: new Date(selectedDate.getFullYear(), selectedDate.getMonth(), selectedDate.getDate(), 11, 0),
          scheduled_start: new Date(selectedDate.getFullYear(), selectedDate.getMonth(), selectedDate.getDate(), 9, 0).toISOString(),
          assigned_worker_id: 'demo-1',
          estimated_duration: 120
        }
      ],
      status: 'scheduled',
      totalJobs: 1,
      timeRange: { start: 6, end: 20 },
      availability: [{ start: '08:00', end: '17:00' }]
    }
  ]
} 