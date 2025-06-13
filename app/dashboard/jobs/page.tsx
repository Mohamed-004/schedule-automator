'use client'

import { useState, useCallback } from 'react'
import { Plus, BarChart3, Calendar, Clock } from 'lucide-react'
import { StatsRibbon } from '@/components/dashboard/StatsRibbon'
import { JobsPanel } from '@/components/jobs-panel'
import { TimelineSchedulerGrid } from '@/components/jobs/TimelineSchedulerGrid'
import { JobCreateModal } from '@/components/timeline/JobCreateModal'
import { Button } from '@/components/ui/button'
import { useJobs } from '@/hooks/use-jobs'
import { useWorkers } from '@/hooks/use-workers'
import { generateDemoTimelineData } from '@/lib/demo-data'
import { toast } from 'sonner'

// Transform database job to grid timeline format
const transformJobForGrid = (job: any) => ({
  id: job.id,
  title: job.title,
  description: job.description,
  client_name: job.client_name,
  worker_id: job.worker_id,
  worker_name: job.worker?.name || job.worker_name,
  scheduled_at: job.scheduled_at,
  duration_hours: job.duration_minutes ? job.duration_minutes / 60 : 2, // Convert minutes to hours
  duration: job.duration_minutes || 120, // Duration in minutes for grid system
  status: job.status === 'rescheduled' ? 'scheduled' : job.status,
  priority: job.priority === 'emergency' ? 'high' as const : 
           job.priority === 'high' ? 'high' as const : 
           job.priority === 'normal' ? 'medium' as const : 'low' as const,
  location: job.location,
  address: job.address,
  notes: job.notes
})

// Transform database worker to grid timeline format
const transformWorkerForGrid = (worker: any) => ({
  id: worker.id,
  name: worker.name,
  email: worker.email,
  phone: worker.phone,
  role: worker.role,
  status: worker.status === 'active' ? 'available' as const : 'offline' as const,
  working_hours: worker.working_hours || [
    { start: '09:00', end: '17:00', day: 1 }, // Monday
    { start: '09:00', end: '17:00', day: 2 }, // Tuesday
    { start: '09:00', end: '17:00', day: 3 }, // Wednesday
    { start: '09:00', end: '17:00', day: 4 }, // Thursday
    { start: '09:00', end: '17:00', day: 5 }  // Friday
  ],
  utilization: worker.utilization,
  skills: worker.skills || []
})

export default function JobsPage() {
  const { jobs, loading, error, refresh, updateJob, addJob } = useJobs()
  const { workers, loading: workersLoading } = useWorkers()
  const [selectedView, setSelectedView] = useState('timeline')
  const [selectedDate, setSelectedDate] = useState(new Date())
  const [viewMode, setViewMode] = useState<'day' | 'week'>('day')
  const [showCreateModal, setShowCreateModal] = useState(false)

  // Transform real data for grid timeline or use demo data
  const timelineJobs = jobs && jobs.length > 0 
    ? jobs.map(transformJobForGrid)
    : generateDemoTimelineData(selectedDate).jobs.map(job => ({
        ...job,
        duration: job.duration || 120 // Ensure duration is always a number
      }))

  const timelineWorkers = workers && workers.length > 0
    ? workers.map(transformWorkerForGrid)
          : generateDemoTimelineData(selectedDate).workers

  const handleCreateJob = () => {
    setShowCreateModal(true)
  }

  const handleJobUpdate = useCallback(async (jobId: string, updates: any) => {
    try {
      // Transform grid updates back to database format
      const dbUpdates: any = {}
      
      if (updates.title) dbUpdates.title = updates.title
      if (updates.description) dbUpdates.description = updates.description
      if (updates.client_name) dbUpdates.client_name = updates.client_name
      if (updates.location) dbUpdates.location = updates.location
      if (updates.notes) dbUpdates.notes = updates.notes
      if (updates.worker_id) dbUpdates.worker_id = updates.worker_id
      
      // Transform status back to database format
      if (updates.status) {
        dbUpdates.status = updates.status === 'pending' ? 'scheduled' : updates.status
      }
      
      // Transform priority back to database format
      if (updates.priority) {
        dbUpdates.priority = updates.priority === 'urgent' ? 'emergency' :
                           updates.priority === 'high' ? 'high' : 'normal'
      }
      
      // Transform duration back to minutes
      if (updates.duration) {
        dbUpdates.duration_minutes = updates.duration
      }
      
      // Transform scheduled time
      if (updates.scheduled_at) {
        dbUpdates.scheduled_at = updates.scheduled_at
      }

      const result = await updateJob(jobId, dbUpdates)
      
      if (result) {
        toast.success('Job updated successfully!')
        refresh()
      } else {
        toast.error('Failed to update job')
      }
    } catch (error) {
      console.error('Error updating job:', error)
      toast.error('Failed to update job')
    }
  }, [updateJob, refresh])

  const handleJobMove = useCallback(async (jobId: string, newWorkerId: string | null, newTime: Date) => {
    try {
      const updates: any = {
        scheduled_at: newTime.toISOString()
      }
      
      if (newWorkerId) {
        updates.worker_id = newWorkerId
      }

      const result = await updateJob(jobId, updates)
      
      if (result) {
        toast.success('Job moved successfully!')
        refresh()
      } else {
        toast.error('Failed to move job')
      }
    } catch (error) {
      console.error('Error moving job:', error)
      toast.error('Failed to move job')
    }
  }, [updateJob, refresh])

  const handleCreateJobFromGrid = useCallback(async (jobData: any) => {
    try {
      // Transform grid job data to database format
      const dbJob = {
        title: jobData.title,
        description: jobData.description || '',
        client_name: jobData.client_name,
        worker_id: jobData.worker_id,
        scheduled_at: jobData.scheduled_at,
        duration_minutes: jobData.duration || 120,
        status: 'scheduled' as const,
        priority: jobData.priority === 'urgent' ? 'emergency' as const :
                 jobData.priority === 'high' ? 'high' as const : 'normal' as const,
        location: jobData.location || '',
        business_id: '', // Will be set by the API
        client_id: '', // Will need to be resolved or created
        completed_at: null, // Required field
      }

      const result = await addJob(dbJob)
      
      if (result) {
        toast.success('Job created successfully!')
        refresh()
      } else {
        toast.error('Failed to create job')
      }
    } catch (error) {
      console.error('Error creating job:', error)
      toast.error('Failed to create job')
    }
  }, [addJob, refresh])

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
            <span>Jobs › Timeline Scheduler</span>
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
              { id: 'timeline', label: 'Grid Timeline', icon: Clock },
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
          <TimelineSchedulerGrid
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
            <div className="mb-4">
              <h3 className="text-lg font-medium text-gray-900">Board View</h3>
              <p className="text-sm text-gray-600">Kanban-style job management coming soon</p>
            </div>
            <Button variant="outline" onClick={() => setSelectedView('timeline')}>
              Use Grid Timeline Instead
            </Button>
          </div>
        )}
        
        {selectedView === 'calendar' && (
          <div className="text-center py-12 text-gray-500">
            <div className="mb-4">
              <h3 className="text-lg font-medium text-gray-900">Calendar View</h3>
              <p className="text-sm text-gray-600">Monthly calendar view coming soon</p>
            </div>
            <Button variant="outline" onClick={() => setSelectedView('timeline')}>
              Use Grid Timeline Instead
            </Button>
          </div>
        )}
      </div>

      {/* Job Creation Modal */}
      <JobCreateModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onCreateJob={handleCreateJobFromGrid}
        workers={timelineWorkers}
        selectedDate={selectedDate}
      />
    </div>
  )
}