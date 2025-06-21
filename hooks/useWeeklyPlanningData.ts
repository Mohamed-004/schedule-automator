import { useState, useEffect, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import { startOfWeek, endOfWeek, addDays, format } from 'date-fns'

export interface WeeklyWorkerData {
  id: string
  name: string
  email: string
  role: string
  status: 'active' | 'inactive'
  weeklyAvailability: WeeklyAvailabilitySlot[]
  weeklyJobs: WeeklyJob[]
  weeklyStats: {
    totalAvailableHours: number
    totalScheduledHours: number
    utilization: number
    efficiency: 'high' | 'medium' | 'low'
  }
  aiRecommendations: AIRecommendation[]
}

export interface WeeklyAvailabilitySlot {
  dayOfWeek: number // 0-6 (Sunday-Saturday)
  startTime: string
  endTime: string
  isAvailable: boolean
  duration: number // in minutes
}

export interface WeeklyJob {
  id: string
  title: string
  clientName: string
  scheduledAt: Date
  duration: number // in minutes
  status: 'scheduled' | 'in_progress' | 'completed' | 'cancelled'
  dayOfWeek: number
  priority: 'normal' | 'high' | 'emergency'
}

export interface AIRecommendation {
  id: string
  type: 'workload_balance' | 'optimal_scheduling' | 'efficiency_boost'
  title: string
  description: string
  confidence: number // 0-100
  suggestedAction: string
  workerId?: string
  jobId?: string
}

export interface WeeklyPlanningData {
  workers: WeeklyWorkerData[]
  weekRange: {
    startDate: Date
    endDate: Date
    weekDays: Date[]
  }
  loading: boolean
  error: string | null
  aiRecommendations: AIRecommendation[]
}

/**
 * Custom hook for managing weekly planning data
 * Fetches worker availability, jobs, and generates AI recommendations
 */
export function useWeeklyPlanningData(selectedWeek: Date) {
  const [data, setData] = useState<WeeklyPlanningData>({
    workers: [],
    weekRange: {
      startDate: new Date(),
      endDate: new Date(),
      weekDays: []
    },
    loading: true,
    error: null,
    aiRecommendations: []
  })

  const supabase = createClient()

  // Calculate week range
  const weekRange = useMemo(() => {
    const startDate = startOfWeek(selectedWeek, { weekStartsOn: 0 }) // Sunday
    const endDate = endOfWeek(selectedWeek, { weekStartsOn: 0 }) // Saturday
    const weekDays = Array.from({ length: 7 }, (_, i) => addDays(startDate, i))
    
    return { startDate, endDate, weekDays }
  }, [selectedWeek])

  // Fetch workers and their data
  useEffect(() => {
    async function fetchWeeklyData() {
      try {
        setData(prev => ({ ...prev, loading: true, error: null }))

        // Fetch workers
        const { data: workers, error: workersError } = await supabase
          .from('workers')
          .select('*')
          .eq('status', 'active')

        if (workersError) throw workersError

        // Fetch weekly availability for all workers
        const { data: availability, error: availabilityError } = await supabase
          .from('worker_weekly_availability')
          .select('*')
          .in('worker_id', workers.map(w => w.id))

        if (availabilityError) throw availabilityError

        // Fetch jobs for the week
        const { data: jobs, error: jobsError } = await supabase
          .from('jobs')
          .select(`
            *,
            clients!inner(name)
          `)
          .gte('scheduled_at', weekRange.startDate.toISOString())
          .lte('scheduled_at', weekRange.endDate.toISOString())
          .neq('status', 'cancelled')

        if (jobsError) throw jobsError

        // Process data for each worker
        const processedWorkers: WeeklyWorkerData[] = workers.map(worker => {
          // Get worker's weekly availability
          const workerAvailability = availability
            .filter(a => a.worker_id === worker.id)
            .map(a => ({
              dayOfWeek: a.day_of_week,
              startTime: a.start_time,
              endTime: a.end_time,
              isAvailable: true,
              duration: calculateDuration(a.start_time, a.end_time)
            }))

          // Get worker's jobs for the week
          const workerJobs = jobs
            .filter(j => j.worker_id === worker.id)
            .map(j => ({
              id: j.id,
              title: j.title,
              clientName: j.clients?.name || 'Unknown Client',
              scheduledAt: new Date(j.scheduled_at),
              duration: j.duration_minutes,
              status: j.status,
              dayOfWeek: new Date(j.scheduled_at).getDay(),
              priority: j.priority
            }))

          // Calculate weekly stats
          const totalAvailableHours = workerAvailability.reduce((sum, slot) => sum + (slot.duration / 60), 0)
          const totalScheduledHours = workerJobs.reduce((sum, job) => sum + (job.duration / 60), 0)
          const utilization = totalAvailableHours > 0 ? Math.round((totalScheduledHours / totalAvailableHours) * 100) : 0
          
          let efficiency: 'high' | 'medium' | 'low' = 'low'
          if (utilization >= 70) efficiency = 'high'
          else if (utilization >= 40) efficiency = 'medium'

          return {
            id: worker.id,
            name: worker.name,
            email: worker.email,
            role: worker.role,
            status: worker.status,
            weeklyAvailability: workerAvailability,
            weeklyJobs: workerJobs,
            weeklyStats: {
              totalAvailableHours,
              totalScheduledHours,
              utilization,
              efficiency
            },
            aiRecommendations: generateWorkerRecommendations(worker, workerJobs, workerAvailability, utilization)
          }
        })

        // Generate global AI recommendations
        const globalRecommendations = generateGlobalRecommendations(processedWorkers)

        setData({
          workers: processedWorkers,
          weekRange,
          loading: false,
          error: null,
          aiRecommendations: globalRecommendations
        })

      } catch (error) {
        console.error('Error fetching weekly planning data:', error)
        setData(prev => ({
          ...prev,
          loading: false,
          error: error instanceof Error ? error.message : 'Failed to load weekly planning data'
        }))
      }
    }

    fetchWeeklyData()
  }, [selectedWeek, weekRange.startDate, weekRange.endDate])

  return data
}

/**
 * Calculate duration between two time strings in minutes
 */
function calculateDuration(startTime: string, endTime: string): number {
  const start = new Date(`2000-01-01T${startTime}`)
  const end = new Date(`2000-01-01T${endTime}`)
  return (end.getTime() - start.getTime()) / (1000 * 60)
}

/**
 * Generate AI recommendations for individual workers
 */
function generateWorkerRecommendations(
  worker: any,
  jobs: WeeklyJob[],
  availability: WeeklyAvailabilitySlot[],
  utilization: number
): AIRecommendation[] {
  const recommendations: AIRecommendation[] = []

  // Low utilization recommendation
  if (utilization < 40) {
    recommendations.push({
      id: `low-util-${worker.id}`,
      type: 'efficiency_boost',
      title: 'Low Utilization Detected',
      description: `${worker.name} has ${utilization}% utilization this week. Consider assigning more jobs.`,
      confidence: 85,
      suggestedAction: 'Assign additional jobs during available time slots',
      workerId: worker.id
    })
  }

  // High utilization warning
  if (utilization > 90) {
    recommendations.push({
      id: `high-util-${worker.id}`,
      type: 'workload_balance',
      title: 'High Workload Warning',
      description: `${worker.name} is at ${utilization}% capacity. Consider redistributing some jobs.`,
      confidence: 90,
      suggestedAction: 'Move some jobs to less busy workers',
      workerId: worker.id
    })
  }

  // Optimal scheduling suggestion
  const hasGaps = checkForSchedulingGaps(jobs, availability)
  if (hasGaps) {
    recommendations.push({
      id: `gaps-${worker.id}`,
      type: 'optimal_scheduling',
      title: 'Schedule Optimization Available',
      description: `${worker.name}'s schedule has gaps that could be optimized for better efficiency.`,
      confidence: 75,
      suggestedAction: 'Consolidate jobs to reduce travel time and gaps',
      workerId: worker.id
    })
  }

  return recommendations
}

/**
 * Generate global AI recommendations for the entire team
 */
function generateGlobalRecommendations(workers: WeeklyWorkerData[]): AIRecommendation[] {
  const recommendations: AIRecommendation[] = []

  // Workload imbalance detection
  const utilizationRates = workers.map(w => w.weeklyStats.utilization)
  const avgUtilization = utilizationRates.reduce((sum, rate) => sum + rate, 0) / utilizationRates.length
  const utilizationVariance = Math.max(...utilizationRates) - Math.min(...utilizationRates)

  if (utilizationVariance > 40) {
    recommendations.push({
      id: 'workload-imbalance',
      type: 'workload_balance',
      title: 'Workload Imbalance Detected',
      description: `Utilization varies by ${utilizationVariance}% across the team. Consider redistributing jobs.`,
      confidence: 80,
      suggestedAction: 'Balance workload between overloaded and underutilized workers'
    })
  }

  // Team efficiency recommendation
  if (avgUtilization < 50) {
    recommendations.push({
      id: 'team-efficiency',
      type: 'efficiency_boost',
      title: 'Team Capacity Available',
      description: `Team average utilization is ${Math.round(avgUtilization)}%. There's capacity for more jobs.`,
      confidence: 85,
      suggestedAction: 'Consider taking on additional clients or expanding service offerings'
    })
  }

  return recommendations
}

/**
 * Check if a worker's schedule has inefficient gaps
 */
function checkForSchedulingGaps(jobs: WeeklyJob[], availability: WeeklyAvailabilitySlot[]): boolean {
  // Simple gap detection logic - can be enhanced
  for (let day = 0; day < 7; day++) {
    const dayJobs = jobs.filter(j => j.dayOfWeek === day).sort((a, b) => a.scheduledAt.getTime() - b.scheduledAt.getTime())
    
    if (dayJobs.length > 1) {
      for (let i = 0; i < dayJobs.length - 1; i++) {
        const currentJobEnd = new Date(dayJobs[i].scheduledAt.getTime() + dayJobs[i].duration * 60000)
        const nextJobStart = dayJobs[i + 1].scheduledAt
        const gapMinutes = (nextJobStart.getTime() - currentJobEnd.getTime()) / (1000 * 60)
        
        // If there's a gap of more than 2 hours, suggest optimization
        if (gapMinutes > 120) {
          return true
        }
      }
    }
  }
  
  return false
} 