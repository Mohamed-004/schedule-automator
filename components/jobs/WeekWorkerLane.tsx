'use client'

import React, { useMemo, useState } from 'react'
import { format, parseISO, differenceInMinutes, addHours, startOfDay, startOfWeek, addDays, isSameDay } from 'date-fns'
import { motion, AnimatePresence } from 'framer-motion'
import { useDroppable } from '@dnd-kit/core'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { 
  CalendarDays, 
  Clock, 
  AlertTriangle, 
  User, 
  ArrowRight, 
  ArrowLeft, 
  MapPin,
  Calendar,
  Plus,
  ChevronDown,
  ChevronUp
} from 'lucide-react'
import { JobCard } from './JobCard'
import type { Job, Worker } from './TimelineScheduler'

interface WeekWorkerLaneProps {
  worker: Worker & {
    utilization: number
    totalHours: number
    jobCount: number
  }
  jobs: Job[]
  selectedDate: Date
  hourWidth: number
  height: number
  isEven: boolean
}

const statusColors = {
  available: 'bg-green-500',
  busy: 'bg-amber-500',
  offline: 'bg-red-500'
}

const priorityColors = {
  low: 'border-l-gray-500',
  medium: 'border-l-blue-500',
  high: 'border-l-orange-500',
  urgent: 'border-l-red-500'
}

export function WeekWorkerLane({ 
  worker, 
  jobs, 
  selectedDate,
  hourWidth, 
  height, 
  isEven
}: WeekWorkerLaneProps) {
  const [expandedDay, setExpandedDay] = useState<number | null>(null);
  
  const { setNodeRef } = useDroppable({
    id: `worker-week-${worker.id}`,
    data: {
      type: 'worker-lane',
      workerId: worker.id,
    },
  })

  const weekStart = startOfWeek(selectedDate, { weekStartsOn: 1 })
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i))
  const dayNames = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

  // Group jobs by day
  const jobsByDay = useMemo(() => {
    const grouped: Record<string, Job[]> = {}
    
    weekDays.forEach(day => {
      const dayKey = format(day, 'yyyy-MM-dd')
      grouped[dayKey] = jobs.filter(job => {
        const jobDate = parseISO(job.scheduled_at)
        return isSameDay(jobDate, day)
      }).sort((a, b) => {
        // Sort by time of day
        return new Date(a.scheduled_at).getTime() - new Date(b.scheduled_at).getTime();
      })
    })
    
    return grouped
  }, [jobs, weekDays])

  // Calculate total utilization for the week
  const weekUtilization = useMemo(() => {
    const totalJobs = Object.values(jobsByDay).flat()
    const totalHours = totalJobs.reduce((sum, job) => sum + job.duration_hours, 0)
    return Math.min((totalHours / (8 * 5)) * 100, 100) // 8 hours per day, 5 weekdays
  }, [jobsByDay])

  const getDayUtilization = (dayJobs: Job[]) => {
    const totalHours = dayJobs.reduce((sum, job) => sum + job.duration_hours, 0)
    return Math.min((totalHours / 8) * 100, 100) // 8 hour workday
  }

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
  
  // Format time for display
  const formatJobTime = (dateString: string) => {
    const date = new Date(dateString);
    return format(date, 'h:mm a');
  }
  
  // Find multi-day jobs
  const multiDayJobs = useMemo(() => {
    const result: { job: Job, startDay: number, endDay: number }[] = [];
    // Implementation would go here - would check for jobs spanning multiple days
    // For this prototype, we'll assume no multi-day jobs yet
    return result;
  }, [jobs, weekDays]);

  return (
    <motion.div
      ref={setNodeRef}
      className={cn(
        'relative border-b border-gray-200 transition-colors',
        isEven ? 'bg-gradient-to-r from-gray-50/50 via-gray-50/30 to-white' : 'bg-white'
      )}
      style={{ height, minHeight: '150px' }}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      {/* Worker Info Panel */}
      <div className="absolute left-0 top-0 bottom-0 w-64 bg-white/95 backdrop-blur-sm border-r border-gray-200 flex items-center shadow-sm z-10">
        <div className="flex items-center w-full px-4 py-3">
          {/* Avatar with Status */}
          <div className="relative mr-3">
            <Avatar className="h-10 w-10 border-2 border-white shadow-md">
              <AvatarImage src={worker.avatar} alt={worker.name} />
              <AvatarFallback className="text-sm font-semibold bg-gradient-to-br from-blue-500 to-purple-600 text-white">
                {worker.name.split(' ').map(n => n[0]).join('')}
              </AvatarFallback>
            </Avatar>
            
            {/* Status Indicator */}
            <div className={cn(
              'absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-white',
              worker.status === 'available' ? 'bg-green-500' : 'bg-gray-400'
            )} />
          </div>

          {/* Worker Details */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between mb-1">
              <h3 className="font-semibold text-sm text-gray-900 truncate">
                {worker.name}
              </h3>
            </div>
            
            <div className="mb-2">
              <Badge variant="outline" className="text-xs py-0.5 px-2 font-medium bg-gray-50">
                {worker.role}
              </Badge>
            </div>

            {/* Week Utilization */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CalendarDays className="h-3 w-3 text-gray-500" />
                <span className="text-xs text-gray-600">
                  {Object.values(jobsByDay).flat().length} jobs
                </span>
              </div>
              
              {/* Utilization Bar */}
              <div className="flex items-center gap-1">
                <div className={cn(
                  'w-16 h-2 rounded-full border',
                  getUtilizationBg(weekUtilization)
                )}>
                  <div 
                    className={cn(
                      'h-full rounded-full transition-all',
                      getUtilizationColor(weekUtilization)
                    )}
                    style={{ width: `${Math.min(weekUtilization, 100)}%` }}
                  />
                </div>
                <span className="text-xs font-medium text-gray-600">
                  {Math.round(weekUtilization)}%
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Week View Grid - Days as Columns */}
      <div 
        className="absolute left-64 top-0 bottom-0 right-0 grid grid-cols-7 divide-x divide-gray-200 touch-scroll"
      >
        {weekDays.map((day, dayIndex) => {
          const dayKey = format(day, 'yyyy-MM-dd')
          const dayJobs = jobsByDay[dayKey] || []
          const isCurrentDay = isSameDay(day, new Date())
          const dayUtilization = getDayUtilization(dayJobs);
          const isExpanded = expandedDay === dayIndex;
          const shouldShowAllJobs = isExpanded || dayJobs.length <= 3;
          const visibleJobs = shouldShowAllJobs ? dayJobs : dayJobs.slice(0, 2);
          
          return (
            <div
              key={dayKey}
              className={cn(
                "relative flex flex-col",
                isCurrentDay && "bg-blue-50/30",
                isSameDay(day, selectedDate) && "ring-1 ring-inset ring-blue-200"
              )}
            >
              {/* Day Content */}
              <div className="p-2 h-full overflow-y-auto">
                {/* Jobs for the day */}
                <div className="space-y-1.5">
                  {visibleJobs.map((job) => {
                    const jobDate = new Date(job.scheduled_at);
                    
                    return (
                      <motion.div
                        key={job.id}
                        className={cn(
                          'flex flex-col p-2 rounded border-l-2 shadow-sm cursor-pointer bg-white',
                          'hover:shadow-md active:scale-95 transition-all duration-150',
                          job.priority === 'urgent' ? 'border-l-red-500' : 
                          job.priority === 'high' ? 'border-l-orange-500' : 
                          job.priority === 'medium' ? 'border-l-blue-500' : 'border-l-gray-500',
                          job.status === 'scheduled' ? 'bg-blue-50' :
                          job.status === 'in_progress' ? 'bg-yellow-50' :
                          job.status === 'completed' ? 'bg-green-50' :
                          job.status === 'cancelled' ? 'bg-gray-50' :
                          job.status === 'overdue' ? 'bg-red-50' : ''
                        )}
                        whileHover={{ y: -2 }}
                        onClick={() => {
                          // Handle job click - would dispatch selected job event
                        }}
                      >
                        <div className="font-medium text-xs truncate-text">{job.title}</div>
                        <div className="text-xs text-gray-500 mt-1 flex items-center gap-1">
                          <Clock className="h-3 w-3 text-blue-500 flex-shrink-0" />
                          <span className="truncate-text">
                            {format(jobDate, 'h:mm a')} 
                            {job.duration_hours && ` - ${format(addHours(jobDate, job.duration_hours), 'h:mm a')}`}
                          </span>
                        </div>
                        
                        {job.client_name && (
                          <div className="text-xs text-gray-600 mt-1 flex items-center gap-1">
                            <User className="h-3 w-3 text-gray-400 flex-shrink-0" />
                            <span className="truncate-text">{job.client_name}</span>
                          </div>
                        )}
                      </motion.div>
                    );
                  })}
                  
                  {/* Show more/less toggle */}
                  {dayJobs.length > 3 && (
                    <button
                      className="w-full text-xs text-blue-600 font-medium flex items-center justify-center p-1 hover:bg-blue-50 rounded transition-colors"
                      onClick={() => setExpandedDay(expandedDay === dayIndex ? null : dayIndex)}
                    >
                      {isExpanded ? (
                        <>
                          <ChevronUp className="h-3 w-3 mr-1" />
                          Show less
                        </>
                      ) : (
                        <>
                          <ChevronDown className="h-3 w-3 mr-1" />
                          Show {dayJobs.length - 2} more
                        </>
                      )}
                    </button>
                  )}
                  
                  {/* Empty state */}
                  {dayJobs.length === 0 && (
                    <div className="h-24 flex items-center justify-center">
                      <div className="text-xs text-gray-400">No jobs</div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </motion.div>
  )
} 