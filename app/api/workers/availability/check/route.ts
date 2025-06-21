import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/**
 * Worker Availability Check API
 * Fast endpoint for checking worker availability for a specific time slot
 * Supports both single worker and all workers mode
 */

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const body = await request.json()
    
    const { workerId, startTime, endTime, dateTime, durationMinutes, excludeJobId, getAllWorkers = false } = body

    // Handle both old and new parameter formats
    let calculatedStartTime = startTime
    let calculatedEndTime = endTime

    if (dateTime && durationMinutes) {
      calculatedStartTime = dateTime
      const startDate = new Date(dateTime)
      const endDate = new Date(startDate.getTime() + (durationMinutes * 60000))
      calculatedEndTime = endDate.toISOString()
    }

    if (!calculatedStartTime || !calculatedEndTime) {
      return NextResponse.json(
        { error: 'Missing required fields: startTime/endTime or dateTime/durationMinutes' },
        { status: 400 }
      )
    }

    // Get current user's business
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: business, error: businessError } = await supabase
      .from('businesses')
      .select('id')
      .eq('user_id', user.id)
      .single()

    if (businessError || !business) {
      return NextResponse.json({ error: 'Business not found' }, { status: 404 })
    }

    if (getAllWorkers) {
      // Get all active workers for this business
      const { data: workers, error: workersError } = await supabase
        .from('workers')
        .select('id, name, email, status')
        .eq('business_id', business.id)
        .eq('status', 'active')

      if (workersError) {
        return NextResponse.json({ error: 'Failed to fetch workers' }, { status: 500 })
      }

      const workerResults = []

      for (const worker of workers || []) {
        const availability = await checkSingleWorkerAvailability(
          supabase,
          worker.id,
          calculatedStartTime,
          calculatedEndTime,
          excludeJobId
        )

        // Get worker utilization (simplified calculation)
        const utilization = await getWorkerUtilization(supabase, worker.id)

        workerResults.push({
          workerId: worker.id,
          workerName: worker.name,
          email: worker.email,
          isAvailable: availability.available,
          utilizationPercentage: utilization,
          efficiencyRating: getEfficiencyRating(utilization),
          conflictingJobs: availability.conflictingJobs?.length || 0,
          weeklyHours: Math.round(utilization * 40 / 100), // Estimate based on utilization
          scheduledHours: Math.round(utilization * 40 / 100)
        })
      }

      return NextResponse.json({
        success: true,
        workers: workerResults
      })
    }

    // Single worker check
    if (!workerId) {
      return NextResponse.json(
        { error: 'Missing workerId for single worker check' },
        { status: 400 }
      )
    }

    const availability = await checkSingleWorkerAvailability(
      supabase,
      workerId,
      calculatedStartTime,
      calculatedEndTime,
      excludeJobId
    )

    return NextResponse.json({
      success: true,
      isAvailable: availability.available,
      reason: availability.reason,
      conflictingJobs: availability.conflictingJobs || []
    })

  } catch (error) {
    console.error('Error checking worker availability:', error)
    return NextResponse.json(
      { error: 'Failed to check availability' },
      { status: 500 }
    )
  }
}

async function checkSingleWorkerAvailability(
  supabase: any,
  workerId: string,
  startTime: string,
  endTime: string,
  excludeJobId?: string
) {
  try {
    // Check for conflicting jobs
    let query = supabase
      .from('jobs')
      .select('id, title, scheduled_at, duration_minutes')
      .eq('worker_id', workerId)
      .neq('status', 'cancelled')
      .neq('status', 'completed')

    // Exclude specific job if provided (for rescheduling)
    if (excludeJobId) {
      query = query.neq('id', excludeJobId)
    }

    const { data: existingJobs, error: jobsError } = await query

    if (jobsError) {
      console.error('Error checking existing jobs:', jobsError)
      return { available: false, reason: 'Error checking conflicts' }
    }

    // Check for time conflicts
    const proposedStart = new Date(startTime)
    const proposedEnd = new Date(endTime)
    const conflictingJobs: string[] = []

    existingJobs?.forEach((job: any) => {
      const jobStart = new Date(job.scheduled_at)
      const jobEnd = new Date(jobStart.getTime() + (job.duration_minutes * 60000))

      // Check for overlap: (start1 < end2) && (start2 < end1)
      if (proposedStart < jobEnd && jobStart < proposedEnd) {
        conflictingJobs.push(job.title)
      }
    })

    // Check worker's weekly availability for the proposed day
    const dayOfWeek = proposedStart.getDay() // 0 = Sunday, 1 = Monday, etc.
    const proposedTimeOnly = proposedStart.toTimeString().slice(0, 5) // HH:MM format
    const proposedEndTimeOnly = proposedEnd.toTimeString().slice(0, 5)

    const { data: weeklyAvailability, error: availabilityError } = await supabase
      .from('worker_weekly_availability')
      .select('start_time, end_time')
      .eq('worker_id', workerId)
      .eq('day_of_week', dayOfWeek)

    if (availabilityError) {
      console.error('Error checking weekly availability:', availabilityError)
      return { available: false, reason: 'Error checking availability' }
    }

    // Check if the proposed time falls within any availability slot
    let isWithinAvailableHours = false

    if (weeklyAvailability && weeklyAvailability.length > 0) {
      weeklyAvailability.forEach((slot: any) => {
        // Check if proposed time is within this slot
        if (
          proposedTimeOnly >= slot.start_time &&
          proposedEndTimeOnly <= slot.end_time
        ) {
          isWithinAvailableHours = true
        }
      })
    } else {
      // If no specific availability set for this day, worker is NOT available
      isWithinAvailableHours = false
    }

    // Check for any date-specific exceptions
    const proposedDate = proposedStart.toISOString().split('T')[0]
    const { data: exceptions, error: exceptionsError } = await supabase
      .from('worker_availability_exceptions')
      .select('is_available, start_time, end_time')
      .eq('worker_id', workerId)
      .eq('date', proposedDate)

    if (exceptionsError) {
      console.error('Error checking availability exceptions:', exceptionsError)
      return { available: false, reason: 'Error checking exceptions' }
    }

    // If there's an exception for this date, use it instead of weekly availability
    if (exceptions && exceptions.length > 0) {
      const exception = exceptions[0]
      if (!exception.is_available) {
        isWithinAvailableHours = false
      } else if (exception.start_time && exception.end_time) {
        // Specific hours exception
        isWithinAvailableHours = (
          proposedTimeOnly >= exception.start_time &&
          proposedEndTimeOnly <= exception.end_time
        )
      }
    }

    const isAvailable = isWithinAvailableHours && conflictingJobs.length === 0

    let reason = ''
    if (!isWithinAvailableHours) {
      reason = 'Outside available hours'
    } else if (conflictingJobs.length > 0) {
      reason = `Conflicts: ${conflictingJobs.join(', ')}`
    } else {
      reason = 'Available'
    }

    return { 
      available: isAvailable, 
      reason,
      conflictingJobs,
      isWithinAvailableHours,
      hasConflicts: conflictingJobs.length > 0
    }
  } catch (error) {
    console.error('Error in checkSingleWorkerAvailability:', error)
    return { available: false, reason: 'Error checking availability' }
  }
}

async function getWorkerUtilization(supabase: any, workerId: string): Promise<number> {
  try {
    // Get current week's jobs for this worker
    const now = new Date()
    const startOfWeek = new Date(now.setDate(now.getDate() - now.getDay()))
    const endOfWeek = new Date(now.setDate(now.getDate() - now.getDay() + 6))

    const { data: weeklyJobs, error } = await supabase
      .from('jobs')
      .select('duration_minutes')
      .eq('worker_id', workerId)
      .neq('status', 'cancelled')
      .gte('scheduled_at', startOfWeek.toISOString())
      .lte('scheduled_at', endOfWeek.toISOString())

    if (error) {
      console.error('Error getting worker utilization:', error)
      return 50 // Default moderate utilization
    }

    const totalMinutes = weeklyJobs?.reduce((sum: number, job: any) => sum + (job.duration_minutes || 0), 0) || 0
    const totalHours = totalMinutes / 60
    
    // Assume 40 hours per week is 100% utilization
    const utilization = Math.min(100, Math.round((totalHours / 40) * 100))
    
    return utilization
  } catch (error) {
    console.error('Error calculating worker utilization:', error)
    return 50 // Default moderate utilization
  }
}

function getEfficiencyRating(utilization: number): 'optimal' | 'good' | 'busy' | 'overloaded' {
  if (utilization <= 60) return 'optimal'
  if (utilization <= 80) return 'good'
  if (utilization <= 95) return 'busy'
  return 'overloaded'
} 