import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { addMinutes, startOfDay, addDays, parseISO } from 'date-fns'

/**
 * High-Performance Next Available Slot API
 * Finds the single next available time slot for each worker after a specified time.
 */

interface NextAvailableRequest {
  jobId: string
  duration: number
  searchStartDate: string // ISO string for when to start the search
  searchDaysLimit?: number // How many days to search forward
  debug?: boolean // Enable debug logging
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const body: NextAvailableRequest = await request.json()

    const {
      jobId,
      duration,
      searchStartDate,
      searchDaysLimit = 14, // Default to searching 2 weeks ahead
      debug = false, // Add debug flag
    } = body

    if (!jobId || !duration || !searchStartDate) {
      return NextResponse.json(
        { error: 'Missing required fields: jobId, duration, searchStartDate' },
        { status: 400 }
      )
    }

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: business, error: businessError } = await supabase
      .from('businesses')
      .select('id, timezone')
      .eq('user_id', user.id)
      .single()

    if (businessError || !business) {
      return NextResponse.json({ error: 'Business not found' }, { status: 404 })
    }
    
    const { data: workers, error: workersError } = await supabase
      .from('workers')
      .select('id, name')
      .eq('business_id', business.id)
      .eq('status', 'active')

    if (workersError) {
      return NextResponse.json({ error: 'Failed to fetch workers' }, { status: 500 })
    }

    if (!workers || workers.length === 0) {
      return NextResponse.json({ slots: [] })
    }
    
    const slots = await Promise.all(
      workers.map(worker => 
        findNextSlotForWorker(
          supabase, 
          worker.id, 
          worker.name, 
          jobId, 
          duration, 
          searchStartDate,
          searchDaysLimit,
          debug
        )
      )
    )

    const availableSlots = slots.filter(slot => slot !== null)

    return NextResponse.json({ slots: availableSlots })

  } catch (error) {
    console.error('Error finding next available slot:', error)
    return NextResponse.json(
      { error: 'Failed to find next available slots' },
      { status: 500 }
    )
  }
}

async function findNextSlotForWorker(
  supabase: any,
  workerId: string,
  workerName: string,
  jobId: string,
  duration: number,
  searchStartISO: string,
  searchDaysLimit: number,
  debug: boolean = false
) {
  const searchStartDate = parseISO(searchStartISO)
  let currentDate = startOfDay(searchStartDate)

  for (let day = 0; day < searchDaysLimit; day++) {
    const dayOfWeek = currentDate.getDay() // 0 = Sunday, 1 = Monday, etc.
    
    // Get worker's availability for this day of the week
    const { data: weeklyAvailability, error: availabilityError } = await supabase
      .from('worker_weekly_availability')
      .select('start_time, end_time')
      .eq('worker_id', workerId)
      .eq('day_of_week', dayOfWeek)

    if (availabilityError) {
      console.error('Error checking weekly availability:', availabilityError)
      currentDate = addDays(currentDate, 1)
      continue
    }

    // If no availability set for this day, skip to next day
    if (!weeklyAvailability || weeklyAvailability.length === 0) {
      if (debug) {
        console.log(`Worker ${workerName} has no availability on ${currentDate.toDateString()} (day ${dayOfWeek})`)
      }
      currentDate = addDays(currentDate, 1)
      continue
    }

    if (debug) {
      console.log(`Worker ${workerName} availability on ${currentDate.toDateString()}:`, weeklyAvailability)
    }

    // Check each availability slot for this day
    for (const availabilitySlot of weeklyAvailability) {
      const startTimeParts = availabilitySlot.start_time.split(':')
      const endTimeParts = availabilitySlot.end_time.split(':')
      
      const slotStartHour = parseInt(startTimeParts[0])
      const slotStartMinute = parseInt(startTimeParts[1])
      const slotEndHour = parseInt(endTimeParts[0])
      const slotEndMinute = parseInt(endTimeParts[1])

      // Generate 30-minute intervals within this availability slot
      // Start from the availability slot start time, rounded up to next 30-min interval if needed
      let currentHour = slotStartHour
      let currentMinute = Math.ceil(slotStartMinute / 30) * 30
      if (currentMinute >= 60) {
        currentMinute = 0
        currentHour += 1
      }

      // Calculate the end time in minutes for easier comparison
      const availabilityEndMinutes = slotEndHour * 60 + slotEndMinute
      const jobDurationMinutes = duration

      while (true) {
        const currentTotalMinutes = currentHour * 60 + currentMinute
        
        // Check if we've reached the end of this availability slot
        if (currentTotalMinutes >= availabilityEndMinutes) {
          break
        }

        // Check if a job of this duration would fit within the availability slot
        if (currentTotalMinutes + jobDurationMinutes > availabilityEndMinutes) {
          break
        }

        const slotStart = new Date(currentDate)
        slotStart.setHours(currentHour, currentMinute, 0, 0)

        // Ensure we only search forward from the original search start time
        if (slotStart <= searchStartDate) {
          // Move to next 30-minute interval
          currentMinute += 30
          if (currentMinute >= 60) {
            currentMinute = 0
            currentHour += 1
          }
          continue
        }

        const slotEnd = addMinutes(slotStart, duration)

        // Use the same availability checking logic as the check API
        const isAvailable = await checkWorkerAvailabilityForSlot(
          supabase,
          workerId,
          slotStart.toISOString(),
          slotEnd.toISOString(),
          jobId
        )

        if (debug) {
          console.log(`Slot ${slotStart.toISOString()} - ${slotEnd.toISOString()} for ${workerName}: ${isAvailable ? 'AVAILABLE' : 'NOT AVAILABLE'}`)
        }

        if (isAvailable) {
          // Double-check: Ensure this slot is actually within worker's availability
          const slotTime = slotStart.toTimeString().slice(0, 5)
          const slotEndTime = slotEnd.toTimeString().slice(0, 5)
          
          if (slotTime >= availabilitySlot.start_time && slotEndTime <= availabilitySlot.end_time) {
            if (debug) {
              console.log(`✓ Returning slot for ${workerName}: ${slotStart.toISOString()}`)
            }
            // Calculate utilization for this worker
            const utilizationPercentage = await calculateWorkerUtilization(supabase, workerId)
            
            return {
              workerId,
              workerName,
              dateTime: slotStart.toISOString(),
              utilizationPercentage
            }
          } else {
            if (debug) {
              console.log(`✗ Slot ${slotTime}-${slotEndTime} is outside availability ${availabilitySlot.start_time}-${availabilitySlot.end_time}`)
            }
          }
        }

        // Move to next 30-minute interval
        currentMinute += 30
        if (currentMinute >= 60) {
          currentMinute = 0
          currentHour += 1
        }
      }
    }
    
    currentDate = addDays(currentDate, 1)
  }

  return null // No slot found within the limit
}

async function checkWorkerAvailabilityForSlot(
  supabase: any,
  workerId: string,
  startTime: string,
  endTime: string,
  excludeJobId: string
) {
  try {
    // Check for conflicting jobs
    let query = supabase
      .from('jobs')
      .select('id, scheduled_at, duration_minutes')
      .eq('worker_id', workerId)
      .neq('status', 'cancelled')
      .neq('status', 'completed')
      .neq('id', excludeJobId)

    const { data: existingJobs, error: jobsError } = await query

    if (jobsError) {
      console.error('Error checking existing jobs:', jobsError)
      return false
    }

    // Check for time conflicts
    const proposedStart = new Date(startTime)
    const proposedEnd = new Date(endTime)

    for (const job of existingJobs || []) {
      const jobStart = new Date(job.scheduled_at)
      const jobEnd = new Date(jobStart.getTime() + (job.duration_minutes * 60000))

      // Check for overlap: (start1 < end2) && (start2 < end1)
      if (proposedStart < jobEnd && jobStart < proposedEnd) {
        return false // Conflict found
      }
    }

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
      return false
    }

    // Check if the proposed time falls within any availability slot
    let isWithinAvailableHours = false

    if (weeklyAvailability && weeklyAvailability.length > 0) {
      for (const slot of weeklyAvailability) {
        // Check if proposed time is within this slot
        if (
          proposedTimeOnly >= slot.start_time &&
          proposedEndTimeOnly <= slot.end_time
        ) {
          isWithinAvailableHours = true
          break
        }
      }
    } else {
      // If no specific availability set, worker is not available
      return false
    }

    if (!isWithinAvailableHours) {
      return false
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
      return false
    }

    if (exceptions && exceptions.length > 0) {
      for (const exception of exceptions) {
        if (!exception.is_available) {
          return false // Worker is not available on this date
        }
        
        // If there's a specific time range for availability on this date
        if (exception.start_time && exception.end_time) {
          if (
            proposedTimeOnly < exception.start_time ||
            proposedEndTimeOnly > exception.end_time
          ) {
            return false
          }
        }
      }
    }

    return true // Available

  } catch (error) {
    console.error('Error checking worker availability:', error)
    return false
  }
}

async function calculateWorkerUtilization(supabase: any, workerId: string): Promise<number> {
  try {
    // Get current week's start and end
    const now = new Date()
    const startOfWeek = new Date(now)
    startOfWeek.setDate(now.getDate() - now.getDay()) // Start of current week (Sunday)
    startOfWeek.setHours(0, 0, 0, 0)
    
    const endOfWeek = new Date(startOfWeek)
    endOfWeek.setDate(startOfWeek.getDate() + 6) // End of current week (Saturday)
    endOfWeek.setHours(23, 59, 59, 999)

    // Get all jobs for this worker in the current week
    const { data: weeklyJobs, error } = await supabase
      .from('jobs')
      .select('duration_minutes')
      .eq('worker_id', workerId)
      .gte('scheduled_at', startOfWeek.toISOString())
      .lte('scheduled_at', endOfWeek.toISOString())
      .neq('status', 'cancelled')

    if (error) {
      console.error('Error calculating utilization:', error)
      return 0
    }

    // Calculate total scheduled minutes
    const totalMinutes = weeklyJobs?.reduce((sum: number, job: any) => sum + (job.duration_minutes || 0), 0) || 0
    
    // Assume 40-hour work week (2400 minutes)
    const workWeekMinutes = 40 * 60
    const utilization = (totalMinutes / workWeekMinutes) * 100
    
    return Math.min(utilization, 100) // Cap at 100%
  } catch (error) {
    console.error('Error calculating worker utilization:', error)
    return 0
  }
} 