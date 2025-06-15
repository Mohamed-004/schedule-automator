import { useState, useEffect, useMemo } from 'react'
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
  
  const supabase = createClient()

  // Fetch real data from database
  const fetchRealData = async () => {
    try {
      setIsLoading(true)
      setError(null)

      // Get current user first
      const { data: { user }, error: userError } = await supabase.auth.getUser()
      if (userError) {
        throw new Error('Authentication failed: ' + userError.message)
      }
      
      if (!user) {
        throw new Error('No authenticated user found')
      }

      // Get user's business - try both user_id and owner_id fields
      let { data: business, error: businessError } = await supabase
        .from('businesses')
        .select('*')
        .eq('user_id', user.id)
        .single()

      // If not found with user_id, try owner_id
      if (businessError && businessError.code === 'PGRST116') {
        const { data: businessByOwner, error: ownerError } = await supabase
          .from('businesses')
          .select('*')
          .eq('owner_id', user.id)
          .single()
        
        if (!ownerError && businessByOwner) {
          business = businessByOwner
          businessError = null
        }
      }

      if (businessError) {
        throw new Error('Could not find business: ' + businessError.message)
      }

      if (!business) {
        throw new Error('No business found for user')
      }

      // Format selected date for query
      const dateString = selectedDate.toISOString().split('T')[0]
      const dateDayOfWeek = selectedDate.getDay()

      // Fetch workers for this business
      const { data: workers, error: workersError } = await supabase
        .from('workers')
        .select('*')
        .eq('business_id', business.id)
        .eq('status', 'active')

      console.log('Debug: Workers query result:', workers)
      console.log('Debug: Business ID:', business.id)

      if (workersError) {
        throw new Error('Failed to fetch workers: ' + workersError.message)
      }

      const workerIds = (workers || []).map(w => w.id)
      console.log('Debug: Fetching availability for workers:', workerIds)
      console.log('Debug: Selected date:', selectedDate)
      console.log('Debug: Day of week:', dateDayOfWeek)
      
      // Fetch regular weekly availability
      const { data: availability, error: availabilityError } = await supabase
        .from('worker_weekly_availability')
        .select('*')
        .in('worker_id', workerIds)
        .eq('day_of_week', dateDayOfWeek)

      console.log('Debug: Regular availability query result:', availability)
      console.log('Debug: Availability error:', availabilityError)

      // Fetch availability exceptions for the selected date
      const { data: exceptions, error: exceptionsError } = await supabase
        .from('worker_availability_exceptions')
        .select('*')
        .in('worker_id', workerIds)
        .eq('date', dateString)

      console.log('Debug: Exceptions query result:', exceptions)
      console.log('Debug: Exceptions error:', exceptionsError)

      // Also check if there are ANY availability records for these workers
      const { data: allAvailability, error: allAvailError } = await supabase
        .from('worker_weekly_availability')
        .select('*')
        .in('worker_id', workerIds)

      console.log('Debug: ALL availability records for workers:', allAvailability)

      if (availabilityError) {
        console.warn('Failed to fetch availability:', availabilityError.message)
      }

      if (exceptionsError) {
        console.warn('Failed to fetch exceptions:', exceptionsError.message)
      }

      // Fetch jobs for selected date and business
      const { data: jobs, error: jobsError } = await supabase
        .from('jobs')
        .select(`
          *,
          clients(name),
          workers(name)
        `)
        .eq('business_id', business.id)
        .gte('scheduled_at', `${dateString}T00:00:00.000Z`)
        .lt('scheduled_at', `${dateString}T23:59:59.999Z`)

      if (jobsError) {
        throw new Error('Failed to fetch jobs: ' + jobsError.message)
      }

      // Process the data
      const processedWorkers: SimpleWorkerData[] = (workers || []).map(worker => {
        // Get jobs for this worker
        const workerJobs = (jobs || [])
          .filter(job => job.worker_id === worker.id)
          .map(job => {
            const startTime = new Date(job.scheduled_at)
            const duration = job.duration_minutes || 120
            
            return {
              id: job.id,
              title: job.title,
              client: job.clients?.name || 'Unknown Client',
              startTime: formatTime12Hour(startTime),
              duration: duration < 60 ? `${duration}m` : `${Math.floor(duration / 60)}h${duration % 60 > 0 ? ` ${duration % 60}m` : ''}`,
              status: mapJobStatus(job.status),
              color: getJobColor(job.status),
              startDate: startTime,
              durationMinutes: duration
            }
          })

        // Sort jobs by start time
        workerJobs.sort((a, b) => a.startDate.getTime() - b.startDate.getTime())

        // Check for availability exception first (highest priority)
        const workerException = (exceptions || []).find(ex => ex.worker_id === worker.id) as AvailabilityException | undefined
        
        // Get regular weekly availability (fallback)
        const workerAvailability = (availability || []).find(a => a.worker_id === worker.id)
        
        console.log(`Debug: Worker ${worker.name} exception:`, workerException)
        console.log(`Debug: Worker ${worker.name} regular availability:`, workerAvailability)
        
        // Parse time strings properly (HH:MM:SS format)
        const parseTimeToMinutes = (timeString: string): number => {
          const [hours, minutes] = timeString.split(':').map(Number)
          return hours * 60 + minutes
        }

        let workStartMinutes: number
        let workEndMinutes: number
        let workingMinutes: number
        let availabilityType: 'regular' | 'exception' | 'unavailable' | 'none'
        let availabilityReason: string | undefined
        let status: 'available' | 'busy' | 'scheduled' | 'unavailable' = 'available'

        // Priority 1: Check for availability exception
        if (workerException) {
          console.log(`Debug: Processing exception for ${worker.name}:`, workerException)
          
          if (!workerException.is_available) {
            // Worker is explicitly unavailable (sick day, time off, etc.)
            workStartMinutes = 0
            workEndMinutes = 0
            workingMinutes = 0
            availabilityType = 'unavailable'
            availabilityReason = workerException.reason || 'Unavailable'
            status = 'unavailable'
          } else if (workerException.start_time && workerException.end_time) {
            // Worker has custom hours for this day
            workStartMinutes = parseTimeToMinutes(workerException.start_time)
            workEndMinutes = parseTimeToMinutes(workerException.end_time)
            workingMinutes = workEndMinutes - workStartMinutes
            availabilityType = 'exception'
            availabilityReason = workerException.reason || 'Special hours'
          } else {
            // Exception exists but no specific times - treat as unavailable
            workStartMinutes = 0
            workEndMinutes = 0
            workingMinutes = 0
            availabilityType = 'unavailable'
            availabilityReason = workerException.reason || 'Unavailable'
            status = 'unavailable'
          }
        }
        // Priority 2: Use regular weekly availability
        else if (workerAvailability) {
          workStartMinutes = parseTimeToMinutes(workerAvailability.start_time)
          workEndMinutes = parseTimeToMinutes(workerAvailability.end_time)
          workingMinutes = workEndMinutes - workStartMinutes
          availabilityType = 'regular'
        }
        // Priority 3: No availability found - fallback
        else {
          workStartMinutes = 0
          workEndMinutes = 0
          workingMinutes = 0
          availabilityType = 'none'
          status = 'unavailable'
        }

        // Calculate utilization and time slots only if worker is available
        let utilization = 0
        const availableSlots: TimeSlot[] = []
        
        if (workingMinutes > 0 && status !== 'unavailable') {
          const totalJobMinutes = workerJobs.reduce((sum, job) => sum + job.durationMinutes, 0)
          utilization = Math.round((totalJobMinutes / workingMinutes) * 100)

          // Calculate available slots between jobs
          if (workerJobs.length === 0) {
            // Full day available
            availableSlots.push({
              startTime: minutesToTime12Hour(workStartMinutes),
              endTime: minutesToTime12Hour(workEndMinutes),
              type: 'available',
              duration: workingMinutes
            })
          } else {
            // Check for gap before first job
            const firstJobStart = workerJobs[0].startDate
            const firstJobHour = firstJobStart.getHours()
            const firstJobMinute = firstJobStart.getMinutes()
            
            const firstJobStartMinutes = firstJobHour * 60 + firstJobMinute
            if (firstJobStartMinutes > workStartMinutes) {
              const gapMinutes = firstJobStartMinutes - workStartMinutes
              if (gapMinutes > 0) {
                availableSlots.push({
                  startTime: minutesToTime12Hour(workStartMinutes),
                  endTime: formatTime12Hour(firstJobStart),
                  type: 'available',
                  duration: gapMinutes
                })
              }
            }

            // Check for gaps between jobs
            for (let i = 0; i < workerJobs.length - 1; i++) {
              const currentJob = workerJobs[i]
              const nextJob = workerJobs[i + 1]
              
              const currentJobEnd = new Date(currentJob.startDate.getTime() + currentJob.durationMinutes * 60000)
              const nextJobStart = nextJob.startDate
              
              const gapMinutes = (nextJobStart.getTime() - currentJobEnd.getTime()) / 60000
              
              if (gapMinutes > 0) {
                availableSlots.push({
                  startTime: formatTime12Hour(currentJobEnd),
                  endTime: formatTime12Hour(nextJobStart),
                  type: 'available',
                  duration: Math.round(gapMinutes)
                })
              }
            }

            // Check for gap after last job
            const lastJob = workerJobs[workerJobs.length - 1]
            const lastJobEnd = new Date(lastJob.startDate.getTime() + lastJob.durationMinutes * 60000)
            const lastJobEndMinutes = lastJobEnd.getHours() * 60 + lastJobEnd.getMinutes()
            
            if (lastJobEndMinutes < workEndMinutes) {
              const gapMinutes = workEndMinutes - lastJobEndMinutes
              if (gapMinutes > 0) {
                availableSlots.push({
                  startTime: formatTime12Hour(lastJobEnd),
                  endTime: minutesToTime12Hour(workEndMinutes),
                  type: 'available',
                  duration: Math.round(gapMinutes)
                })
              }
            }
          }

          // Determine status based on current jobs
          const currentJobs = workerJobs.filter(job => job.status === 'in_progress')
          if (currentJobs.length > 0) {
            status = 'busy'
          } else if (workerJobs.length > 0) {
            status = 'scheduled'
          }
        }

        // Clean up job objects to remove extra fields
        const cleanJobs = workerJobs.map(job => ({
          id: job.id,
          title: job.title,
          client: job.client,
          startTime: job.startTime,
          duration: job.duration,
          status: job.status,
          color: job.color
        }))

        // Format working hours properly without timezone issues
        const formatTimeFromMinutes = (minutes: number): string => {
          const hours = Math.floor(minutes / 60)
          const mins = minutes % 60
          const period = hours >= 12 ? 'PM' : 'AM'
          const displayHours = hours === 0 ? 12 : hours > 12 ? hours - 12 : hours
          return `${displayHours}:${mins.toString().padStart(2, '0')} ${period}`
        }

        // Generate appropriate working hours display
        let workingHoursDisplay: string
        
        if (availabilityType === 'unavailable') {
          workingHoursDisplay = 'Not available'
        } else if (availabilityType === 'none') {
          workingHoursDisplay = 'Not available'
        } else if (workingMinutes > 0) {
          const hoursText = `${formatTimeFromMinutes(workStartMinutes)} - ${formatTimeFromMinutes(workEndMinutes)}`
          if (availabilityType === 'exception') {
            workingHoursDisplay = `${hoursText} (${availabilityReason || 'Special hours'})`
          } else {
            workingHoursDisplay = hoursText
          }
        } else {
          workingHoursDisplay = 'Not available'
        }

        const totalJobMinutes = workerJobs.reduce((sum, job) => sum + job.durationMinutes, 0)

        return {
          id: worker.id,
          name: worker.name,
          status,
          workingHours: workingHoursDisplay,
          utilization,
          jobs: cleanJobs,
          availableSlots,
          totalWorkingMinutes: workingMinutes,
          totalScheduledMinutes: totalJobMinutes,
          availabilityType,
          availabilityReason
        }
      })

      setWorkersData(processedWorkers)
    } catch (err) {
      console.error('Error fetching real timeline data:', err)
      setError(err instanceof Error ? err.message : 'Failed to load data')
      
      // Fallback to demo data if database fails
      setWorkersData(getFallbackDemoData())
    } finally {
      setIsLoading(false)
    }
  }

  // Calculate stats
  const stats = useMemo(() => {
    const totalJobs = workersData.reduce((sum, worker) => sum + worker.jobs.length, 0)
    const completedJobs = workersData.reduce((sum, worker) => 
      sum + worker.jobs.filter(job => job.status === 'completed').length, 0)
    const remainingJobs = totalJobs - completedJobs
    const totalWorkers = workersData.length
    const averageUtilization = workersData.length > 0 
      ? workersData.reduce((sum, worker) => sum + worker.utilization, 0) / workersData.length 
      : 0

    return {
      totalJobs,
      completedJobs,
      remainingJobs,
      totalWorkers,
      averageUtilization,
      totalScheduledHours: 4.5,
      totalAvailableHours: 18
    }
  }, [workersData])

  // Refresh function
  const refreshData = () => {
    fetchRealData()
  }

  // Fetch data on mount and date change
  useEffect(() => {
    fetchRealData()
  }, [selectedDate])

  return {
    workersData,
    stats,
    isLoading,
    error,
    refreshData
  }
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