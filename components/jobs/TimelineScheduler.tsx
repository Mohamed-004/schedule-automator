'use client'

import React, { useState, useMemo, useCallback } from 'react'
import { format, startOfDay, addHours, isSameDay, parseISO, differenceInMinutes } from 'date-fns'
import { motion, AnimatePresence } from 'framer-motion'
import { Clock, MapPin, User, AlertTriangle, Calendar, Filter, X, CalendarClock } from 'lucide-react'
import { cn } from '@/lib/utils'
import { JobCard } from './JobCard'
import { WeekTimelineHeader } from './WeekTimelineHeader'
import { WeekWorkerLane } from './WeekWorkerLane'
import { TimeAxis } from './TimeAxis'
import { WorkerRow } from './WorkerRow'
import { DateRangePicker } from './DateRangePicker'

export interface Job {
  id: string
  title: string
  description?: string
  client_name: string
  worker_id?: string
  worker_name?: string
  scheduled_at: string
  duration_hours: number
  status: 'scheduled' | 'in_progress' | 'completed' | 'cancelled' | 'overdue'
  priority: 'low' | 'medium' | 'high' | 'urgent'
  location?: string
  color?: string
}

export interface Worker {
  id: string
  name: string
  avatar?: string
  role: string
  skills?: string[]
  status: 'available' | 'busy' | 'offline'
  working_hours?: {
    start: string // Format: "HH:MM"
    end: string // Format: "HH:MM"
  }[]
}

interface FilterState {
  search: string
  status: string
  priority: string
  worker: string
}

interface TimelineSchedulerProps {
  jobs: Job[]
  workers: Worker[]
  selectedDate: Date
  viewMode: 'day' | 'week'
  onDateChange: (date: Date) => void
  onViewModeChange: (mode: 'day' | 'week') => void
  onJobUpdate: (jobId: string, updates: Partial<Job>) => void
  onJobMove: (jobId: string, newWorkerId: string | null, newTime: Date) => void
}

// Determine the earliest start time and latest end time among all workers
const determineWorkHours = (workers: Worker[]) => {
  let earliestStart = 9; // Default start at 9 AM
  let latestEnd = 17; // Default end at 5 PM
  
  workers.forEach(worker => {
    if (worker.working_hours && worker.working_hours.length > 0) {
      worker.working_hours.forEach(hours => {
        const startHour = parseInt(hours.start.split(':')[0]);
        const endHour = parseInt(hours.end.split(':')[0]);
        
        if (startHour < earliestStart) earliestStart = startHour;
        if (endHour > latestEnd) latestEnd = endHour;
      });
    }
  });
  
  return { START_HOUR: Math.max(4, earliestStart - 1), END_HOUR: Math.min(22, latestEnd + 1) };
};

// Constants for layout
const HOUR_WIDTH = 100
const WORKER_HEIGHT = 180

export const TimelineScheduler = React.memo(function TimelineScheduler({ 
  jobs, 
  workers, 
  selectedDate,
  viewMode,
  onDateChange,
  onViewModeChange,
  onJobUpdate, 
  onJobMove 
}: TimelineSchedulerProps) {
  // Calculate work hours dynamically based on workers' schedules
  const { START_HOUR, END_HOUR } = determineWorkHours(workers);
  
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);
  const [zoomLevel] = useState<'1hr'>('1hr');
  const [filters, setFilters] = useState<FilterState>({
    search: '',
    status: 'all',
    priority: 'all',
    worker: 'all'
  })
  const [activeFilters, setActiveFilters] = useState<{
    availableWorkersOnly: boolean;
    urgentJobsOnly: boolean;
    todaysScheduleOnly: boolean;
    overlappingJobsOnly: boolean;
    jobsWithNotesOnly: boolean;
    overbookedWorkersOnly: boolean;
  }>({
    availableWorkersOnly: false,
    urgentJobsOnly: false,
    todaysScheduleOnly: false,
    overlappingJobsOnly: false,
    jobsWithNotesOnly: false,
    overbookedWorkersOnly: false
  });
  const [ref, bounds] = useState<any>({})
  const [showJobDetails, setShowJobDetails] = useState<boolean>(false);
  
  // Handle job actions from JobCard component
  const handleJobAction = useCallback((action: string, job: Job) => {
    console.log(`Action: ${action} for job: ${job.id}`);
    
    switch (action) {
      case 'viewDetails':
        setSelectedJob(job);
        setShowJobDetails(true);
        break;
      case 'smartReschedule':
        // Implementation would go here
        alert(`Smart rescheduling job: ${job.title}`);
        break;
      case 'assignWorker':
        // Implementation would go here
        alert(`Assign worker to job: ${job.title}`);
        break;
      case 'markComplete':
        onJobUpdate(job.id, { status: 'completed' });
        break;
      case 'editJob':
        // Implementation would go here
        alert(`Editing job: ${job.title}`);
        break;
      case 'cancelJob':
        onJobUpdate(job.id, { status: 'cancelled' });
        break;
      default:
        break;
    }
  }, [onJobUpdate]);

  // Job filtering logic
  const filteredJobs = useMemo(() => {
    return jobs.filter(job => {
      // Search filter
      if (filters.search && !job.title.toLowerCase().includes(filters.search.toLowerCase())) {
        return false;
      }
      
      // Status filter
      if (filters.status !== 'all' && job.status !== filters.status) {
        return false;
      }
      
      // Priority filter
      if (filters.priority !== 'all' && job.priority !== filters.priority) {
        return false;
      }
      
      // Worker filter
      if (filters.worker !== 'all' && job.worker_id !== filters.worker) {
        return false;
      }

      // Active filters
      if (activeFilters.urgentJobsOnly && job.priority !== 'urgent') {
        return false;
      }

      if (activeFilters.todaysScheduleOnly) {
        const jobDate = new Date(job.scheduled_at);
        if (!isSameDay(jobDate, selectedDate)) {
          return false;
        }
      }

      return true;
    });
  }, [jobs, filters, activeFilters, selectedDate]);

  // Group jobs by worker
  const workerJobs = useMemo(() => {
    const grouped: Record<string, Job[]> = {};
    
    filteredJobs.forEach(job => {
      if (job.worker_id) {
        if (!grouped[job.worker_id]) {
          grouped[job.worker_id] = [];
        }
        grouped[job.worker_id].push(job);
      }
    });
    
    return grouped;
  }, [filteredJobs]);
  
  // Find overlapping jobs
  const overlappingJobs = useMemo(() => {
    const conflicts = new Set<string>();
    
    // Check each worker's jobs for overlaps
    Object.values(workerJobs).forEach(jobs => {
      for (let i = 0; i < jobs.length; i++) {
        for (let j = i + 1; j < jobs.length; j++) {
          const job1 = jobs[i];
          const job2 = jobs[j];
          
          const job1Start = parseISO(job1.scheduled_at);
          const job1End = addHours(job1Start, job1.duration_hours);
          const job2Start = parseISO(job2.scheduled_at);
          const job2End = addHours(job2Start, job2.duration_hours);
          
          // Check if jobs overlap
          if (job1Start < job2End && job1End > job2Start) {
            conflicts.add(job1.id);
            conflicts.add(job2.id);
          }
        }
      }
    });
    
    return conflicts;
  }, [workerJobs]);

  // Calculate worker utilization
  const workersWithUtilization = useMemo(() => {
    return workers.map(worker => {
      const workerJobsForDay = workerJobs[worker.id] || []
      const totalHours = workerJobsForDay.reduce((sum, job) => sum + job.duration_hours, 0)
      const utilization = Math.min((totalHours / 8) * 100, 100) // 8 hour workday
      
      return {
        ...worker,
        utilization,
        totalHours,
        jobCount: workerJobsForDay.length,
        isOverbooked: totalHours > 8
      }
    })
  }, [workers, workerJobs])
  
  // Filter workers based on active filters
  const filteredWorkers = useMemo(() => {
    let result = [...workersWithUtilization];
    
    if (activeFilters.availableWorkersOnly) {
      result = result.filter(worker => worker.status === 'available');
    }
    
    if (activeFilters.overbookedWorkersOnly) {
      result = result.filter(worker => worker.isOverbooked);
    }
    
    return result;
  }, [workersWithUtilization, activeFilters.availableWorkersOnly, activeFilters.overbookedWorkersOnly]);

  const timeSlots = useMemo(() => {
    const slots = []
    for (let hour = START_HOUR; hour <= END_HOUR; hour++) {
      slots.push(addHours(startOfDay(selectedDate), hour))
    }
    return slots
  }, [selectedDate, START_HOUR, END_HOUR])
  
  // Toggle filter state
  const toggleFilter = useCallback((filterName: keyof typeof activeFilters) => {
    setActiveFilters(prev => ({
      ...prev,
      [filterName]: !prev[filterName]
    }));
  }, []);
  
  // Get statistics for the filters
  const filterStats = useMemo(() => {
    return {
      availableWorkers: workersWithUtilization.filter(w => w.status === 'available').length,
      urgentJobs: filteredJobs.filter(j => j.priority === 'urgent').length,
      overlappingJobs: overlappingJobs.size,
      overbookedWorkers: workersWithUtilization.filter(w => w.isOverbooked).length
    };
  }, [workersWithUtilization, filteredJobs, overlappingJobs]);

  return (
    <div className="flex flex-col h-full bg-gray-50">
      {/* Header Controls - Sticky */}
      <div className="sticky top-0 z-50 bg-white/95 backdrop-blur-sm border-b border-gray-200 shadow-sm">
        <div className="p-4 lg:p-6">
          <div className="flex flex-col space-y-4 lg:flex-row lg:items-center lg:justify-between lg:space-y-0">
            <div className="flex flex-col space-y-4 sm:flex-row sm:items-center sm:space-y-0 sm:space-x-4">
              <h2 className="text-xl lg:text-2xl font-bold text-gray-900">Timeline Scheduler</h2>
              <DateRangePicker
                selectedDate={selectedDate}
                onDateChange={onDateChange}
                viewMode={viewMode}
                onViewModeChange={onViewModeChange}
              />
            </div>
          </div>
          
          {/* Enhanced Filters with Active States - Sticky */}
          <div className="flex items-center justify-between space-x-4 p-3 bg-white/90 border border-gray-200 rounded-lg shadow-sm backdrop-blur-sm mt-4">
            <div className="flex items-center gap-3 flex-wrap">
              <div className="flex items-center gap-2">
                <Filter className="h-4 w-4 text-blue-600" />
                <span className="text-sm font-medium text-gray-700">Quick Filters:</span>
              </div>
              
              <button
                onClick={() => toggleFilter('availableWorkersOnly')}
                className={cn(
                  "flex items-center px-3 py-1.5 rounded-md text-xs font-medium transition-colors",
                  activeFilters.availableWorkersOnly
                    ? "bg-green-100 text-green-700 border border-green-200"
                    : "bg-gray-100 text-gray-600 border border-gray-200 hover:bg-gray-200"
                )}
              >
                Available Workers ({filterStats.availableWorkers})
              </button>
              
              <button
                onClick={() => toggleFilter('urgentJobsOnly')}
                className={cn(
                  "flex items-center px-3 py-1.5 rounded-md text-xs font-medium transition-colors",
                  activeFilters.urgentJobsOnly
                    ? "bg-red-100 text-red-700 border border-red-200"
                    : "bg-gray-100 text-gray-600 border border-gray-200 hover:bg-gray-200"
                )}
              >
                Urgent Jobs ({filterStats.urgentJobs})
              </button>
              
              <button
                onClick={() => toggleFilter('overlappingJobsOnly')}
                className={cn(
                  "flex items-center px-3 py-1.5 rounded-md text-xs font-medium transition-colors",
                  activeFilters.overlappingJobsOnly
                    ? "bg-amber-100 text-amber-700 border border-amber-200"
                    : "bg-gray-100 text-gray-600 border border-gray-200 hover:bg-gray-200"
                )}
              >
                Overlapping Jobs ({filterStats.overlappingJobs})
              </button>
              
              <button
                onClick={() => toggleFilter('overbookedWorkersOnly')}
                className={cn(
                  "flex items-center px-3 py-1.5 rounded-md text-xs font-medium transition-colors",
                  activeFilters.overbookedWorkersOnly
                    ? "bg-blue-100 text-blue-700 border border-blue-200"
                    : "bg-gray-100 text-gray-600 border border-gray-200 hover:bg-gray-200"
                )}
              >
                Overbooked Workers ({filterStats.overbookedWorkers})
              </button>
              
              <button
                onClick={() => toggleFilter('todaysScheduleOnly')}
                className={cn(
                  "flex items-center px-3 py-1.5 rounded-md text-xs font-medium transition-colors",
                  activeFilters.todaysScheduleOnly
                    ? "bg-indigo-100 text-indigo-700 border border-indigo-200"
                    : "bg-gray-100 text-gray-600 border border-gray-200 hover:bg-gray-200"
                )}
              >
                Today's Schedule
              </button>
            </div>
            
            {/* Reset Filters */}
            {Object.values(activeFilters).some(Boolean) && (
              <button
                onClick={() => setActiveFilters({
                  availableWorkersOnly: false,
                  urgentJobsOnly: false,
                  todaysScheduleOnly: false,
                  overlappingJobsOnly: false,
                  jobsWithNotesOnly: false,
                  overbookedWorkersOnly: false,
                })}
                className="px-3 py-1.5 bg-white border border-gray-300 rounded-md text-xs font-medium text-gray-700 hover:bg-gray-100 transition-colors flex items-center gap-1"
              >
                Reset Filters
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Main Timeline */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Enhanced Time Header - Only show for day view */}
          {viewMode === 'day' && (
            <TimeAxis 
              startHour={START_HOUR}
              endHour={END_HOUR}
              zoomLevel={zoomLevel}
              onZoomChange={() => {}}
              viewMode={viewMode}
            />
          )}

          {/* Worker Lanes - With Filtering Applied */}
          <div ref={ref} className="flex-1 overflow-auto">
            <div className="relative">
              {filteredWorkers.map((worker, index) => (
                viewMode === 'week' ? (
                  <WeekWorkerLane
                    key={worker.id}
                    worker={worker}
                    jobs={workerJobs[worker.id] || []}
                    selectedDate={selectedDate}
                    hourWidth={HOUR_WIDTH}
                    height={WORKER_HEIGHT}
                    isEven={index % 2 === 0}
                  />
                ) : (
                  <WorkerRow
                    key={worker.id}
                    worker={worker}
                    jobs={workerJobs[worker.id] || []}
                    isEven={index % 2 === 0}
                    height={WORKER_HEIGHT}
                    zoomLevel={zoomLevel}
                  >
                    {/* Job positioning for day view - improved spacing */}
                    {(workerJobs[worker.id] || []).map((job, jobIndex) => {
                      const jobStart = parseISO(job.scheduled_at)
                      const minutesFromStart = differenceInMinutes(jobStart, addHours(startOfDay(selectedDate), START_HOUR))
                      
                      // Calculate the precise position based on the hourWidth and zoom level
                      const totalMinutesInDay = (END_HOUR - START_HOUR) * 60
                      const percentageOfDay = minutesFromStart / totalMinutesInDay
                      const left = percentageOfDay * 100 + '%' // Use percentage for responsive layout
                      
                      // Calculate width based on duration
                      const durationMinutes = job.duration_hours * 60
                      const widthPercentage = (durationMinutes / totalMinutesInDay) * 100
                      const width = widthPercentage + '%'

                      // Check for conflicts with other jobs in the same worker lane
                      const hasConflict = overlappingJobs.has(job.id);

                      // Stack overlapping jobs vertically with improved spacing
                      const overlappingPrevJobs = (workerJobs[worker.id] || [])
                        .filter((otherJob, otherIndex) => {
                          if (otherIndex >= jobIndex) return false
                          const otherStart = parseISO(otherJob.scheduled_at)
                          const otherEnd = addHours(otherStart, otherJob.duration_hours)
                          const jobEnd = addHours(jobStart, job.duration_hours)
                          return (jobStart < otherEnd && jobEnd > otherStart)
                        })
                      
                      // Increased vertical offset for better spacing between stacked jobs
                      const verticalOffset = overlappingPrevJobs.length * 45 

                      // Skip this job if filtered out by overlapping jobs filter
                      if (activeFilters.overlappingJobsOnly && !hasConflict) {
                        return null;
                      }

                      return (
                        <div
                          key={job.id}
                          className={cn(
                            "absolute z-20 transition-all duration-200 cursor-pointer",
                            hasConflict && "ring-2 ring-red-300 ring-offset-1"
                          )}
                          style={{
                            left,
                            width,
                            top: `${16 + verticalOffset}px`, // Better top margin with more space
                            maxHeight: `${WORKER_HEIGHT - 24}px`, // Prevent overflow
                          }}
                          onClick={() => {
                            setSelectedJob(job);
                            setShowJobDetails(true);
                          }}
                        >
                          <JobCard 
                            job={job} 
                            hasConflict={hasConflict} 
                            onAction={handleJobAction}
                          />
                        </div>
                      )
                    })}
                  </WorkerRow>
                )
              ))}
              
              {/* Empty state when no workers match filters */}
              {filteredWorkers.length === 0 && (
                <div className="flex flex-col items-center justify-center h-64 text-center p-8">
                  <div className="bg-blue-50 rounded-full p-3 mb-2">
                    <User className="h-6 w-6 text-blue-500" />
                  </div>
                  <h3 className="text-lg font-medium text-gray-900">No workers match the filters</h3>
                  <p className="text-gray-500 mt-1 max-w-md">
                    Try adjusting your filters or adding more workers to see them here.
                  </p>
                </div>
              )}

              {/* Empty state when there are workers but no jobs */}
              {filteredWorkers.length > 0 && filteredJobs.length === 0 && (
                <div className="border-t border-gray-200 mt-4 pt-4 text-center p-8">
                  <div className="bg-amber-50 rounded-full p-3 inline-block mb-2">
                    <Calendar className="h-6 w-6 text-amber-500" />
                  </div>
                  <h3 className="text-lg font-medium text-gray-900">No jobs to display</h3>
                  <p className="text-gray-500 mt-1 max-w-md mx-auto">
                    There are no jobs matching your current filters. Try adjusting your filters or add new jobs.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Job Details Modal */}
      {showJobDetails && selectedJob && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-auto">
            <div className="flex items-center justify-between p-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">Job Details</h3>
              <button 
                onClick={() => setShowJobDetails(false)}
                className="text-gray-500 hover:text-gray-700 p-1"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            
            <div className="p-6">
              {/* Job Header */}
              <div className="flex flex-col space-y-4">
                <div className="flex items-start justify-between">
                  <h2 className="text-xl font-bold text-gray-900">{selectedJob.title}</h2>
                  <span className={cn(
                    "px-3 py-1 rounded-full text-xs font-medium",
                    selectedJob.status === 'scheduled' ? "bg-blue-100 text-blue-800" :
                    selectedJob.status === 'in_progress' ? "bg-yellow-100 text-yellow-800" :
                    selectedJob.status === 'completed' ? "bg-green-100 text-green-800" :
                    "bg-red-100 text-red-800"
                  )}>
                    {selectedJob.status.replace('_', ' ')}
                  </span>
                </div>
                
                {selectedJob.description && (
                  <p className="text-gray-600">{selectedJob.description}</p>
                )}
              </div>
              
              {/* Job Details */}
              <div className="mt-6 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Client */}
                  <div className="flex items-center gap-2 bg-gray-50 p-3 rounded-lg">
                    <User className="h-5 w-5 text-blue-500" />
                    <div>
                      <div className="text-xs text-gray-500">Client</div>
                      <div className="font-medium">{selectedJob.client_name}</div>
                    </div>
                  </div>
                  
                  {/* Worker */}
                  <div className="flex items-center gap-2 bg-gray-50 p-3 rounded-lg">
                    <User className="h-5 w-5 text-indigo-500" />
                    <div>
                      <div className="text-xs text-gray-500">Assigned To</div>
                      <div className="font-medium">{selectedJob.worker_name || 'Unassigned'}</div>
                    </div>
                  </div>
                  
                  {/* Schedule */}
                  <div className="flex items-center gap-2 bg-gray-50 p-3 rounded-lg">
                    <CalendarClock className="h-5 w-5 text-green-500" />
                    <div>
                      <div className="text-xs text-gray-500">Schedule</div>
                      <div className="font-medium">
                        {format(new Date(selectedJob.scheduled_at), 'MMM d, yyyy')} at {format(new Date(selectedJob.scheduled_at), 'h:mm a')}
                      </div>
                      <div className="text-sm text-gray-500">Duration: {selectedJob.duration_hours} hour{selectedJob.duration_hours !== 1 ? 's' : ''}</div>
                    </div>
                  </div>
                  
                  {/* Location */}
                  {selectedJob.location && (
                    <div className="flex items-center gap-2 bg-gray-50 p-3 rounded-lg">
                      <MapPin className="h-5 w-5 text-red-500" />
                      <div>
                        <div className="text-xs text-gray-500">Location</div>
                        <div className="font-medium">{selectedJob.location}</div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
              
              {/* Action Buttons */}
              <div className="mt-8 flex flex-wrap gap-3 border-t border-gray-200 pt-4">
                <button 
                  onClick={() => {
                    handleJobAction('editJob', selectedJob);
                    setShowJobDetails(false);
                  }}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                >
                  Edit Job
                </button>
                
                <button 
                  onClick={() => {
                    handleJobAction('smartReschedule', selectedJob);
                    setShowJobDetails(false);
                  }}
                  className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition-colors"
                >
                  Reschedule
                </button>
                
                <button 
                  onClick={() => {
                    handleJobAction('assignWorker', selectedJob);
                    setShowJobDetails(false);
                  }}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors"
                >
                  Reassign Worker
                </button>
                
                {selectedJob.status !== 'completed' && (
                  <button 
                    onClick={() => {
                      handleJobAction('markComplete', selectedJob);
                      setShowJobDetails(false);
                    }}
                    className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors"
                  >
                    Mark Complete
                  </button>
                )}
                
                {selectedJob.status !== 'cancelled' && (
                  <button 
                    onClick={() => {
                      handleJobAction('cancelJob', selectedJob);
                      setShowJobDetails(false);
                    }}
                    className="px-4 py-2 border border-red-200 text-red-600 rounded-md hover:bg-red-50 transition-colors"
                  >
                    Cancel Job
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}) 