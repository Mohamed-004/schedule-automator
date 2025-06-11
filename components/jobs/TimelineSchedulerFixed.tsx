'use client'

import React, { useState, useMemo } from 'react'
import { format, parseISO, isSameDay, addDays, startOfDay } from 'date-fns'
import { Clock, User, ArrowLeft, ArrowRight } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar'
import { TooltipProvider } from '@/components/ui/tooltip'
import type { Job, Worker } from './TimelineScheduler' // Importing types from the old component

interface TimelineSchedulerFixedProps {
  jobs: Job[]
  workers: Worker[]
  selectedDate: Date
  viewMode: 'day' | 'week'
  onDateChange: (date: Date) => void
  onViewModeChange: (mode: 'day' | 'week') => void
  onJobUpdate: (jobId: string, updates: Partial<Job>) => void
  onJobMove: (jobId: string, newWorkerId: string | null, newTime: Date) => void
}

export function TimelineSchedulerFixed({
  jobs,
  workers,
  selectedDate,
  viewMode,
  onDateChange,
  onViewModeChange,
}: TimelineSchedulerFixedProps) {
  const [selectedJob, setSelectedJob] = useState<Job | null>(null)

  const timeRange = useMemo(() => {
    let earliestStart = 7 // Default 7 AM
    let latestEnd = 19   // Default 7 PM

    return {
        START_HOUR: earliestStart,
        END_HOUR: latestEnd,
    }
  }, [])

  const todayJobs = useMemo(() => {
    return jobs.filter(job => isSameDay(parseISO(job.scheduled_at), selectedDate))
  }, [jobs, selectedDate])

  const workerJobs = useMemo(() => {
    const grouped: Record<string, Job[]> = {}
    todayJobs.forEach(job => {
      if (job.worker_id) {
        if (!grouped[job.worker_id]) grouped[job.worker_id] = []
        grouped[job.worker_id].push(job)
      }
    })
    return grouped
  }, [todayJobs])

  const timeSlots = useMemo(() => {
    const slots = []
    for (let hour = timeRange.START_HOUR; hour <= timeRange.END_HOUR; hour++) {
      slots.push(hour)
    }
    return slots
  }, [timeRange])

  if (viewMode === 'week') {
    return (
        <div className="flex flex-col items-center justify-center h-full text-gray-500">
            <p>Week view is not available in this layout.</p>
            <Button onClick={() => onViewModeChange('day')} className="mt-4">Switch to Day View</Button>
        </div>
    )
  }

  return (
    <TooltipProvider>
      <div className="flex flex-col w-full h-full bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-3 border-b border-gray-200 bg-white sticky top-0 z-30">
          <h2 className="text-lg font-semibold text-gray-800">Schedule</h2>
          <div className="flex items-center bg-white shadow-sm border border-gray-200 rounded-md">
            <Button size="sm" variant="ghost" className="px-2" onClick={() => onDateChange(addDays(selectedDate, -1))}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div className="px-3 py-1.5 text-sm font-medium">
              {format(selectedDate, 'MMMM d, yyyy')}
            </div>
            <Button size="sm" variant="ghost" className="px-2" onClick={() => onDateChange(addDays(selectedDate, 1))}>
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
          <div className="bg-gray-100 rounded-full p-0.5 flex">
            <button
              className={cn( "rounded-full px-3 py-1 text-xs font-medium transition-colors", viewMode === 'day' ? "bg-white text-gray-800 shadow" : "text-gray-600")}
              onClick={() => onViewModeChange('day')}
            >
              Day View
            </button>
            <button
              className={cn("rounded-full px-3 py-1 text-xs font-medium transition-colors", viewMode === 'week' ? "bg-white text-gray-800 shadow" : "text-gray-600")}
              onClick={() => onViewModeChange('week')}
            >
              Week View
            </button>
          </div>
        </div>

        {/* CSS Grid Timeline */}
        <div className="flex-1 overflow-auto">
            <div
                className="relative"
                style={{
                    display: 'grid',
                    gridTemplateColumns: '240px 1fr',
                    gridTemplateRows: `auto repeat(${workers.length}, 100px)`,
                    minWidth: `${(timeSlots.length) * 120}px`
                }}
            >
                {/* Header Left: Worker Column Title */}
                <div className="sticky top-0 z-20 bg-gray-50 border-r border-b border-gray-200 p-3 flex items-center justify-center">
                    <div className="flex items-center gap-2 text-sm font-semibold text-gray-700">
                        <Clock className="h-4 w-4" />
                        Team Schedule
                    </div>
                </div>

                {/* Header Right: Time Axis */}
                <div className="sticky top-0 z-20 bg-white border-b border-gray-200 grid"
                     style={{ gridTemplateColumns: `repeat(${timeSlots.length}, 1fr)` }}>
                    {timeSlots.map(hour => (
                        <div key={hour} className="border-r border-gray-100 last:border-r-0 p-2 text-center">
                            <div className="text-sm font-bold text-gray-800">
                                {format(new Date(new Date().setHours(hour, 0)), 'h a')}
                            </div>
                        </div>
                    ))}
                </div>

                {/* Worker Column */}
                 <div className="sticky left-0 z-10" style={{gridRow: `span ${workers.length}`}}>
                    {workers.map((worker, index) => (
                        <div
                            key={worker.id}
                            className={cn( "border-r border-b border-gray-200 p-3 flex items-center h-[100px]", index % 2 === 0 ? "bg-white" : "bg-gray-50")}
                        >
                             <div className="flex items-center w-full">
                                <Avatar className="h-10 w-10 mr-3">
                                    <AvatarImage src={worker.avatar} alt={worker.name} />
                                    <AvatarFallback className="bg-blue-500 text-white text-sm">
                                    {worker.name.split(' ').map(n => n[0]).join('')}
                                    </AvatarFallback>
                                </Avatar>
                                <div>
                                    <h3 className="font-semibold text-sm text-gray-900">{worker.name}</h3>
                                    <p className="text-xs text-gray-500">{worker.role}</p>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Timeline Grid Content */}
                <div className="relative col-start-2" style={{gridRow: `span ${workers.length}`}}>
                     {/* Vertical Grid Lines */}
                    <div className="absolute inset-0 grid" style={{ gridTemplateColumns: `repeat(${timeSlots.length}, 1fr)`}}>
                        {timeSlots.map(hour => (
                            <div key={hour} className="border-r border-gray-100"></div>
                        ))}
                    </div>

                    {/* Horizontal Grid Lines + Jobs for each worker */}
                    <div className="relative" style={{ display: 'grid', gridTemplateRows: `repeat(${workers.length}, 100px)`}}>
                        {workers.map((worker) => {
                            const jobsForWorker = workerJobs[worker.id] || [];
                            return (
                                <div key={worker.id} className="border-b border-gray-200 relative">
                                    {/* Worker Availability Background */}
                                    {worker.working_hours?.map((shift, shiftIndex) => {
                                        const [startHour, startMin] = shift.start.split(':').map(Number);
                                        const [endHour, endMin] = shift.end.split(':').map(Number);
                                        const shiftStart = startHour + startMin / 60;
                                        const shiftEnd = endHour + endMin / 60;

                                        const totalHours = timeRange.END_HOUR - timeRange.START_HOUR;
                                        const left = ((shiftStart - timeRange.START_HOUR) / totalHours) * 100;
                                        const width = ((shiftEnd - shiftStart) / totalHours) * 100;

                                        return (
                                            <div key={shiftIndex} className="absolute top-0 bottom-0 bg-green-500/10"
                                                 style={{ left: `${left}%`, width: `${width}%`}} />
                                        )
                                    })}

                                    {/* Jobs */}
                                    {jobsForWorker.map(job => {
                                        const jobStart = parseISO(job.scheduled_at)
                                        const jobHour = jobStart.getHours() + jobStart.getMinutes() / 60

                                        const totalHours = timeRange.END_HOUR - timeRange.START_HOUR
                                        const left = ((jobHour - timeRange.START_HOUR) / totalHours) * 100
                                        const width = (job.duration_hours / totalHours) * 100

                                        if (left < 0 || left > 100) return null;

                                        return (
                                             <div
                                                key={job.id}
                                                className="absolute top-1 bottom-1 bg-blue-100 border border-blue-300 rounded px-2 py-1 shadow-sm cursor-pointer hover:bg-blue-200 transition-colors"
                                                style={{ left: `${left}%`, width: `${width}%`}}
                                                onClick={() => setSelectedJob(job)}
                                            >
                                                <div className="text-xs font-semibold text-blue-900 truncate">{job.title}</div>
                                                <div className="text-xs text-blue-700 truncate">{job.client_name || 'No Client'}</div>
                                            </div>
                                        )
                                    })}
                                </div>
                            )
                        })}

                         {/* Current Time Indicator */}
                        {(() => {
                            const now = new Date();
                            const currentHour = now.getHours() + now.getMinutes() / 60;
                            if (currentHour >= timeRange.START_HOUR && currentHour <= timeRange.END_HOUR) {
                                const totalHours = timeRange.END_HOUR - timeRange.START_HOUR;
                                const left = ((currentHour - timeRange.START_HOUR) / totalHours) * 100;
                                return <div className="absolute top-0 bottom-0 w-0.5 bg-red-500 z-10" style={{ left: `${left}%` }} />
                            }
                            return null;
                        })()}
                    </div>
                </div>
            </div>
        </div>

        {/* Job Details Modal */}
        {selectedJob && (
          <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center" onClick={() => setSelectedJob(null)}>
            <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4" onClick={e => e.stopPropagation()}>
              <div className="p-4 border-b flex justify-between items-center">
                <h2 className="text-lg font-semibold">{selectedJob.title}</h2>
                <button onClick={() => setSelectedJob(null)}>Close</button>
              </div>
              <div className="p-4 space-y-3">
                <p><strong className="font-medium">Client:</strong> {selectedJob.client_name || 'N/A'}</p>
                <p><strong className="font-medium">Scheduled:</strong> {format(parseISO(selectedJob.scheduled_at), 'PPP p')} ({selectedJob.duration_hours}h)</p>
                {selectedJob.location && <p><strong className="font-medium">Location:</strong> {selectedJob.location}</p>}
              </div>
            </div>
          </div>
        )}
      </div>
    </TooltipProvider>
  )
} 