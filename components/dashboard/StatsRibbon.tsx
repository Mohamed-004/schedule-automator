'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Clock, AlertTriangle, CheckCircle, Calendar, RotateCcw } from 'lucide-react'

interface JobStats {
  total_jobs: number
  upcoming_today: number
  in_progress: number
  overdue: number
  pending_reschedule: number
}

export function StatsRibbon() {
  const [stats, setStats] = useState<JobStats>({
    total_jobs: 0,
    upcoming_today: 0,
    in_progress: 0,
    overdue: 0,
    pending_reschedule: 0
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const supabase = createClient()
    
    const fetchStats = async () => {
      try {
        // Get job counts by status
        const { data: jobs, error } = await supabase
          .from('jobs')
          .select('status, scheduled_at')
        
        if (error) throw error

        const today = new Date()
        today.setHours(0, 0, 0, 0)
        const tomorrow = new Date(today)
        tomorrow.setDate(tomorrow.getDate() + 1)

        const newStats: JobStats = {
          total_jobs: jobs.length,
          upcoming_today: jobs.filter(job => {
            if (!job.scheduled_at) return false
            const jobDate = new Date(job.scheduled_at)
            return jobDate >= today && jobDate < tomorrow && job.status === 'scheduled'
          }).length,
          in_progress: jobs.filter(job => job.status === 'in_progress').length,
          overdue: jobs.filter(job => {
            if (!job.scheduled_at) return false
            const jobDate = new Date(job.scheduled_at)
            return jobDate < today && job.status === 'scheduled'
          }).length,
          pending_reschedule: jobs.filter(job => job.status === 'rescheduled').length,
        }
        
        setStats(newStats)
      } catch (error) {
        console.error('Error fetching job stats:', error)
      } finally {
        setLoading(false)
      }
    }
    
    fetchStats()
    
    // Set up real-time subscription
    const channel = supabase
      .channel('job_stats_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'jobs' }, () => {
        fetchStats()
      })
      .subscribe()
      
    return () => {
      supabase.removeChannel(channel)
    }
  }, [])
  
  const statItems = [
    { 
      label: 'Total Jobs', 
      value: stats.total_jobs, 
      color: 'bg-blue-50 text-blue-700 border-blue-200',
      icon: Calendar
    },
    { 
      label: 'Upcoming Today', 
      value: stats.upcoming_today, 
      color: 'bg-green-50 text-green-700 border-green-200',
      icon: Clock
    },
    { 
      label: 'In Progress', 
      value: stats.in_progress, 
      color: 'bg-yellow-50 text-yellow-700 border-yellow-200',
      icon: CheckCircle
    },
    { 
      label: 'Overdue', 
      value: stats.overdue, 
      color: 'bg-red-50 text-red-700 border-red-200',
      icon: AlertTriangle
    },
    { 
      label: 'Pending Reschedule', 
      value: stats.pending_reschedule, 
      color: 'bg-purple-50 text-purple-700 border-purple-200',
      icon: RotateCcw
    },
  ]

  if (loading) {
    return (
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-5 mb-6">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="bg-gray-100 animate-pulse rounded-lg p-4 h-20" />
        ))}
      </div>
    )
  }
  
  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-5 mb-6">
      {statItems.map((stat, index) => (
        <div key={index} className={`${stat.color} border rounded-lg p-4 text-center`}>
          <div className="flex items-center justify-center mb-2">
            <stat.icon className="h-5 w-5" />
          </div>
          <div className="text-2xl font-bold">{stat.value}</div>
          <div className="text-sm font-medium">{stat.label}</div>
        </div>
      ))}
    </div>
  )
} 