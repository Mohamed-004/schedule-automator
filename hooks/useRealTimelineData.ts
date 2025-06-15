import { useState, useEffect, useMemo, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { formatTime12Hour, minutesToTime12Hour } from '@/lib/time-utils'

interface SimpleWorkerData {
  id: string
  name: string
  status: 'busy' | 'scheduled' | 'available' | 'unavailable'
  workingHours: string
  utilization: number
  jobs: SimpleJob[]
  availableSlots: TimeSlot[]
  totalWorkingMinutes: number
  totalScheduledMinutes: number
  availabilityType: 'regular' | 'exception' | 'unavailable' | 'none'
  availabilityReason?: string
}

interface TimeSlot {
  startTime: string
  endTime: string
  type: 'available' | 'scheduled'
  duration: number
}

interface SimpleJob {
  id: string
  title: string
  client: string
  startTime: string
  duration: string
  status: 'scheduled' | 'in_progress' | 'completed'
  color: string
}

interface TimelineStats {
  totalJobs: number
  completedJobs: number
  remainingJobs: number
  totalWorkers: number
  averageUtilization: number
  totalScheduledHours: number
  totalAvailableHours: number
}

interface UseRealTimelineDataReturn {
  workersData: SimpleWorkerData[]
  stats: TimelineStats
  isLoading: boolean
  error: string | null
  refreshData: () => void
}

interface AvailabilityException {
  id: string
  worker_id: string
  date: string
  is_available: boolean
  start_time: string | null
  end_time: string | null
  reason: string | null
}

/**
 * Hook to fetch real timeline data from Supabase database
 * Returns simplified data structure that works with the UI
 * Handles regular availability, exceptions, and fallback scenarios
 */
export function useRealTimelineData(selectedDate: Date): UseRealTimelineDataReturn {
  const [workersData, setWorkersData] = useState<SimpleWorkerData[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [refreshKey, setRefreshKey] = useState(0)

  const fetchRealData = useCallback(async (date: Date) => {
    try {
      setIsLoading(true)
      setError(null)

      const supabase = createClient()
      const { data: { user }, error: userError } = await supabase.auth.getUser()
      if (userError || !user) throw new Error('Authentication failed.')

      const { data: business, error: businessError } = await supabase
        .from('businesses')
        .select('id')
        .eq('user_id', user.id)
        .single()
      if (businessError) throw new Error('Could not find business.')
      if (!business) throw new Error('No business found for user.')

      const dateString = date.toISOString().split('T')[0]
      const dayOfWeek = date.getDay()

      const [
        { data: workers, error: workersError },
        { data: jobs, error: jobsError },
        { data: availability, error: availabilityError },
        { data: exceptions, error: exceptionsError }
      ] = await Promise.all([
        supabase.from('workers').select('*').eq('business_id', business.id).eq('status', 'active'),
        supabase.from('jobs').select('*').eq('business_id', business.id).gte('scheduled_at', `${dateString}T00:00:00.000Z`).lt('scheduled_at', `${dateString}T23:59:59.999Z`),
        supabase.from('worker_weekly_availability').select('*').eq('day_of_week', dayOfWeek),
        supabase.from('worker_availability_exceptions').select('*').eq('date', dateString)
      ])

      if (workersError || jobsError || availabilityError || exceptionsError) {
        console.error({ workersError, jobsError, availabilityError, exceptionsError })
        throw new Error('Failed to fetch timeline data.')
      }
      
      const workerIds = (workers || []).map(w => w.id);
      
      const availabilityForWorkers = (availability || []).filter(a => workerIds.includes(a.worker_id));
      const exceptionsForWorkers = (exceptions || []).filter(e => workerIds.includes(e.worker_id));

      const processedData = processTimelineData(
        workers || [], 
        jobs || [], 
        availabilityForWorkers, 
        exceptionsForWorkers
      );
      
      setWorkersData(processedData)

    } catch (err: any) {
      console.error("Error fetching timeline data:", err)
      setError(err.message || 'An unknown error occurred.')
      setWorkersData([]) // Clear data on error
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchRealData(selectedDate)
  }, [selectedDate, fetchRealData, refreshKey])

  const refreshData = () => {
    setRefreshKey(prev => prev + 1)
  }

  const stats = useMemo(() => {
    if (!workersData.length) {
      return {
        totalJobs: 0,
        completedJobs: 0,
        remainingJobs: 0,
        totalWorkers: 0,
        averageUtilization: 0,
        totalScheduledHours: 0,
        totalAvailableHours: 0,
      }
    }

    const totalJobs = workersData.reduce((sum, worker) => sum + worker.jobs.length, 0)
    const completedJobs = workersData.reduce((sum, worker) => 
      sum + worker.jobs.filter(job => job.status === 'completed').length, 0)
    
    const totalScheduledMinutes = workersData.reduce((sum, worker) => sum + worker.totalScheduledMinutes, 0)
    const totalWorkingMinutes = workersData.reduce((sum, worker) => sum + worker.totalWorkingMinutes, 0)
    
    const averageUtilization = workersData.length > 0
      ? Math.round(workersData.reduce((sum, worker) => sum + worker.utilization, 0) / workersData.length)
      : 0

    return {
      totalJobs,
      completedJobs,
      remainingJobs: totalJobs - completedJobs,
      totalWorkers: workersData.length,
      averageUtilization,
      totalScheduledHours: totalScheduledMinutes / 60,
      totalAvailableHours: totalWorkingMinutes / 60,
    }
  }, [workersData])

  return { workersData, stats, isLoading, error, refreshData }
}

// This function can be moved outside the hook to be a pure function
function processTimelineData(
  workers: any[], 
  jobs: any[], 
  availability: any[], 
  exceptions: any[]
): SimpleWorkerData[] {
  return (workers || []).map(worker => {
    const workerJobs = (jobs || [])
      .filter(job => job.worker_id === worker.id)
      .map(job => {
        const startTime = new Date(job.scheduled_at)
        const duration = job.duration_minutes || 120
        
        return {
          id: job.id,
          title: job.title,
          client: 'Client', // We'll fetch client names separately if needed
          startTime: formatTime12Hour(startTime),
          duration: duration < 60 ? `${duration}m` : `${Math.floor(duration / 60)}h${duration % 60 > 0 ? ` ${duration % 60}m` : ''}`,
          status: mapJobStatus(job.status),
          color: getJobColor(job.status),
          startDate: startTime,
          durationMinutes: duration
        }
      })
      .sort((a, b) => a.startDate.getTime() - b.startDate.getTime())

    const workerException = (exceptions || []).find(ex => ex.worker_id === worker.id) as AvailabilityException | undefined
    const workerAvailability = (availability || []).find(a => a.worker_id === worker.id)

    const parseTimeToMinutes = (timeString: string): number => {
      const [hours, minutes] = timeString.split(':').map(Number)
      return hours * 60 + minutes
    }

    let workStartMinutes = 0
    let workEndMinutes = 0
    let availabilityType: 'regular' | 'exception' | 'unavailable' | 'none' = 'none'
    let availabilityReason: string | undefined
    let status: 'available' | 'busy' | 'scheduled' | 'unavailable' = 'available'

    if (workerException) {
      if (!workerException.is_available) {
        availabilityType = 'unavailable'
        availabilityReason = workerException.reason || 'Unavailable'
      } else if (workerException.start_time && workerException.end_time) {
        workStartMinutes = parseTimeToMinutes(workerException.start_time)
        workEndMinutes = parseTimeToMinutes(workerException.end_time)
        availabilityType = 'exception'
        availabilityReason = workerException.reason || 'Special hours'
      } else {
        availabilityType = 'unavailable'
        availabilityReason = workerException.reason || 'Unavailable'
      }
    } else if (workerAvailability) {
      workStartMinutes = parseTimeToMinutes(workerAvailability.start_time)
      workEndMinutes = parseTimeToMinutes(workerAvailability.end_time)
      availabilityType = 'regular'
    }

    const workingMinutes = workEndMinutes - workStartMinutes
    const availableSlots: TimeSlot[] = []
    
    const totalJobMinutes = workerJobs.reduce((sum, job) => sum + job.durationMinutes, 0)
    let utilization = 0

    if (workingMinutes > 0) {
      utilization = Math.round((totalJobMinutes / workingMinutes) * 100)

      if (workerJobs.length === 0) {
        availableSlots.push({
          startTime: minutesToTime12Hour(workStartMinutes),
          endTime: minutesToTime12Hour(workEndMinutes),
          type: 'available',
          duration: workingMinutes
        })
      } else {
        let lastEventTime = workStartMinutes;
        workerJobs.forEach(job => {
            const jobStartMinutes = job.startDate.getHours() * 60 + job.startDate.getMinutes();
            if (jobStartMinutes > lastEventTime) {
                availableSlots.push({
                    startTime: minutesToTime12Hour(lastEventTime),
                    endTime: formatTime12Hour(job.startDate),
                    type: 'available',
                    duration: jobStartMinutes - lastEventTime,
                });
            }
            lastEventTime = jobStartMinutes + job.durationMinutes;
        });
        if (lastEventTime < workEndMinutes) {
            availableSlots.push({
                startTime: minutesToTime12Hour(lastEventTime),
                endTime: minutesToTime12Hour(workEndMinutes),
                type: 'available',
                duration: workEndMinutes - lastEventTime,
            });
        }
      }
      
      const currentJobs = workerJobs.filter(job => job.status === 'in_progress')
      if (currentJobs.length > 0) {
        status = 'busy'
      } else if (workerJobs.length > 0) {
        status = 'scheduled'
      }
    } else {
      status = 'unavailable'
    }

    if (availabilityType === 'unavailable' || availabilityType === 'none') {
      status = 'unavailable'
    }

    const cleanJobs = workerJobs.map(({ startDate, durationMinutes, ...job }) => job)

    const formatTimeFromMinutes = (minutes: number): string => {
      const hours = Math.floor(minutes / 60)
      const mins = minutes % 60
      const period = hours >= 12 ? 'PM' : 'AM'
      const displayHours = hours === 0 ? 12 : hours > 12 ? hours - 12 : hours
      return `${displayHours}:${mins.toString().padStart(2, '0')} ${period}`
    }

    let workingHoursDisplay: string
    if (availabilityType === 'unavailable' || availabilityType === 'none' || workingMinutes <= 0) {
      workingHoursDisplay = 'Not available'
    } else {
      const hoursText = `${formatTimeFromMinutes(workStartMinutes)} - ${formatTimeFromMinutes(workEndMinutes)}`
      workingHoursDisplay = availabilityType === 'exception' ? `${hoursText} (${availabilityReason || 'Special hours'})` : hoursText
    }

    return {
      id: worker.id,
      name: worker.name,
      status,
      workingHours: workingHoursDisplay,
      utilization,
      jobs: cleanJobs,
      availableSlots,
      totalWorkingMinutes: workingMinutes > 0 ? workingMinutes : 0,
      totalScheduledMinutes: totalJobMinutes,
      availabilityType,
      availabilityReason,
    }
  })
}

// Helper functions
function mapJobStatus(dbStatus: string): 'scheduled' | 'in_progress' | 'completed' {
  switch (dbStatus?.toLowerCase()) {
    case 'in_progress':
    case 'active':
      return 'in_progress'
    case 'completed':
    case 'done':
      return 'completed'
    default:
      return 'scheduled'
  }
}

function getJobColor(status: string): string {
  switch (status?.toLowerCase()) {
    case 'in_progress':
    case 'active':
      return 'bg-blue-100 border-blue-300'
    case 'completed':
    case 'done':
      return 'bg-green-100 border-green-300'
    default:
      return 'bg-yellow-100 border-yellow-300'
  }
}

function getFallbackDemoData(): SimpleWorkerData[] {
  return [
    {
      id: '1',
      name: 'Ameer Gailan',
      status: 'busy',
      workingHours: '8:00 AM - 5:00 PM',
      utilization: 3,
      jobs: [
        {
          id: '1',
          title: 'Powerwash',
          client: 'Mohamed Abdelaal',
          startTime: '9:45 AM',
          duration: '15m',
          status: 'in_progress',
          color: 'bg-blue-100 border-blue-300'
        }
      ],
      availableSlots: [
        {
          startTime: '8:00 AM',
          endTime: '9:45 AM',
          type: 'available',
          duration: 105
        },
        {
          startTime: '10:00 AM',
          endTime: '5:00 PM',
          type: 'available',
          duration: 420
        }
      ],
      totalWorkingMinutes: 540,
      totalScheduledMinutes: 15,
      availabilityType: 'regular'
    },
    {
      id: '2',
      name: 'Test Worker',
      status: 'scheduled',
      workingHours: '8:00 AM - 5:00 PM',
      utilization: 33,
      jobs: [
        {
          id: '3',
          title: 'Maintenance Check',
          client: 'Property Co',
          startTime: '10:30 AM',
          duration: '1h',
          status: 'completed',
          color: 'bg-green-100 border-green-300'
        }
      ],
      availableSlots: [
        {
          startTime: '8:00 AM',
          endTime: '10:30 AM',
          type: 'available',
          duration: 150
        },
        {
          startTime: '11:30 AM',
          endTime: '5:00 PM',
          type: 'available',
          duration: 330
        }
      ],
      totalWorkingMinutes: 540,
      totalScheduledMinutes: 60,
      availabilityType: 'regular'
    },
    {
      id: '3',
      name: 'Part Time Worker',
      status: 'available',
      workingHours: '12:00 PM - 6:00 PM',
      utilization: 0,
      jobs: [],
      availableSlots: [
        {
          startTime: '12:00 PM',
          endTime: '6:00 PM',
          type: 'available',
          duration: 360
        }
      ],
      totalWorkingMinutes: 360,
      totalScheduledMinutes: 0,
      availabilityType: 'regular'
    }
  ]
} 