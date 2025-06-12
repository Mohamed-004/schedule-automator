import { Job as KanbanJob } from './JobCard'

/**
 * Transform any job data to Kanban job format with enhanced properties
 */
export function transformJobForKanban(job: any): KanbanJob {
  // Calculate duration in hours from minutes
  const durationHours = job.duration_minutes ? Math.round(job.duration_minutes / 60 * 10) / 10 : 
                        job.duration_hours ? job.duration_hours : undefined

  // Map database status to kanban status
  const statusMap: Record<string, KanbanJob['status']> = {
    'scheduled': 'scheduled',
    'in_progress': 'in_progress', 
    'completed': 'completed',
    'cancelled': 'cancelled',
    'rescheduled': 'reschedule_pending',
  }

  // Map priority levels
  const priorityMap: Record<string, KanbanJob['priority']> = {
    'normal': 'medium',
    'high': 'high',
    'emergency': 'urgent',
    'low': 'low',
    'medium': 'medium',
    'urgent': 'urgent',
  }

  return {
    id: job.id,
    title: job.title,
    description: job.description || undefined,
    client_name: job.client_name,
    worker_name: job.worker_name,
    worker: job.worker ? { name: job.worker.name } : null,
    scheduled_at: job.scheduled_at || job.start_time || new Date().toISOString(),
    location: job.location,
    status: statusMap[job.status] || 'scheduled',
    priority: priorityMap[job.priority || 'normal'] || 'medium',
    duration_hours: durationHours,
  }
}

/**
 * Generate sample priority and duration for existing jobs that might be missing these fields
 */
export function enrichJobData(job: KanbanJob): KanbanJob {
  // If priority is missing, assign based on title keywords
  if (!job.priority) {
    const title = job.title.toLowerCase()
    if (title.includes('emergency') || title.includes('urgent')) {
      job.priority = 'urgent'
    } else if (title.includes('priority') || title.includes('important')) {
      job.priority = 'high'
    } else {
      job.priority = 'medium'
    }
  }

  // If duration is missing, estimate based on job type
  if (!job.duration_hours) {
    const title = job.title.toLowerCase()
    if (title.includes('inspection') || title.includes('quote')) {
      job.duration_hours = 1
    } else if (title.includes('installation') || title.includes('repair')) {
      job.duration_hours = 3
    } else if (title.includes('maintenance')) {
      job.duration_hours = 2
    } else {
      job.duration_hours = 1.5
    }
  }

  return job
}

/**
 * Sort jobs within a column by priority and date
 */
export function sortJobsInColumn(jobs: KanbanJob[]): KanbanJob[] {
  const priorityOrder = { urgent: 4, high: 3, medium: 2, low: 1 }
  
  return [...jobs].sort((a, b) => {
    // First by priority
    const priorityDiff = (priorityOrder[b.priority || 'medium'] || 2) - (priorityOrder[a.priority || 'medium'] || 2)
    if (priorityDiff !== 0) return priorityDiff
    
    // Then by date
    return new Date(a.scheduled_at).getTime() - new Date(b.scheduled_at).getTime()
  })
} 