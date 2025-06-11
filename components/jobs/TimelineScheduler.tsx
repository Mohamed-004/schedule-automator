'use client'

import React, { useState, useMemo, useCallback } from 'react'
import { format, startOfDay, addHours, isSameDay, parseISO, differenceInMinutes, addDays, startOfWeek, isToday } from 'date-fns'
import { motion, AnimatePresence } from 'framer-motion'
import { Clock, MapPin, User, AlertTriangle, Calendar, Filter, X, CalendarClock, ArrowLeft, ArrowRight, MoreHorizontal, Phone, Activity, BriefcaseBusiness, ChevronRight, Edit, Check, RotateCw, Trash2, ExternalLink } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar'
import { TooltipProvider } from '@/components/ui/tooltip'
import { DateRangePicker } from './DateRangePicker'
import { WeekTimelineHeader } from './WeekTimelineHeader'
import { WeekWorkerLane } from './WeekWorkerLane'

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

// Unified time calculation system - used consistently across all components
const calculateTimePosition = (hour: number, minute: number, startHour: number, endHour: number) => {
  const totalHours = endHour - startHour
  const hoursSinceStart = hour - startHour
  const minutesFraction = minute / 60
  const relativePosition = hoursSinceStart + minutesFraction
  return Math.max(0, Math.min(95, (relativePosition / totalHours) * 100))
}

const calculateTimeWidth = (durationHours: number, startHour: number, endHour: number) => {
  const totalHours = endHour - startHour
  return Math.max(5, Math.min(95, (durationHours / totalHours) * 100))
}

// Determine work hours based on all workers
const determineWorkHours = (workers: Worker[]) => {
  let earliestStart = 7; // Default 7 AM
  let latestEnd = 19; // Default 7 PM
  
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
  
  return { START_HOUR: Math.max(6, earliestStart - 1), END_HOUR: Math.min(22, latestEnd + 1) };
};

// Status and priority configurations
const statusColors = {
  scheduled: { bg: 'bg-blue-50', border: 'border-l-blue-400', text: 'text-blue-600', dot: 'bg-blue-500' },
  in_progress: { bg: 'bg-yellow-50', border: 'border-l-yellow-400', text: 'text-yellow-600', dot: 'bg-yellow-500' },
  completed: { bg: 'bg-green-50', border: 'border-l-green-400', text: 'text-green-600', dot: 'bg-green-500' },
  cancelled: { bg: 'bg-red-50', border: 'border-l-red-400', text: 'text-red-600', dot: 'bg-red-500' },
  overdue: { bg: 'bg-red-50', border: 'border-l-red-400', text: 'text-red-600', dot: 'bg-red-500' }
}

const workerStatusColors = {
  available: { bg: 'bg-green-100', dot: 'bg-green-500', text: 'text-green-700' },
  busy: { bg: 'bg-amber-100', dot: 'bg-amber-500', text: 'text-amber-700' },
  offline: { bg: 'bg-red-100', dot: 'bg-red-500', text: 'text-red-700' }
}

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
  const [showJobDetails, setShowJobDetails] = useState<boolean>(false);
  const [now, setNow] = useState<Date>(() => new Date())
  
  // Update current time every minute
  React.useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 60000)
    return () => clearInterval(id)
  }, [])
  
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
      // Date filter for current view
      const jobDate = parseISO(job.scheduled_at);
      if (viewMode === 'day' && !isSameDay(jobDate, selectedDate)) {
        return false;
      }
      
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

      if (activeFilters.todaysScheduleOnly && !isSameDay(jobDate, selectedDate)) {
          return false;
      }

      return true;
    });
  }, [jobs, filters, activeFilters, selectedDate, viewMode]);

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

  // Generate time slots
  const timeSlots = useMemo(() => {
    const slots = []
    for (let hour = START_HOUR; hour < END_HOUR; hour++) {
      slots.push(hour)
    }
    return slots
  }, [START_HOUR, END_HOUR])
  
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

  // Helper functions for worker info
  const getWorkerStatusMessage = (worker: typeof filteredWorkers[0]) => {
    if (worker.status === 'offline') return 'Out of Office';
    if (worker.jobCount === 0) return 'Available All Day';
    
    const upcomingJobs = (workerJobs[worker.id] || [])
      .filter(job => new Date(job.scheduled_at) > now)
      .sort((a, b) => new Date(a.scheduled_at).getTime() - new Date(b.scheduled_at).getTime());
      
    if (upcomingJobs.length > 0) {
      const nextJob = upcomingJobs[0];
      const nextJobTime = new Date(nextJob.scheduled_at);
      return `Next job at ${format(nextJobTime, 'h:mm a')}`;
    }
    
    return worker.utilization > 80 ? 'Heavily Booked' : 'Partially Available';
  };

  const getWorkingHours = (worker: Worker) => {
    if (!worker.working_hours || worker.working_hours.length === 0) {
      return '9:00 AM - 5:00 PM';
    }
    
    const shift = worker.working_hours[0];
    const formatTime = (timeStr: string) => {
      const [hours, minutes] = timeStr.split(':').map(Number);
      const period = hours >= 12 ? 'PM' : 'AM';
      const hour12 = hours % 12 || 12;
      return `${hour12}:${minutes.toString().padStart(2, '0')} ${period}`;
    };
    
    return `${formatTime(shift.start)} - ${formatTime(shift.end)}`;
  };

  const getUtilizationColor = (utilization: number) => {
    if (utilization >= 100) return 'bg-red-500'
    if (utilization >= 80) return 'bg-amber-500'
    if (utilization >= 60) return 'bg-yellow-500'
    return 'bg-green-500'
  }

  const getUtilizationBg = (utilization: number) => {
    if (utilization >= 100) return 'bg-red-50 border-red-200'
    if (utilization >= 80) return 'bg-amber-50 border-amber-200'
    if (utilization >= 60) return 'bg-yellow-50 border-yellow-200'
    return 'bg-green-50 border-green-200'
  }

  // Calculate current time position
  const getCurrentTimePosition = () => {
    const currentHour = now.getHours()
    const currentMinute = now.getMinutes()
    
    if (currentHour < START_HOUR || currentHour > END_HOUR) {
      return null;
    }
    
    return calculateTimePosition(currentHour, currentMinute, START_HOUR, END_HOUR);
  }

  // Week view rendering with enhanced responsive layout
  if (viewMode === 'week') {
    return (
      <TooltipProvider>
        <div className="flex flex-col h-full bg-gray-50">
          {/* Header Controls - Mobile Optimized */}
          <div className="sticky top-0 z-50 bg-white/95 backdrop-blur-sm border-b border-gray-200 shadow-sm mobile-container">
            <div className="px-2 py-2 sm:px-3 sm:py-3 lg:px-6 lg:py-4">
              <div className="flex flex-col space-y-2 lg:flex-row lg:items-center lg:justify-between lg:space-y-0">
                <div className="flex flex-col space-y-2 sm:flex-row sm:items-center sm:space-y-0 sm:space-x-3">
                  <h2 className="text-base sm:text-lg lg:text-xl font-bold text-gray-900 truncate">Timeline Scheduler</h2>
                  <div className="flex-shrink-0">
                    <DateRangePicker
                      selectedDate={selectedDate}
                      onDateChange={onDateChange}
                      viewMode={viewMode}
                      onViewModeChange={onViewModeChange}
                    />
                  </div>
                </div>
              </div>
              
              {/* Mobile-Optimized Filters */}
              <div className="mt-2 lg:mt-4">
                <div className="flex items-center justify-between mb-1.5 sm:mb-2">
                  <div className="flex items-center gap-1 sm:gap-2">
                    <Filter className="h-3 w-3 text-blue-600 flex-shrink-0" />
                    <span className="text-xs font-medium text-gray-700">Filters</span>
                  </div>
                  
                  {/* Reset Filters - Mobile Friendly */}
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
                      className="px-2 py-1 bg-white border border-gray-300 rounded text-xs font-medium text-gray-700 hover:bg-gray-100 transition-colors flex-shrink-0"
                    >
                      Reset
                    </button>
                  )}
                </div>
                
                {/* Filter Buttons - Mobile Scroll */}
                <div className="mobile-scroll-x -mx-2 px-2 sm:mx-0 sm:px-0">
                  <div className="flex gap-1.5 min-w-max pb-1">
                    <button
                      onClick={() => toggleFilter('availableWorkersOnly')}
                      className={cn(
                        "flex items-center px-2 py-1 rounded text-xs font-medium transition-colors flex-shrink-0 whitespace-nowrap",
                        activeFilters.availableWorkersOnly
                          ? "bg-green-100 text-green-700 border border-green-200"
                          : "bg-gray-100 text-gray-600 border border-gray-200 hover:bg-gray-200"
                      )}
                    >
                      Available ({filterStats.availableWorkers})
                    </button>
                    
                    <button
                      onClick={() => toggleFilter('urgentJobsOnly')}
                      className={cn(
                        "flex items-center px-2 py-1 rounded text-xs font-medium transition-colors flex-shrink-0 whitespace-nowrap",
                        activeFilters.urgentJobsOnly
                          ? "bg-red-100 text-red-700 border border-red-200"
                          : "bg-gray-100 text-gray-600 border border-gray-200 hover:bg-gray-200"
                      )}
                    >
                      Urgent ({filterStats.urgentJobs})
                    </button>
                    
                    <button
                      onClick={() => toggleFilter('overlappingJobsOnly')}
                      className={cn(
                        "flex items-center px-2 py-1 rounded text-xs font-medium transition-colors flex-shrink-0 whitespace-nowrap",
                        activeFilters.overlappingJobsOnly
                          ? "bg-amber-100 text-amber-700 border border-amber-200"
                          : "bg-gray-100 text-gray-600 border border-gray-200 hover:bg-gray-200"
                      )}
                    >
                      Conflicts ({filterStats.overlappingJobs})
                    </button>
                    
                    <button
                      onClick={() => toggleFilter('overbookedWorkersOnly')}
                      className={cn(
                        "flex items-center px-2 py-1 rounded text-xs font-medium transition-colors flex-shrink-0 whitespace-nowrap",
                        activeFilters.overbookedWorkersOnly
                          ? "bg-blue-100 text-blue-700 border border-blue-200"
                          : "bg-gray-100 text-gray-600 border border-gray-200 hover:bg-gray-200"
                      )}
                    >
                      Overbooked ({filterStats.overbookedWorkers})
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Fully Responsive Timeline Container */}
          <div className="flex-1 overflow-hidden max-w-full">
            <div className="h-full flex flex-col max-w-full">
              {/* Desktop: Timeline Grid with Horizontal Scroll */}
              <div className="hidden lg:flex flex-1 overflow-hidden max-w-full">
                <div className="flex h-full timeline-container no-overscroll max-w-full">
                  {/* Left: Empty - Worker info now in WeekWorkerLane */}
                  <div className="sticky left-0 z-20 bg-white border-r border-gray-200 shadow-lg flex-shrink-0 w-0">
                  </div>

                  {/* Right: Scrollable Week Grid */}
                  <div className="flex-1 overflow-x-auto timeline-scroll">
                    <div className="min-w-[700px]">
                      <WeekTimelineHeader selectedDate={selectedDate} hourWidth={100} />
                      <div className="flex-1 overflow-y-auto touch-scroll">
                        {filteredWorkers.map((worker, index) => (
                          <WeekWorkerLane
                            key={worker.id}
                            worker={worker}
                            jobs={workerJobs[worker.id] || []}
                            selectedDate={selectedDate}
                            hourWidth={100}
                            height={180}
                            isEven={index % 2 === 0}
                          />
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Mobile/Tablet: Stacked Cards Layout */}
              <div className="flex lg:hidden flex-col flex-1 overflow-hidden max-w-full">
                <div className="flex-1 overflow-y-auto touch-scroll p-2 sm:p-4 space-y-3 sm:space-y-4 max-w-full">
                  {filteredWorkers.map((worker, index) => (
                    <motion.div
                      key={worker.id}
                      className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden max-w-full"
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.3, delay: index * 0.1 }}
                    >
                      {/* Mobile Worker Header */}
                      <div className={cn(
                        "p-3 border-b border-gray-200",
                        worker.status === 'available' ? 'bg-gradient-to-r from-green-50 to-blue-50' : 'bg-gradient-to-r from-gray-50 to-white'
                      )}>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center">
                            <div className="relative mr-3">
                              <Avatar className="h-12 w-12 border-2 border-white shadow-sm">
                                <AvatarImage src={worker.avatar} alt={worker.name} />
                                <AvatarFallback className="text-sm font-semibold bg-blue-500 text-white">
                                  {worker.name.split(' ').map(n => n[0]).join('')}
                                </AvatarFallback>
                              </Avatar>
                              
                              {/* Status Indicator */}
                              <div className={cn(
                                "absolute -bottom-1 -right-1 h-4 w-4 rounded-full border-2 border-white",
                                worker.status === 'available' ? 'bg-green-500' : 'bg-gray-400'
                              )} />
                            </div>
                            
                            <div>
                              <div className="font-semibold truncate-text">{worker.name}</div>
                              <div className="text-xs text-gray-500 truncate-text">{worker.role}</div>
                              <div className="flex items-center mt-1">
                                <div className={cn(
                                  "text-xs px-1.5 py-0.5 rounded-full",
                                  worker.status === 'available' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'
                                )}>
                                  {worker.status === 'available' ? 'Available' : 'Unavailable'}
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                      
                      {/* Mobile Timeline Container */}
                      <div className="mobile-container py-2">
                        {/* Mobile View based on viewMode - String comparison to avoid TS error */}
                        {String(viewMode) === 'day' ? (
                          /* Mobile Day View - Hours */
                          <div className="w-full overflow-x-auto timeline-scroll no-overscroll">
                            <div className="relative w-max" style={{ paddingBottom: '8px' }}>
                              {/* Enhanced Hour Headers */}
                              <div className="flex gap-0.5 min-w-max">
                                {timeSlots.map((hour, hourIndex) => (
                                  <div key={hour} className="flex-shrink-0" style={{ width: '70px' }}>
                                    <div className={cn(
                                      'text-xs font-medium text-center py-1 px-1 rounded',
                                      (hour >= 9 && hour < 17) ? 'bg-blue-50 text-blue-700' : 'bg-gray-50 text-gray-600'
                                    )}>
                                      {hour % 12 === 0 ? '12' : hour % 12}:00 {hour >= 12 ? 'PM' : 'AM'}
                                    </div>
                                  </div>
                                ))}
                              </div>
                              
                              {/* Current Time Indicator */}
                              {isSameDay(selectedDate, new Date()) && (
                                <div 
                                  className="absolute top-0 bottom-0 w-0.5 bg-red-500 z-10" 
                                  style={{ 
                                    left: `${getCurrentTimePosition()}px`,
                                    height: '100%'
                                  }}
                                />
                              )}
                              
                              {/* Timeline Jobs */}
                              <div className="relative h-16 mt-1">
                                {workerJobs[worker.id]?.map((job, jobIndex) => {
                                  const jobDate = parseISO(job.scheduled_at);
                                  const startHour = jobDate.getHours();
                                  const startMinute = jobDate.getMinutes();
                                  
                                  // Calculate position based on hours from start of day
                                  const startHourIndex = timeSlots.findIndex(h => h === startHour);
                                  const minuteOffset = (startMinute / 60) * 70; // 70px per hour
                                  const leftPosition = (startHourIndex * 70) + minuteOffset;
                                  
                                  // Calculate width based on duration
                                  const widthHours = job.duration_hours || 1;
                                  const jobWidth = Math.max(60, widthHours * 70);
                                  
                                  return (
                                    <div
                                      key={job.id}
                                      className={cn(
                                        "absolute top-0 rounded-md py-1 px-2 cursor-pointer border-l-4 shadow-sm",
                                        statusColors[job.status]?.border,
                                        statusColors[job.status]?.bg,
                                        'hover:shadow-md active:scale-95 transition-all duration-150'
                                      )}
                                      style={{
                                        left: `${leftPosition}px`,
                                        width: `${jobWidth}px`,
                                        height: '44px'
                                      }}
                                      onClick={() => {
                                        setSelectedJob(job);
                                        setShowJobDetails(true);
                                      }}
                                    >
                                      <div className="text-xs font-medium truncate-text">{job.title}</div>
                                      <div className="text-xs truncate-text">
                                        {format(jobDate, 'h:mm a')}
                                        {job.duration_hours > 0 ? ` - ${format(addHours(jobDate, job.duration_hours), 'h:mm a')}` : ''}
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          </div>
                        ) : (
                          /* Mobile Week View - Days */
                          <div className="w-full overflow-x-auto timeline-scroll no-overscroll">
                            <div className="grid grid-cols-7 gap-1 min-w-max" style={{ minWidth: '490px' }}>
                              {Array.from({ length: 7 }, (_, dayIndex) => {
                                const day = addDays(startOfWeek(selectedDate, { weekStartsOn: 1 }), dayIndex);
                                const dayJobs = (workerJobs[worker.id] || []).filter(job => {
                                  const jobDate = parseISO(job.scheduled_at);
                                  return isSameDay(jobDate, day);
                                });

                                return (
                                  <div key={dayIndex} className="space-y-1 w-[70px]">
                                    <div className={cn(
                                      'text-xs font-medium text-center py-1 px-1 rounded',
                                      isToday(day) ? 'bg-blue-50 text-blue-700' : 'bg-gray-50 text-gray-600'
                                    )}>
                                      {format(day, 'EEE')}
                                    </div>
                                    <div className={cn(
                                      'text-base font-bold text-center',
                                      isToday(day) ? 'text-blue-600' : 'text-gray-900'
                                    )}>
                                      {format(day, 'd')}
                                    </div>
                                    <div className="space-y-1 min-h-[80px]">
                                      {dayJobs.slice(0, 3).map((job, jobIndex) => (
                                        <div
                                          key={job.id}
                                          className={cn(
                                            'p-1 rounded text-xs cursor-pointer transition-all',
                                            statusColors[job.status]?.bg,
                                            'border-l-2 border-gray-200 hover:shadow-sm active:scale-95'
                                          )}
                                          style={{
                                            borderLeftColor: job.priority === 'urgent' ? '#ef4444' : 
                                                          job.priority === 'high' ? '#f97316' : 
                                                          job.priority === 'medium' ? '#3b82f6' : '#6b7280'
                                          }}
                                          onClick={() => {
                                            setSelectedJob(job);
                                            setShowJobDetails(true);
                                          }}
                                        >
                                          <div className="font-medium truncate-text">{job.title}</div>
                                          <div className="text-xs text-gray-500 truncate-text">
                                            {format(parseISO(job.scheduled_at), 'h:mm a')}
                                          </div>
                                        </div>
                                      ))}
                                      {dayJobs.length > 3 && (
                                        <div className="text-center text-xs text-gray-500 mt-1">
                                          +{dayJobs.length - 3} more
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        )}
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </TooltipProvider>
    );
  }

  // Day view rendering with fully responsive layout
  return (
    <TooltipProvider>
      <div className="flex flex-col h-full bg-gray-50">
        {/* Header Controls - Mobile Optimized */}
        <div className="sticky top-0 z-50 bg-white border-b border-gray-200 shadow-sm mobile-container">
          <div className="px-2 py-2 sm:px-3 sm:py-3 lg:px-6 lg:py-4">
            <div className="flex flex-col space-y-2 lg:flex-row lg:items-center lg:justify-between lg:space-y-0">
              <div className="flex flex-col space-y-2 sm:flex-row sm:items-center sm:space-y-0 sm:space-x-3">
                <h2 className="text-base sm:text-lg lg:text-xl font-bold text-gray-900 truncate">Timeline Scheduler</h2>
                <div className="flex-shrink-0">
                  <DateRangePicker
                    selectedDate={selectedDate}
                    onDateChange={onDateChange}
                    viewMode={viewMode}
                    onViewModeChange={onViewModeChange}
                  />
                </div>
              </div>
            </div>
            
            {/* Mobile-Optimized Filters */}
            <div className="mt-2 lg:mt-4">
              <div className="flex items-center justify-between mb-1.5 sm:mb-2">
                <div className="flex items-center gap-1 sm:gap-2">
                  <Filter className="h-3 w-3 text-blue-600 flex-shrink-0" />
                  <span className="text-xs font-medium text-gray-700">Filters</span>
                </div>
                
                {/* Reset Filters - Mobile Friendly */}
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
                    className="px-2 py-1 bg-white border border-gray-300 rounded text-xs font-medium text-gray-700 hover:bg-gray-100 transition-colors flex-shrink-0"
                  >
                    Reset
                  </button>
                )}
              </div>
              
              {/* Filter Buttons - Mobile Scroll */}
              <div className="mobile-scroll-x -mx-2 px-2 sm:mx-0 sm:px-0">
                <div className="flex gap-1.5 min-w-max pb-1">
                  <button
                    onClick={() => toggleFilter('availableWorkersOnly')}
                    className={cn(
                      "flex items-center px-2 py-1 rounded text-xs font-medium transition-colors flex-shrink-0 whitespace-nowrap",
                      activeFilters.availableWorkersOnly
                        ? "bg-green-100 text-green-700 border border-green-200"
                        : "bg-gray-100 text-gray-600 border border-gray-200 hover:bg-gray-200"
                    )}
                  >
                    Available ({filterStats.availableWorkers})
                  </button>
                  
                  <button
                    onClick={() => toggleFilter('urgentJobsOnly')}
                    className={cn(
                      "flex items-center px-2 py-1 rounded text-xs font-medium transition-colors flex-shrink-0 whitespace-nowrap",
                      activeFilters.urgentJobsOnly
                        ? "bg-red-100 text-red-700 border border-red-200"
                        : "bg-gray-100 text-gray-600 border border-gray-200 hover:bg-gray-200"
                    )}
                  >
                    Urgent ({filterStats.urgentJobs})
                  </button>
                  
                  <button
                    onClick={() => toggleFilter('overlappingJobsOnly')}
                    className={cn(
                      "flex items-center px-2 py-1 rounded text-xs font-medium transition-colors flex-shrink-0 whitespace-nowrap",
                      activeFilters.overlappingJobsOnly
                        ? "bg-amber-100 text-amber-700 border border-amber-200"
                        : "bg-gray-100 text-gray-600 border border-gray-200 hover:bg-gray-200"
                    )}
                  >
                    Conflicts ({filterStats.overlappingJobs})
                  </button>
                  
                  <button
                    onClick={() => toggleFilter('overbookedWorkersOnly')}
                    className={cn(
                      "flex items-center px-2 py-1 rounded text-xs font-medium transition-colors flex-shrink-0 whitespace-nowrap",
                      activeFilters.overbookedWorkersOnly
                        ? "bg-blue-100 text-blue-700 border border-blue-200"
                        : "bg-gray-100 text-gray-600 border border-gray-200 hover:bg-gray-200"
                    )}
                  >
                    Overbooked ({filterStats.overbookedWorkers})
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Fully Responsive Timeline Container */}
        <div className="flex-1 overflow-hidden max-w-full">
          <div className="h-full flex flex-col max-w-full">
            {/* Desktop: Timeline Grid with Horizontal Scroll */}
            <div className="hidden lg:flex flex-1 overflow-hidden max-w-full">
              <div className="flex h-full timeline-container no-overscroll max-w-full">
                {/* Left: Sticky Worker Column */}
                <div className="sticky left-0 z-20 bg-white border-r border-gray-200 shadow-lg flex-shrink-0">
                  <div className="timeline-worker-column flex flex-col h-full timeline-responsive">
                    {/* Worker Column Header */}
                    <div className="bg-gradient-to-r from-gray-50 to-gray-100 border-b border-gray-200 p-3 flex items-center justify-center shadow-sm h-[60px]">
                      <div className="flex items-center gap-2 text-sm font-semibold text-gray-700">
                        <Clock className="h-4 w-4" />
                        <span className="hidden sm:inline">Team Schedule</span>
                        <span className="sm:hidden">Team</span>
                      </div>
                    </div>

                    {/* Worker List - Scrollable */}
                    <div className="flex-1 overflow-y-auto touch-scroll">
                      {filteredWorkers.map((worker, index) => (
                        <motion.div
                          key={worker.id}
                          className={cn(
                            "border-b border-gray-200/80 p-3 sm:p-4 flex items-center h-[180px] transition-all duration-300 group",
                            index % 2 === 0 ? "bg-gradient-to-r from-gray-50/50 via-gray-50/30 to-white" : "bg-white"
                          )}
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ duration: 0.3, delay: index * 0.1 }}
                        >
                          <div className="flex flex-col w-full">
                            {/* Worker Header */}
                            <div className="flex items-center mb-3">
                              <div className="relative mr-3">
                                <Avatar className="h-10 w-10 sm:h-12 sm:w-12 border-2 border-white shadow-sm">
                                  <AvatarImage src={worker.avatar} alt={worker.name} />
                                  <AvatarFallback className="text-sm font-semibold bg-blue-500 text-white">
                                    {worker.name.split(' ').map(n => n[0]).join('')}
                                  </AvatarFallback>
                                </Avatar>
                                
                                {/* Status Indicator */}
                                <div className={cn(
                                  'absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-white',
                                  worker.status === 'available' ? 'bg-green-500' : 'bg-gray-400'
                                )} />
                              </div>
                              <div>
                                <div className="font-semibold truncate-text">{worker.name}</div>
                                <div className="text-xs text-gray-500 truncate-text">{worker.role}</div>
                              </div>
                            </div>
                            
                            {/* Utilization Bar */}
                            <div className="flex items-center justify-between mt-2">
                              <div className="text-xs text-gray-500">
                                {(workerJobs[worker.id] || []).length} jobs this week
                              </div>
                              <div className="flex items-center gap-1">
                                <div className={cn(
                                  'w-16 h-2 rounded-full border',
                                  getUtilizationBg(worker.utilization)
                                )}>
                                  <div 
                                    className={cn(
                                      'h-full rounded-full transition-all',
                                      getUtilizationColor(worker.utilization)
                                    )}
                                    style={{ width: `${Math.min(worker.utilization, 100)}%` }}
                                  />
                                </div>
                                <span className="text-xs font-medium">
                                  {Math.round(worker.utilization)}%
                                </span>
                              </div>
                            </div>
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Right: Horizontally Scrollable Timeline with Fixed Width Columns */}
                <div className="flex-1 overflow-x-auto overflow-y-hidden timeline-scroll timeline-mobile">
                  <div className="flex flex-col h-full timeline-no-select" style={{ minWidth: `${timeSlots.length * 100}px` }}>
                    {/* Time Header - Fixed Width Columns */}
                    <div className="bg-white border-b border-gray-200 shadow-sm h-[60px] flex flex-shrink-0">
                      {timeSlots.map((hour, index) => (
                        <div 
                          key={hour} 
                          className="timeline-hour-column border-r border-gray-100 last:border-r-0 p-2 text-center relative bg-white"
                        >
                          <div className="text-sm font-bold text-gray-800">
                            {format(new Date().setHours(hour, 0), 'h a')}
                          </div>
                          {/* Business hours highlighting */}
                          {hour >= 9 && hour < 17 && (
                            <div className="absolute inset-0 bg-blue-50/40 border-l border-blue-100/50 -z-10" />
                          )}
                          {/* Hour background shading */}
                          <div className={cn(
                            "absolute inset-0 -z-20",
                            index % 2 === 0 ? "bg-gray-50/50" : "bg-white"
                          )} />
                        </div>
                      ))}
                      
                      {/* Current Time Indicator in Header */}
                      {(() => {
                        const position = getCurrentTimePosition();
                        if (position !== null) {
                          const leftPx = (position / 100) * timeSlots.length * 100;
                          return (
                            <div 
                              className="absolute top-0 bottom-0 w-[2px] bg-red-500 z-30 pointer-events-none shadow-md"
                              style={{ left: `${leftPx}px` }}
                            >
                              <div className="absolute -top-0.5 -translate-x-1/2 z-20">
                                <div className="bg-red-600 text-white text-xs px-2 py-0.5 rounded shadow-lg flex items-center gap-1 whitespace-nowrap mb-1 font-medium">
                                  <span>NOW</span>
                                  <span className="font-mono hidden sm:inline">— {format(now, 'h:mm a')}</span>
                                </div>
                              </div>
                            </div>
                          );
                        }
                        return null;
                      })()}
                    </div>

                    {/* Timeline Content - Worker Rows with Jobs */}
                    <div className="flex-1 overflow-y-auto relative">
                      <div className="relative" style={{ minHeight: `${filteredWorkers.length * 180}px` }}>
                        {/* Vertical Grid Lines - Fixed Width */}
                        <div className="absolute inset-0 flex">
                          {timeSlots.map(hour => (
                            <div 
                              key={hour} 
                              className="timeline-hour-column border-r border-gray-100 last:border-r-0 h-full"
                            />
                          ))}
                        </div>

                        {/* Worker Rows with Jobs */}
                        {filteredWorkers.map((worker, workerIndex) => {
                          const jobsForWorker = workerJobs[worker.id] || [];
                          return (
                            <div 
                              key={worker.id}
                              className="absolute w-full border-b border-gray-200/60 overflow-visible"
                              style={{ 
                                top: `${workerIndex * 180}px`,
                                height: '180px'
                              }}
                            >
                              {/* Worker Availability Background */}
                              {worker.working_hours?.map((shift, shiftIndex) => {
                                const [startHour, startMin] = shift.start.split(':').map(Number);
                                const [endHour, endMin] = shift.end.split(':').map(Number);
                                
                                const leftPercent = calculateTimePosition(startHour, startMin, START_HOUR, END_HOUR);
                                const widthPercent = calculateTimeWidth((endHour + endMin/60) - (startHour + startMin/60), START_HOUR, END_HOUR);
                                
                                const leftPx = (leftPercent / 100) * timeSlots.length * 100;
                                const widthPx = (widthPercent / 100) * timeSlots.length * 100;

                                return (
                                  <div 
                                    key={shiftIndex} 
                                    className="absolute top-0 bottom-0 bg-green-500/8 border-l border-green-200/50"
                                    style={{ 
                                      left: `${leftPx}px`, 
                                      width: `${widthPx}px`
                                    }} 
                                  />
                                )
                              })}

                              {/* Jobs with Start and End Times Clearly Shown */}
                              {jobsForWorker.map((job, jobIndex) => {
                                const jobStart = parseISO(job.scheduled_at)
                                const jobHour = jobStart.getHours()
                                const jobMinute = jobStart.getMinutes()
                                
                                const leftPercent = calculateTimePosition(jobHour, jobMinute, START_HOUR, END_HOUR)
                                const widthPercent = calculateTimeWidth(job.duration_hours, START_HOUR, END_HOUR)
                                
                                if (leftPercent < 0 || leftPercent > 95) return null;

                                const hasConflict = overlappingJobs.has(job.id);

                                if (activeFilters.overlappingJobsOnly && !hasConflict) {
                                  return null;
                                }

                                const leftPx = (leftPercent / 100) * timeSlots.length * 100;
                                const widthPx = Math.max(80, (widthPercent / 100) * timeSlots.length * 100);

                                // Calculate stacking offset for overlapping jobs
                                const overlappingPrevJobs = jobsForWorker
                                  .filter((otherJob, otherIndex) => {
                                    if (otherIndex >= jobIndex) return false
                                    const otherStart = parseISO(otherJob.scheduled_at)
                                    const otherEnd = addHours(otherStart, otherJob.duration_hours)
                                    const jobEnd = addHours(jobStart, job.duration_hours)
                                    return (jobStart < otherEnd && jobEnd > otherStart)
                                  })
                                
                                const verticalOffset = overlappingPrevJobs.length * 50

                                return (
                                  <motion.div
                                    key={job.id}
                                    className={cn(
                                      'absolute z-20 cursor-pointer transition-all duration-200',
                                      'rounded-lg border-l-4 border border-gray-200 shadow hover:shadow-md',
                                      'p-2 sm:p-3 min-h-[80px] bg-white/95 backdrop-blur-sm',
                                      statusColors[job.status as keyof typeof statusColors]?.bg,
                                      statusColors[job.status as keyof typeof statusColors]?.border,
                                      hasConflict && 'ring-2 ring-red-400 ring-offset-1'
                                    )}
                                    style={{ 
                                      left: `${leftPx}px`, 
                                      width: `${widthPx}px`,
                                      top: `${12 + verticalOffset}px`,
                                      maxHeight: `${180 - 24}px`
                                    }}
                                    onClick={(e) => {
                                      e.preventDefault();
                                      e.stopPropagation();
                                      setSelectedJob(job);
                                      setShowJobDetails(true);
                                    }}
                                    onTouchStart={(e) => {
                                      // Prevent scrolling while interacting with job cards
                                      e.stopPropagation();
                                    }}
                                    initial={{ opacity: 0, scale: 0.95 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    whileHover={{ scale: 1.02, y: -2 }}
                                    whileTap={{ scale: 0.98 }}
                                  >
                                    {/* Job Header */}
                                    <div className="flex items-center justify-between mb-2">
                                      <div className="flex items-center gap-1 sm:gap-2">
                                        <div className={cn(
                                          'w-2 h-2 rounded-full',
                                          statusColors[job.status as keyof typeof statusColors]?.dot
                                        )} />
                                        <span className={cn(
                                          'text-xs px-1.5 sm:px-2 py-0.5 rounded-full font-medium',
                                          statusColors[job.status as keyof typeof statusColors]?.text,
                                          'bg-white/80'
                                        )}>
                                          {job.status.replace('_', ' ')}
                                        </span>
                                        
                                        {job.priority === 'urgent' && (
                                          <span className="bg-red-100 text-red-600 text-xs font-medium px-1.5 py-0.5 rounded-sm">
                                            Urgent
                                          </span>
                                        )}
                                      </div>
                                    </div>

                                    {/* Job Content with Clear Start/End Times */}
                                    <div className="space-y-1 sm:space-y-2">
                                      <h4 className="font-semibold text-xs sm:text-sm text-gray-900 line-clamp-2 leading-tight">
                                        {job.title}
                                      </h4>

                                      <div className="flex items-center gap-1 text-xs">
                                        <Clock className="h-2.5 w-2.5 sm:h-3 sm:w-3 text-blue-600" />
                                        <span className="font-medium text-blue-700">
                                          {format(jobStart, 'h:mm a')}
                                        </span>
                                        <ChevronRight className="h-2.5 w-2.5 sm:h-3 sm:w-3 text-gray-400" />
                                        <span className="font-medium text-blue-700">
                                          {format(addHours(jobStart, job.duration_hours), 'h:mm a')}
                                        </span>
                                      </div>

                                      <div className="flex items-center gap-1 text-xs text-gray-600">
                                        <User className="h-2.5 w-2.5 sm:h-3 sm:w-3 text-indigo-500" />
                                        <span className="truncate font-medium">{job.client_name}</span>
                                      </div>
                                      
                                      {job.location && (
                                        <div className="flex items-center gap-1 text-xs text-gray-500">
                                          <MapPin className="h-2.5 w-2.5 sm:h-3 sm:w-3" />
                                          <span className="truncate">{job.location.split(',')[0]}</span>
                                        </div>
                                      )}
                                      
                                      {hasConflict && (
                                        <div className="flex items-center gap-1 text-xs text-red-600 mt-1 bg-red-50 px-1.5 py-1 rounded">
                                          <AlertTriangle className="h-2.5 w-2.5 sm:h-3 sm:w-3" />
                                          <span>Scheduling conflict</span>
                                        </div>
                                      )}
                                    </div>
                                  </motion.div>
                                )
                              })}
                            </div>
                          )
                        })}

                        {/* Current Time Indicator Line */}
                        {(() => {
                          const position = getCurrentTimePosition();
                          if (position !== null) {
                            const leftPx = (position / 100) * timeSlots.length * 100;
                            return (
                              <div 
                                className="absolute top-0 bottom-0 w-[2px] bg-red-500 z-30 pointer-events-none shadow-md"
                                style={{ left: `${leftPx}px` }}
                              >
                                <div className="absolute inset-0 bg-gradient-to-b from-red-500 to-red-400/70" />
                              </div>
                            );
                          }
                        return null;
                        })()}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Mobile/Tablet: Stacked Cards Layout */}
            <div className="flex lg:hidden flex-col flex-1 overflow-hidden max-w-full">
              <div className="flex-1 overflow-y-auto touch-scroll p-2 sm:p-4 space-y-3 sm:space-y-4 max-w-full">
                {filteredWorkers.map((worker, index) => (
                  <motion.div
                    key={worker.id}
                    className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden max-w-full"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3, delay: index * 0.1 }}
                  >
                    {/* Mobile Worker Header */}
                    <div className={cn(
                      "p-3 border-b border-gray-200",
                      worker.status === 'available' ? 'bg-gradient-to-r from-green-50 to-blue-50' : 'bg-gradient-to-r from-gray-50 to-white'
                    )}>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center">
                          <div className="relative mr-3">
                            <Avatar className="h-12 w-12 border-2 border-white shadow-sm">
                              <AvatarImage src={worker.avatar} alt={worker.name} />
                              <AvatarFallback className="text-sm font-semibold bg-blue-500 text-white">
                                {worker.name.split(' ').map(n => n[0]).join('')}
                              </AvatarFallback>
                            </Avatar>
                            
                            {/* Status Indicator */}
                            <div className={cn(
                              "absolute -bottom-1 -right-1 h-4 w-4 rounded-full border-2 border-white",
                              worker.status === 'available' ? 'bg-green-500' : 'bg-gray-400'
                            )} />
                          </div>
                          
                          <div>
                            <div className="font-semibold truncate-text">{worker.name}</div>
                            <div className="text-xs text-gray-500 truncate-text">{worker.role}</div>
                            <div className="flex items-center mt-1">
                              <div className={cn(
                                "text-xs px-1.5 py-0.5 rounded-full",
                                worker.status === 'available' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'
                              )}>
                                {worker.status === 'available' ? 'Available' : 'Unavailable'}
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                    
                                          {/* Mobile Timeline Container */}
                      <div className="mobile-container py-2">
                        {String(viewMode) === 'day' ? (
                        /* Mobile Day View - Hours */
                        <div className="w-full overflow-x-auto timeline-scroll no-overscroll">
                          <div className="relative w-max" style={{ paddingBottom: '8px' }}>
                            {/* Enhanced Hour Headers */}
                            <div className="flex gap-0.5 min-w-max">
                              {timeSlots.map((hour, hourIndex) => (
                                <div key={hour} className="flex-shrink-0" style={{ width: '70px' }}>
                                  <div className={cn(
                                    'text-xs font-medium text-center py-1 px-1 rounded',
                                    (hour >= 9 && hour < 17) ? 'bg-blue-50 text-blue-700' : 'bg-gray-50 text-gray-600'
                                  )}>
                                    {hour % 12 === 0 ? '12' : hour % 12}:00 {hour >= 12 ? 'PM' : 'AM'}
                                  </div>
                                </div>
                              ))}
                            </div>
                            
                            {/* Current Time Indicator */}
                            {isSameDay(selectedDate, new Date()) && (
                              <div 
                                className="absolute top-0 bottom-0 w-0.5 bg-red-500 z-10" 
                                style={{ 
                                  left: `${getCurrentTimePosition()}px`,
                                  height: '100%'
                                }}
                              />
                            )}
                            
                            {/* Timeline Jobs */}
                            <div className="relative h-16 mt-1">
                              {workerJobs[worker.id]?.map((job, jobIndex) => {
                                const jobDate = parseISO(job.scheduled_at);
                                const startHour = jobDate.getHours();
                                const startMinute = jobDate.getMinutes();
                                
                                // Calculate position based on hours from start of day
                                const startHourIndex = timeSlots.findIndex(h => h === startHour);
                                const minuteOffset = (startMinute / 60) * 70; // 70px per hour
                                const leftPosition = (startHourIndex * 70) + minuteOffset;
                                
                                // Calculate width based on duration
                                const widthHours = job.duration_hours || 1;
                                const jobWidth = Math.max(60, widthHours * 70);
                                
                                return (
                                  <div
                                    key={job.id}
                                    className={cn(
                                      "absolute top-0 rounded-md py-1 px-2 cursor-pointer border-l-4 shadow-sm",
                                      statusColors[job.status]?.border,
                                      statusColors[job.status]?.bg,
                                      'hover:shadow-md active:scale-95 transition-all duration-150'
                                    )}
                                    style={{
                                      left: `${leftPosition}px`,
                                      width: `${jobWidth}px`,
                                      height: '44px'
                                    }}
                                    onClick={() => {
                                      setSelectedJob(job);
                                      setShowJobDetails(true);
                                    }}
                                  >
                                    <div className="text-xs font-medium truncate-text">{job.title}</div>
                                    <div className="text-xs truncate-text">
                                      {format(jobDate, 'h:mm a')}
                                      {job.duration_hours > 0 ? ` - ${format(addHours(jobDate, job.duration_hours), 'h:mm a')}` : ''}
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        </div>
                      ) : (
                        /* Mobile Week View - Days */
                        <div className="w-full overflow-x-auto timeline-scroll no-overscroll">
                          <div className="grid grid-cols-7 gap-1 min-w-max" style={{ minWidth: '490px' }}>
                            {Array.from({ length: 7 }, (_, dayIndex) => {
                              const day = addDays(startOfWeek(selectedDate, { weekStartsOn: 1 }), dayIndex);
                              const dayJobs = (workerJobs[worker.id] || []).filter(job => {
                                const jobDate = parseISO(job.scheduled_at);
                                return isSameDay(jobDate, day);
                              });

                              return (
                                <div key={dayIndex} className="space-y-1 w-[70px]">
                                  <div className={cn(
                                    'text-xs font-medium text-center py-1 px-1 rounded',
                                    isToday(day) ? 'bg-blue-50 text-blue-700' : 'bg-gray-50 text-gray-600'
                                  )}>
                                    {format(day, 'EEE')}
                                  </div>
                                  <div className={cn(
                                    'text-base font-bold text-center',
                                    isToday(day) ? 'text-blue-600' : 'text-gray-900'
                                  )}>
                                    {format(day, 'd')}
                                  </div>
                                  <div className="space-y-1 min-h-[80px]">
                                    {dayJobs.slice(0, 3).map((job, jobIndex) => (
                                      <div
                                        key={job.id}
                                        className={cn(
                                          'p-1 rounded text-xs cursor-pointer transition-all',
                                          statusColors[job.status]?.bg,
                                          'border-l-2 border-gray-200 hover:shadow-sm active:scale-95'
                                        )}
                                        style={{
                                          borderLeftColor: job.priority === 'urgent' ? '#ef4444' : 
                                                        job.priority === 'high' ? '#f97316' : 
                                                        job.priority === 'medium' ? '#3b82f6' : '#6b7280'
                                        }}
                                        onClick={() => {
                                          setSelectedJob(job);
                                          setShowJobDetails(true);
                                        }}
                                      >
                                        <div className="font-medium truncate-text">{job.title}</div>
                                        <div className="text-xs text-gray-500 truncate-text">
                                          {format(parseISO(job.scheduled_at), 'h:mm a')}
                                        </div>
                                      </div>
                                    ))}
                                    {dayJobs.length > 3 && (
                                      <div className="text-center text-xs text-gray-500 mt-1">
                                        +{dayJobs.length - 3} more
                                      </div>
                                    )}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Empty States */}
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

        {/* Job Details Modal */}
        {showJobDetails && selectedJob && (
          <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
            <motion.div 
              className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-auto"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
            >
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
                    <div className="flex items-center gap-2 bg-gray-50 p-3 rounded-lg">
                      <User className="h-5 w-5 text-blue-500" />
                      <div>
                        <div className="text-xs text-gray-500">Client</div>
                        <div className="font-medium">{selectedJob.client_name}</div>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2 bg-gray-50 p-3 rounded-lg">
                      <User className="h-5 w-5 text-indigo-500" />
                      <div>
                        <div className="text-xs text-gray-500">Assigned To</div>
                        <div className="font-medium">{selectedJob.worker_name || 'Unassigned'}</div>
                      </div>
                    </div>
                    
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
            </motion.div>
          </div>
        )}
      </div>
    </TooltipProvider>
  )
}) 