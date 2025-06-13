'use client'

import React, { useState } from 'react'
import { motion } from 'framer-motion'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { 
  MoreHorizontal, 
  Phone,
  Activity,
  Clock,
  BriefcaseBusiness,
  User
} from 'lucide-react'
import { cn } from '@/lib/utils'
import type { Job, Worker } from './TimelineScheduler'
import { useWorkerAvailability } from '@/hooks/use-worker-availability'

interface WorkerRowProps {
  worker: Worker & {
    utilization: number
    totalHours: number
    jobCount: number
  }
  jobs: Job[]
  isEven: boolean
  height: number
  zoomLevel: '1hr'
  children?: React.ReactNode
}

const statusColors = {
  available: { bg: 'bg-green-100', dot: 'bg-green-500', text: 'text-green-700' },
  busy: { bg: 'bg-amber-100', dot: 'bg-amber-500', text: 'text-amber-700' },
  offline: { bg: 'bg-red-100', dot: 'bg-red-500', text: 'text-red-700' }
}

export function WorkerRow({ 
  worker, 
  jobs, 
  isEven, 
  height, 
  zoomLevel,
  children 
}: WorkerRowProps) {
  const [isHovered, setIsHovered] = useState(false)
  const [showContextMenu, setShowContextMenu] = useState(false)

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
  
  // Determine worker status message based on jobs and utilization
  const getStatusMessage = () => {
    if (worker.status === 'offline') return 'Out of Office';
    if (jobs.length === 0) return 'Available All Day';
    
    // Find the next job if there is one
    const now = new Date();
    const upcomingJobs = jobs
      .filter(job => new Date(job.scheduled_at) > now)
      .sort((a, b) => new Date(a.scheduled_at).getTime() - new Date(b.scheduled_at).getTime());
      
    if (upcomingJobs.length > 0) {
      const nextJob = upcomingJobs[0];
      const nextJobTime = new Date(nextJob.scheduled_at);
      return `Next job at ${nextJobTime.getHours()}:${String(nextJobTime.getMinutes()).padStart(2, '0')}`;
    }
    
    return worker.utilization > 80 ? 'Heavily Booked' : 'Partially Available';
  };
  
  // Get working hours as string - Database-First Approach
  const getWorkingHours = () => {
    // Use the same logic as green availability blocks
    const { displayText } = useWorkerAvailability(worker, new Date())
    return displayText
  };
  
  // Format time from HH:MM to readable format
  const formatTime = (timeStr: string) => {
    const [hours, minutes] = timeStr.split(':').map(Number);
    const period = hours >= 12 ? 'PM' : 'AM';
    const hour12 = hours % 12 || 12;
    return `${hour12}:${minutes.toString().padStart(2, '0')} ${period}`;
  };

  return (
    <motion.div
      className={cn(
        'relative border-b border-gray-200/60 transition-all duration-300 group overflow-visible',
        isEven ? 'bg-gradient-to-r from-gray-50/50 via-gray-50/30 to-white' : 'bg-white',
        isHovered && 'bg-gradient-to-r from-blue-50/60 to-indigo-50/30 shadow-md border-blue-200/60 scale-[1.002]'
      )}
      style={{ 
        height, 
        minHeight: 180
      }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => {
        setIsHovered(false);
        setShowContextMenu(false);
      }}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      {/* Worker Info Panel - Enhanced with sticky behavior */}
      <div className="absolute left-0 top-0 bottom-0 w-64 bg-white/95 backdrop-blur-sm border-r border-gray-200/80 z-10 flex items-center shadow-sm">
        <div className="flex flex-col w-full p-3">
          {/* Worker Header with Avatar */}
          <div className="flex items-center mb-2">
            {/* Avatar with Status */}
            <div className="relative mr-3">
              <Avatar className="h-10 w-10 border-2 border-white shadow-sm">
                <AvatarImage src={worker.avatar} alt={worker.name} />
                <AvatarFallback className="text-sm font-semibold bg-blue-500 text-white">
                  {worker.name.split(' ').map(n => n[0]).join('')}
                </AvatarFallback>
              </Avatar>
              
              {/* Status Indicator */}
              <div className={cn(
                'absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-white flex items-center justify-center',
                statusColors[worker.status].dot
              )} />
            </div>

            {/* Worker Name and Role */}
            <div>
              <h3 className="font-semibold text-sm text-gray-900 truncate">
                {worker.name}
              </h3>
              <div className="text-xs text-gray-500">{worker.role}</div>
            </div>
            
            {/* Context Menu Button */}
            <div className="ml-auto">
              <Button
                variant="ghost"
                size="sm"
                className="h-7 w-7 p-0 rounded-full hover:bg-blue-50"
                onClick={() => setShowContextMenu(!showContextMenu)}
              >
                <MoreHorizontal className="h-3.5 w-3.5 text-gray-500" />
              </Button>
              
              {/* Context Menu */}
              {showContextMenu && (
                <div className="absolute right-2 top-8 w-44 bg-white rounded-md shadow-lg border border-gray-200 py-1 z-50">
                  <button className="w-full px-3 py-2 text-left text-xs text-gray-700 hover:bg-blue-50 flex items-center gap-2">
                    <BriefcaseBusiness className="h-3.5 w-3.5 text-blue-500" />
                    <span>View Worker Profile</span>
                  </button>
                  <button className="w-full px-3 py-2 text-left text-xs text-gray-700 hover:bg-blue-50 flex items-center gap-2">
                    <Phone className="h-3.5 w-3.5 text-green-500" />
                    <span>Call Worker</span>
                  </button>
                  <button className="w-full px-3 py-2 text-left text-xs text-gray-700 hover:bg-blue-50 flex items-center gap-2">
                    <Clock className="h-3.5 w-3.5 text-indigo-500" />
                    <span>View Schedule</span>
                  </button>
                </div>
              )}
            </div>
          </div>
          
          {/* Working Hours */}
          <div className="flex items-center gap-1.5 mb-2 text-xs">
            <Clock className="h-3.5 w-3.5 text-blue-500" />
            <span className="text-gray-700">{getWorkingHours()}</span>
          </div>
          
          {/* Job Count */}
          <div className="flex items-center gap-1.5 mb-2 text-xs">
            <BriefcaseBusiness className="h-3.5 w-3.5 text-gray-500" />
            <span className="text-gray-700">{worker.jobCount} job{worker.jobCount !== 1 ? 's' : ''} today</span>
          </div>

          {/* Status & Availability Badge */}
          <div className="flex items-center justify-between mt-1">
            <div className={cn(
              'px-2 py-1 rounded-full text-xs font-medium',
              statusColors[worker.status].bg,
              statusColors[worker.status].text
            )}>
              {getStatusMessage()}
            </div>
            
            {/* Utilization Bar */}
            <div className="flex items-center gap-1">
              <div className={cn(
                'w-16 h-2.5 rounded-full border',
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
              <span className="text-xs font-medium text-gray-600">
                {Math.round(worker.utilization)}%
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Timeline Content Area */}
      <div className="absolute left-64 top-0 bottom-0 right-0 overflow-visible">
        {children}
        
        {/* Grid Lines - Enhanced */}
        <div className="absolute inset-0 pointer-events-none">
          {Array.from({ length: 17 }, (_, i) => (
            <div
              key={i}
              className={cn(
                "absolute top-0 bottom-0 w-px", 
                i % 4 === 0 ? "bg-gray-200" : "bg-gray-100/70"
              )}
              style={{ left: `${(i / 16) * 100}%` }}
            />
          ))}
          
          {/* Hour shading for better visual reference */}
          {Array.from({ length: 8 }, (_, i) => (
            <div
              key={i}
              className={cn(
                "absolute top-0 bottom-0",
                i % 2 === 0 ? "bg-gray-50/30" : "bg-transparent"
              )}
              style={{ 
                left: `${(i * 2 / 16) * 100}%`,
                width: `${(2 / 16) * 100}%`
              }}
            />
          ))}
        </div>
      </div>

      {/* Row Separator Line */}
      <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-gray-200 via-gray-300 to-gray-200" />
    </motion.div>
  )
} 