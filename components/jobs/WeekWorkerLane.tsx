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
            <Avatar className="h-12 w-12 border-2 border-white shadow-md">
              <AvatarImage src={worker.avatar} alt={worker.name} />
              <AvatarFallback className="text-sm font-semibold bg-gradient-to-br from-blue-500 to-purple-600 text-white">
                {worker.name.split(' ').map(n => n[0]).join('')}
              </AvatarFallback>
            </Avatar>
            
            {/* Status Indicator */}
            <div className={cn(
              'absolute -bottom-1 -right-1 w-5 h-5 rounded-full border-2 border-white',
              statusColors[worker.status]
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

      {/* New Week View Grid - Days as Columns */}
      <div 
        className="absolute left-64 top-0 bottom-0 right-0 grid grid-cols-7 divide-x divide-gray-200"
      >
        {weekDays.map((day, dayIndex) => {
          const dayKey = format(day, 'yyyy-MM-dd')
          const dayJobs = jobsByDay[dayKey] || []
          const isToday = isSameDay(day, new Date())
          const dayUtilization = getDayUtilization(dayJobs);
          const isExpanded = expandedDay === dayIndex;
          const shouldShowAllJobs = isExpanded || dayJobs.length <= 3;
          const visibleJobs = shouldShowAllJobs ? dayJobs : dayJobs.slice(0, 2);
          
          return (
            <div
              key={dayKey}
              className={cn(
                "relative flex flex-col",
                isToday && "bg-blue-50/30",
                isSameDay(day, selectedDate) && "ring-2 ring-inset ring-blue-200"
              )}
            >
              {/* Day Header */}
              <div className={cn(
                "sticky top-0 p-1 text-center border-b text-xs font-medium",
                isToday ? "bg-blue-100/50 text-blue-800" : "bg-gray-50 text-gray-700"
              )}>
                <div className="flex items-center justify-center">
                  <span>{dayNames[dayIndex]}</span>
                  <span className="ml-1">{format(day, 'd')}</span>
                </div>
                
                {/* Day Utilization Indicator */}
                {dayJobs.length > 0 && (
                  <div className="mt-1 flex justify-center">
                    <div className="w-full max-w-[50px] h-1.5 bg-gray-100 rounded-full overflow-hidden">
                      <div 
                        className={cn("h-full", getUtilizationColor(dayUtilization))} 
                        style={{ width: `${dayUtilization}%` }} 
                      />
                    </div>
                  </div>
                )}
              </div>
              
              {/* Jobs Count Badge */}
              {dayJobs.length > 0 && (
                <div className="absolute top-1 right-1 flex items-center">
                  <Badge variant="outline" className="h-4 px-1 text-[10px] bg-white">
                    {dayJobs.length}
                  </Badge>
                </div>
              )}

              {/* Job Cards - Vertical Stack */}
              <div className="p-1 space-y-1 overflow-y-auto">
                {dayJobs.length === 0 ? (
                  <div className="w-full h-full flex items-center justify-center min-h-[40px]">
                    <button className="text-[10px] text-gray-400 hover:text-gray-600 flex flex-col items-center p-1">
                      <Plus className="h-3 w-3" />
                      <span>Add</span>
                    </button>
                  </div>
                ) : (
                  <>
                    {visibleJobs.map((job, idx) => (
                      <div 
                        key={job.id}
                        className={cn(
                          "relative rounded border-l-2 bg-white shadow-sm text-xs p-1.5",
                          priorityColors[job.priority],
                          idx === 0 && "mt-0"
                        )}
                      >
                        <div className="font-medium text-gray-800 line-clamp-1 mb-0.5 text-[11px]">
                          {job.title}
                        </div>
                        
                        <div className="flex items-center text-[10px] text-gray-500">
                          <Clock className="h-2.5 w-2.5 mr-0.5 text-blue-500" />
                          {formatJobTime(job.scheduled_at)}
                          {job.duration_hours && (
                            <span className="ml-1 text-gray-400">({job.duration_hours}h)</span>
                          )}
                        </div>
                        
                        {job.client_name && (
                          <div className="flex items-center text-[10px] text-gray-500 mt-0.5">
                            <User className="h-2.5 w-2.5 mr-0.5 text-gray-400" />
                            <span className="truncate">{job.client_name}</span>
                          </div>
                        )}
                        
                        {/* Priority Indicator for Urgent */}
                        {job.priority === 'urgent' && (
                          <div className="absolute top-0 right-0 w-0 h-0 border-l-[8px] border-l-transparent border-t-[8px] border-t-red-500" />
                        )}
                      </div>
                    ))}
                    
                    {/* "More Jobs" Indicator */}
                    {dayJobs.length > visibleJobs.length && !isExpanded && (
                      <button 
                        className="w-full bg-gray-50 hover:bg-gray-100 rounded p-0.5 text-[10px] flex items-center justify-center"
                        onClick={() => setExpandedDay(dayIndex)}
                      >
                        <ChevronDown className="h-3 w-3 text-gray-500" />
                        <span className="ml-1 text-gray-600">{dayJobs.length - visibleJobs.length} more</span>
                      </button>
                    )}
                    
                    {/* Collapse Button */}
                    {isExpanded && (
                      <button 
                        className="w-full bg-blue-50 hover:bg-blue-100 rounded p-0.5 text-[10px] flex items-center justify-center"
                        onClick={() => setExpandedDay(null)}
                      >
                        <ChevronUp className="h-3 w-3 text-blue-500" />
                        <span className="ml-1 text-blue-600">Collapse</span>
                      </button>
                    )}
                  </>
                )}
              </div>
            </div>
          )
        })}
        
        {/* Multi-day job bars (spanning across columns) */}
        {multiDayJobs.map(({ job, startDay, endDay }) => (
          <div 
            key={`multi-${job.id}`}
            className="absolute z-30 h-6 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full opacity-80 flex items-center px-2 text-white text-xs"
            style={{
              left: `calc(${startDay} * (100% / 7) + 256px)`,
              width: `calc(${endDay - startDay + 1} * (100% / 7) - 8px)`,
              top: `${height - 20}px`
            }}
          >
            <div className="truncate">
              {job.title} ({job.duration_hours}h)
            </div>
          </div>
        ))}
      </div>
    </motion.div>
  )
} 