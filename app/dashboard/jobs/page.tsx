'use client'

import { useState } from 'react'
import { Plus, BarChart3, Calendar, Clock } from 'lucide-react'
import { StatsRibbon } from '@/components/dashboard/StatsRibbon'
import { JobsPanel } from '@/components/jobs-panel'
import { TimelineScheduler } from '@/components/jobs/TimelineScheduler'
import { Button } from '@/components/ui/button'
import { useJobs } from '@/hooks/use-jobs'
import { useWorkers } from '@/hooks/use-workers'
import { generateDemoTimelineData } from '@/lib/demo-data'
import type { Job as TimelineJob, Worker as TimelineWorker } from '@/components/jobs/TimelineScheduler'

export default function JobsPage() {
  const { jobs, loading, error, refresh } = useJobs()
  const { workers, loading: workersLoading } = useWorkers()
  const [selectedView, setSelectedView] = useState('timeline')
  const [selectedDate, setSelectedDate] = useState(new Date())
  const [viewMode, setViewMode] = useState<'day' | 'week'>('week')

  // Use demo data or transform real data for timeline scheduler
  const demoData = generateDemoTimelineData(selectedDate)
  
  const timelineJobs: TimelineJob[] = jobs && jobs.length > 0 
    ? jobs.map(job => ({
        id: job.id,
        title: job.title,
        description: job.description,
        client_name: job.client_name,
        worker_id: job.worker_id,
        worker_name: job.worker_name,
        scheduled_at: job.scheduled_at,
        duration_hours: 2, // Default 2 hours - TODO: get from database
        status: job.status === 'rescheduled' ? 'scheduled' : job.status,
        priority: 'medium' as const, // Default priority - TODO: get from database
        location: job.location,
      }))
    : demoData.jobs

  const timelineWorkers: TimelineWorker[] = workers && workers.length > 0
    ? workers.map(worker => ({
        id: worker.id,
        name: worker.name,
        role: worker.role,
        status: worker.status === 'active' ? 'available' as const : 'offline' as const,
        utilization: worker.utilization,
      }))
    : demoData.workers

  const handleCreateJob = () => {
    // TODO: Open job creation modal
    console.log('Create new job')
  }

  const handleJobUpdate = (jobId: string, updates: Partial<any>) => {
    // TODO: Implement job update logic
    console.log('Update job:', jobId, updates)
    refresh()
  }

  const handleJobMove = (jobId: string, newWorkerId: string | null, newTime: Date) => {
    // TODO: Implement job move logic
    console.log('Move job:', jobId, 'to worker:', newWorkerId, 'at time:', newTime)
    refresh()
  }

  if (loading || workersLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-lg">Loading...</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[60vh] text-red-500">
        <div className="text-lg">Error loading jobs: {error.message}</div>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full mobile-container">
      {/* Header */}
      <div className="mb-3 sm:mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div className="mb-2 sm:mb-0">
          <h1 className="text-lg sm:text-xl md:text-2xl font-bold text-gray-900">Jobs</h1>
          <div className="text-xs text-gray-500 mt-1">
            <span>Jobs › All Jobs</span>
          </div>
        </div>
        <div className="flex items-center space-x-2 sm:space-x-4">
          <Button variant="outline" size="sm" className="text-xs h-8 sm:h-9">
            <BarChart3 className="h-3 w-3 mr-1 sm:mr-2" />
            <span className="hidden xs:inline">Reports</span>
            <span className="xs:hidden">📊</span>
          </Button>
          <Button onClick={handleCreateJob} size="sm" className="text-xs h-8 sm:h-9">
            <Plus className="h-3 w-3 mr-1 sm:mr-2" />
            <span className="hidden xs:inline">New Job</span>
            <span className="xs:hidden">New</span>
          </Button>
        </div>
      </div>
      
      {/* Stats Ribbon */}
      <StatsRibbon />
      
      {/* View Selection */}
      <div className="mb-4 sm:mb-6 border-b border-gray-200">
        <div className="mobile-scroll-x pb-1 -mx-4 px-4 sm:mx-0 sm:px-0">
          <div className="flex space-x-3 sm:space-x-6 md:space-x-8">
            {[
              { id: 'timeline', label: 'Timeline Scheduler', icon: Clock },
              { id: 'table', label: 'Table View', icon: '📋' },
              { id: 'board', label: 'Board View', icon: '📌' },
              { id: 'calendar', label: 'Calendar View', icon: Calendar },
            ].map((view) => (
              <button
                key={view.id}
                className={`py-3 border-b-2 font-medium text-xs flex items-center gap-1 sm:gap-2 whitespace-nowrap flex-shrink-0 ${
                  selectedView === view.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
                onClick={() => setSelectedView(view.id)}
              >
                {typeof view.icon === 'string' ? (
                  <span className="text-sm">{view.icon}</span>
                ) : (
                  <view.icon className="h-3 w-3 sm:h-4 sm:w-4" />
                )}
                <span className="mobile-text">{view.label.split(' ')[0]}</span>
                <span className="hidden sm:inline">{view.label.split(' ').slice(1).join(' ')}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
      
      {/* Main Content */}
      <div className="flex-1 overflow-hidden">
        {selectedView === 'timeline' && (
          <TimelineScheduler
            jobs={timelineJobs}
            workers={timelineWorkers}
            selectedDate={selectedDate}
            viewMode={viewMode}
            onDateChange={setSelectedDate}
            onViewModeChange={setViewMode}
            onJobUpdate={handleJobUpdate}
            onJobMove={handleJobMove}
          />
        )}
        
        {selectedView === 'table' && (
          <JobsPanel jobs={jobs || []} refreshJobs={refresh} />
        )}
        
        {selectedView === 'board' && (
          <div className="text-center py-12 text-gray-500">
            Board view coming soon...
          </div>
        )}
        
        {selectedView === 'calendar' && (
          <div className="text-center py-12 text-gray-500">
            Calendar view coming soon...
          </div>
        )}
      </div>
    </div>
  )
}