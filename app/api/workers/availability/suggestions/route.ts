import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { addDays, format, parseISO, addMinutes, startOfDay, addHours, startOfWeek, endOfWeek } from 'date-fns'

/**
 * Enhanced Smart Reschedule Suggestions API
 * Provides intelligent suggestions for job rescheduling including:
 * - Worker workload analysis and prioritization
 * - Alternative time slots with conflict analysis
 * - Alternative workers for the same time
 * - Optimal worker+time combinations based on efficiency
 * - Smart conflict resolution suggestions
 * - Full day/week availability analysis
 */

interface SuggestionRequest {
  jobId?: string
  workerId?: string
  preferredDateTime?: string
  startDate?: string
  endDate?: string
  duration: number
  searchDays?: number // How many days ahead to search
  allWorkers?: boolean // Flag to get batch availability for all workers
}

interface TimeSlot {
  start: string
  end: string
  available: boolean
  reason?: string
}

interface WorkerSuggestion {
  workerId: string
  workerName: string
  isAvailable: boolean
  currentWorkload: number // Hours this week
  utilizationScore: number // 0-100, lower is better for efficiency
  weeklyCapacity: number
  nextAvailableSlot?: TimeSlot
  conflictingJobs: string[]
  availableSlots: TimeSlot[]
  efficiencyRating: 'optimal' | 'good' | 'busy' | 'overloaded'
}

interface TimeSuggestion {
  dateTime: string
  score: number // 0-100, higher is better
  reason: string
  availableWorkers: Array<{
    id: string
    name: string
    workload: number
    isOptimal: boolean
  }>
  conflicts: number
  dayOfWeek: string
  timeOfDay: 'morning' | 'afternoon' | 'evening'
}

interface DayAnalysis {
  date: string
  dayName: string
  availableWorkers: number
  totalSlots: number
  availableSlots: number
  bestTimes: string[]
  hasFullDayAvailability: boolean
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const body: SuggestionRequest = await request.json()
    
    const { 
      jobId, 
      workerId,
      preferredDateTime, 
      startDate,
      endDate,
      duration, 
      searchDays = 7,
      allWorkers = false
    } = body

    if (!duration) {
      return NextResponse.json(
        { error: 'Missing required field: duration' },
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

    // Get all active workers for this business
    const { data: workers, error: workersError } = await supabase
      .from('workers')
      .select('id, name, email')
      .eq('business_id', business.id)
      .eq('status', 'active')

    if (workersError) {
      return NextResponse.json({ error: 'Failed to fetch workers' }, { status: 500 })
    }

    // Determine search period
    let searchStartDate: Date
    let searchEndDate: Date
    
    if (startDate && endDate) {
      searchStartDate = parseISO(startDate)
      searchEndDate = parseISO(endDate)
    } else if (preferredDateTime) {
      searchStartDate = parseISO(preferredDateTime)
      searchEndDate = addDays(searchStartDate, searchDays)
    } else {
      searchStartDate = new Date()
      searchEndDate = addDays(searchStartDate, searchDays)
    }

    // Handle batch worker availability request
    if (allWorkers) {
      const workerAvailability: Record<string, any> = {}
      
      for (const worker of workers || []) {
        // Get worker's weekly workload
        const weekStart = startOfWeek(searchStartDate)
        const workload = await getWorkerWorkload(supabase, worker.id, weekStart)
        
        // Generate availability slots for the week
        const availableSlots = []
        const HOURS = [9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19] // 9 AM to 7 PM
        
        for (let dayOffset = 0; dayOffset < 7; dayOffset++) {
          const currentDay = addDays(searchStartDate, dayOffset)
          
          for (const hour of HOURS) {
            const slotDateTime = addHours(currentDay, hour)
            const endDateTime = addMinutes(slotDateTime, duration)
            
            // Check availability for this slot
            const isAvailable = await checkWorkerAvailability(
              supabase,
              worker.id,
              slotDateTime,
              endDateTime,
              jobId
            )
            
            availableSlots.push({
              dateTime: slotDateTime.toISOString(),
              isAvailable: isAvailable.available
            })
          }
        }
        
        workerAvailability[worker.id] = {
          workload,
          availableSlots
        }
      }
      
      return NextResponse.json({
        success: true,
        workerAvailability
      })
    }

    // Generate enhanced worker analysis
    const workerSuggestions: WorkerSuggestion[] = []
    
    for (const worker of workers || []) {
      const suggestion = await generateEnhancedWorkerSuggestion(
        supabase,
        worker,
        searchStartDate,
        searchEndDate,
        duration,
        jobId
      )
      workerSuggestions.push(suggestion)
    }

    // Generate smart time suggestions with workload consideration
    const timeSuggestions = await generateSmartTimeSuggestions(
      supabase,
      workers || [],
      searchStartDate,
      searchEndDate,
      duration,
      jobId
    )

    // Generate day-by-day analysis
    const dayAnalysis = await generateDayAnalysis(
      supabase,
      workers || [],
      searchStartDate,
      searchEndDate,
      duration,
      jobId
    )

    // Generate optimal combinations prioritizing efficiency
    const optimalCombinations = generateOptimalCombinations(
      workerSuggestions,
      timeSuggestions
    )

    // Generate smart recommendations based on availability patterns
    const smartRecommendations = generateSmartRecommendations(
      workerSuggestions,
      dayAnalysis,
      timeSuggestions
    )

    // Calculate current workload for specific worker if requested
    let currentWorkload = 0
    if (workerId) {
      const workerData = workerSuggestions.find(w => w.workerId === workerId)
      currentWorkload = workerData?.currentWorkload || 0
    }

    return NextResponse.json({
      success: true,
      currentWorkload,
      suggestions: {
        smartRecommendations,
        workerAnalysis: workerSuggestions.sort((a, b) => a.utilizationScore - b.utilizationScore), // Best workers first
        timeAlternatives: timeSuggestions.slice(0, 8), // Top 8 suggestions
        optimalCombinations: optimalCombinations.slice(0, 5), // Top 5 combinations
        dayAnalysis,
        searchPeriod: {
          start: format(searchStartDate, 'yyyy-MM-dd'),
          end: format(searchEndDate, 'yyyy-MM-dd'),
          daysSearched: Math.ceil((searchEndDate.getTime() - searchStartDate.getTime()) / (1000 * 60 * 60 * 24))
        },
        summary: {
          totalWorkersAnalyzed: workerSuggestions.length,
          optimalWorkers: workerSuggestions.filter(w => w.efficiencyRating === 'optimal').length,
          availableTimeSlots: timeSuggestions.length,
          daysWithFullAvailability: dayAnalysis.filter(d => d.hasFullDayAvailability).length
        }
      }
    })

  } catch (error) {
    console.error('Error generating enhanced reschedule suggestions:', error)
    return NextResponse.json(
      { error: 'Failed to generate suggestions' },
      { status: 500 }
    )
  }
}

async function generateEnhancedWorkerSuggestion(
  supabase: any,
  worker: any,
  searchStartDate: Date,
  searchEndDate: Date,
  duration: number,
  excludeJobId?: string
): Promise<WorkerSuggestion> {
  // Get worker's weekly availability capacity
  const { data: weeklyAvailability } = await supabase
    .from('worker_weekly_availability')
    .select('day_of_week, start_time, end_time')
    .eq('worker_id', worker.id)

  let weeklyCapacity = 0
  if (weeklyAvailability) {
    weeklyCapacity = weeklyAvailability.reduce((total: number, slot: any) => {
      const start = new Date(`2000-01-01T${slot.start_time}`)
      const end = new Date(`2000-01-01T${slot.end_time}`)
      const hours = (end.getTime() - start.getTime()) / (1000 * 60 * 60)
      return total + hours
    }, 0)
  }

  // Calculate current workload for this week
  const weekStart = startOfWeek(searchStartDate)
  const weekEnd = endOfWeek(searchStartDate)
  
  let query = supabase
    .from('jobs')
    .select('duration_minutes')
    .eq('worker_id', worker.id)
    .neq('status', 'cancelled')
    .gte('scheduled_at', weekStart.toISOString())
    .lte('scheduled_at', weekEnd.toISOString())

  if (excludeJobId) {
    query = query.neq('id', excludeJobId)
  }

  const { data: weeklyJobs } = await query
  
  const currentWorkload = weeklyJobs?.reduce((total: number, job: any) => {
    return total + (job.duration_minutes / 60)
  }, 0) || 0

  // Calculate utilization score (0-100, lower is better)
  const utilizationScore = weeklyCapacity > 0 ? Math.min(100, (currentWorkload / weeklyCapacity) * 100) : 100

  // Determine efficiency rating
  let efficiencyRating: 'optimal' | 'good' | 'busy' | 'overloaded'
  if (utilizationScore <= 60) {
    efficiencyRating = 'optimal'
  } else if (utilizationScore <= 80) {
    efficiencyRating = 'good'
  } else if (utilizationScore <= 95) {
    efficiencyRating = 'busy'
  } else {
    efficiencyRating = 'overloaded'
  }

  // Check for conflicts in the search period
  const conflictQuery = supabase
    .from('jobs')
    .select('id, title, scheduled_at, duration_minutes')
    .eq('worker_id', worker.id)
    .neq('status', 'cancelled')
    .neq('status', 'completed')
    .gte('scheduled_at', searchStartDate.toISOString())
    .lte('scheduled_at', searchEndDate.toISOString())

  if (excludeJobId) {
    conflictQuery.neq('id', excludeJobId)
  }

  const { data: conflictingJobs } = await conflictQuery

  // Find available slots
  const availableSlots = await findAvailableSlots(
    supabase,
    worker.id,
    searchStartDate,
    searchEndDate,
    duration,
    excludeJobId
  )

  return {
    workerId: worker.id,
    workerName: worker.name,
    isAvailable: availableSlots.length > 0,
    currentWorkload,
    utilizationScore,
    weeklyCapacity,
    conflictingJobs: conflictingJobs?.map((job: any) => job.id) || [],
    availableSlots,
    efficiencyRating,
    nextAvailableSlot: availableSlots[0]
  }
}

async function generateSmartTimeSuggestions(
  supabase: any,
  workers: any[],
  searchStartDate: Date,
  searchEndDate: Date,
  duration: number,
  excludeJobId?: string
): Promise<TimeSuggestion[]> {
  const suggestions: TimeSuggestion[] = []
  const currentDate = new Date(searchStartDate)

  while (currentDate <= searchEndDate) {
    // Check morning (9 AM), afternoon (1 PM), and late afternoon (4 PM) slots
    const timeSlots = [
      { hour: 9, label: 'morning' as const },
      { hour: 13, label: 'afternoon' as const },
      { hour: 16, label: 'evening' as const }
    ]

    for (const timeSlot of timeSlots) {
      const slotDateTime = new Date(currentDate)
      slotDateTime.setHours(timeSlot.hour, 0, 0, 0)
      
      if (slotDateTime < new Date()) continue // Skip past times

      const availableWorkers: Array<{
        id: string
        name: string
        workload: number
        isOptimal: boolean
      }> = []

      let totalConflicts = 0

      // Check each worker for this time slot
      for (const worker of workers) {
        const isAvailable = await checkWorkerAvailability(
          supabase,
          worker.id,
          slotDateTime,
          addMinutes(slotDateTime, duration),
          excludeJobId
        )

        if (isAvailable.available) {
          // Get worker's current workload
          const workloadData = await getWorkerWorkload(supabase, worker.id, startOfWeek(slotDateTime))
          
          availableWorkers.push({
            id: worker.id,
            name: worker.name,
            workload: workloadData.currentWorkload,
            isOptimal: workloadData.utilizationScore <= 60
          })
        } else {
          totalConflicts++
        }
      }

      if (availableWorkers.length > 0) {
        // Calculate score based on availability and worker efficiency
        let score = (availableWorkers.length / workers.length) * 50 // Base availability score
        
        // Bonus for optimal workers
        const optimalWorkers = availableWorkers.filter(w => w.isOptimal).length
        score += (optimalWorkers / availableWorkers.length) * 30

        // Time of day bonus (morning gets highest score)
        if (timeSlot.label === 'morning') score += 20
        else if (timeSlot.label === 'afternoon') score += 10

        // Penalty for conflicts
        score -= (totalConflicts / workers.length) * 20

        const reason = generateTimeReason(availableWorkers.length, totalConflicts, workers.length, optimalWorkers)

        suggestions.push({
          dateTime: slotDateTime.toISOString(),
          score: Math.max(0, Math.min(100, score)),
          reason,
          availableWorkers,
          conflicts: totalConflicts,
          dayOfWeek: format(slotDateTime, 'EEEE'),
          timeOfDay: timeSlot.label
        })
      }
    }

    currentDate.setDate(currentDate.getDate() + 1)
  }

  return suggestions.sort((a, b) => b.score - a.score)
}

async function generateDayAnalysis(
  supabase: any,
  workers: any[],
  searchStartDate: Date,
  searchEndDate: Date,
  duration: number,
  excludeJobId?: string
): Promise<DayAnalysis[]> {
  const analysis: DayAnalysis[] = []
  const currentDate = new Date(searchStartDate)

  while (currentDate <= searchEndDate) {
    const dayStart = new Date(currentDate)
    dayStart.setHours(8, 0, 0, 0)
    const dayEnd = new Date(currentDate)
    dayEnd.setHours(18, 0, 0, 0)

    let availableWorkers = 0
    let totalSlots = 0
    let availableSlots = 0
    const bestTimes: string[] = []

    // Check hourly slots throughout the day
    for (let hour = 8; hour <= 17; hour++) {
      const slotTime = new Date(currentDate)
      slotTime.setHours(hour, 0, 0, 0)
      totalSlots++

      let slotAvailableWorkers = 0
      for (const worker of workers) {
        const isAvailable = await checkWorkerAvailability(
          supabase,
          worker.id,
          slotTime,
          addMinutes(slotTime, duration),
          excludeJobId
        )

        if (isAvailable.available) {
          slotAvailableWorkers++
        }
      }

      if (slotAvailableWorkers > 0) {
        availableSlots++
        if (slotAvailableWorkers >= workers.length * 0.7) {
          bestTimes.push(format(slotTime, 'h:mm a'))
        }
      }

      availableWorkers = Math.max(availableWorkers, slotAvailableWorkers)
    }

    analysis.push({
      date: format(currentDate, 'yyyy-MM-dd'),
      dayName: format(currentDate, 'EEEE'),
      availableWorkers,
      totalSlots,
      availableSlots,
      bestTimes,
      hasFullDayAvailability: availableSlots >= totalSlots * 0.8
    })

    currentDate.setDate(currentDate.getDate() + 1)
  }

  return analysis
}

function generateOptimalCombinations(
  workerSuggestions: WorkerSuggestion[],
  timeSuggestions: TimeSuggestion[]
): Array<{ worker: WorkerSuggestion; time: TimeSuggestion; score: number; reason: string }> {
  const combinations: Array<{ worker: WorkerSuggestion; time: TimeSuggestion; score: number; reason: string }> = []

  for (const worker of workerSuggestions.filter(w => w.isAvailable)) {
    for (const time of timeSuggestions) {
      const workerInTimeSlot = time.availableWorkers.find(w => w.id === worker.workerId)
      
      if (workerInTimeSlot) {
        // Calculate combination score
        let score = time.score * 0.6 // Time slot quality
        score += (100 - worker.utilizationScore) * 0.4 // Worker efficiency
        
        // Bonus for optimal workers
        if (worker.efficiencyRating === 'optimal') score += 10
        
        const reason = `${worker.workerName} (${worker.efficiencyRating} efficiency) at ${format(parseISO(time.dateTime), 'EEE MMM d, h:mm a')}`
        
        combinations.push({
          worker,
          time,
          score,
          reason
        })
      }
    }
  }

  return combinations.sort((a, b) => b.score - a.score)
}

function generateSmartRecommendations(
  workerSuggestions: WorkerSuggestion[],
  dayAnalysis: DayAnalysis[],
  timeSuggestions: TimeSuggestion[]
): string[] {
  const recommendations: string[] = []

  // Check overall availability
  const availableWorkers = workerSuggestions.filter(w => w.isAvailable)
  const optimalWorkers = workerSuggestions.filter(w => w.efficiencyRating === 'optimal')

  if (availableWorkers.length === 0) {
    recommendations.push("❌ No workers available in the selected time period. Consider:")
    recommendations.push("   • Extending the search period")
    recommendations.push("   • Reducing job duration")
    recommendations.push("   • Checking worker availability settings")
    return recommendations
  }

  // Best workers recommendation
  if (optimalWorkers.length > 0) {
    recommendations.push(`⭐ ${optimalWorkers.length} worker(s) have optimal availability: ${optimalWorkers.map(w => w.workerName).join(', ')}`)
  }

  // Best days recommendation
  const daysWithGoodAvailability = dayAnalysis.filter(d => d.hasFullDayAvailability)
  if (daysWithGoodAvailability.length > 0) {
    recommendations.push(`📅 Best days: ${daysWithGoodAvailability.map(d => d.dayName).slice(0, 3).join(', ')}`)
  }

  // Best times recommendation
  const morningSlots = timeSuggestions.filter(t => t.timeOfDay === 'morning').slice(0, 2)
  if (morningSlots.length > 0) {
    recommendations.push(`🌅 Morning slots generally have better availability`)
  }

  // Workload balancing recommendation
  const busyWorkers = workerSuggestions.filter(w => w.efficiencyRating === 'busy' || w.efficiencyRating === 'overloaded')
  if (busyWorkers.length > 0 && optimalWorkers.length > 0) {
    recommendations.push(`⚖️ Consider assigning to ${optimalWorkers[0].workerName} to balance workload`)
  }

  return recommendations
}

// Helper functions
async function checkWorkerAvailability(
  supabase: any,
  workerId: string,
  startTime: Date,
  endTime: Date,
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

    weeklyAvailability?.forEach((slot: any) => {
      // Check if proposed time is within this slot
      if (
        proposedTimeOnly >= slot.start_time &&
        proposedEndTimeOnly <= slot.end_time
      ) {
        isWithinAvailableHours = true
      }
    })

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
    console.error('Error in checkWorkerAvailability:', error)
    return { available: false, reason: 'Error checking availability' }
  }
}

async function getWorkerWorkload(supabase: any, workerId: string, weekStart: Date) {
  // Calculate worker's current workload for the week
  const weekEnd = endOfWeek(weekStart)
  
  const { data: jobs } = await supabase
    .from('jobs')
    .select('duration_minutes')
    .eq('worker_id', workerId)
    .neq('status', 'cancelled')
    .gte('scheduled_at', weekStart.toISOString())
    .lte('scheduled_at', weekEnd.toISOString())

  const currentWorkload = jobs?.reduce((total: number, job: any) => {
    return total + (job.duration_minutes / 60)
  }, 0) || 0

  return currentWorkload
}

async function findAvailableSlots(
  supabase: any,
  workerId: string,
  searchStartDate: Date,
  searchEndDate: Date,
  duration: number,
  excludeJobId?: string
): Promise<TimeSlot[]> {
  // This would implement the logic to find all available time slots for a worker
  // For now, return a simplified version
  return []
}

function generateTimeReason(availableWorkers: number, conflicts: number, totalWorkers: number, optimalWorkers: number): string {
  if (availableWorkers === totalWorkers) {
    return `All workers available${optimalWorkers > 0 ? ` (${optimalWorkers} optimal)` : ''}`
  } else if (availableWorkers >= totalWorkers * 0.7) {
    return `Good availability: ${availableWorkers}/${totalWorkers} workers${optimalWorkers > 0 ? ` (${optimalWorkers} optimal)` : ''}`
  } else if (availableWorkers > 0) {
    return `Limited availability: ${availableWorkers}/${totalWorkers} workers${optimalWorkers > 0 ? ` (${optimalWorkers} optimal)` : ''}`
  } else {
    return `No workers available${conflicts > 0 ? ` (${conflicts} conflicts)` : ''}`
  }
} 