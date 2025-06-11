'use client'

import React, { useState } from 'react'
import { format, parseISO, addHours } from 'date-fns'
import { motion } from 'framer-motion'
import { 
  Clock, 
  MapPin, 
  AlertTriangle, 
  User, 
  MoreHorizontal, 
  Edit, 
  Calendar, 
  Check,
  RotateCw,
  Trash2,
  ChevronRight,
  ExternalLink
} from 'lucide-react'
import { cn } from '@/lib/utils'
import type { Job } from './TimelineScheduler'

interface JobCardProps {
  job: Job
  isDragging?: boolean
  hasConflict?: boolean
  style?: React.CSSProperties
  onAction?: (action: string, job: Job) => void
}

const statusColors = {
  scheduled: {
    bg: 'bg-blue-50',
    border: 'border-l-blue-400',
    text: 'text-blue-600',
    dot: 'bg-blue-500'
  },
  in_progress: {
    bg: 'bg-yellow-50',
    border: 'border-l-yellow-400',
    text: 'text-yellow-600',
    dot: 'bg-yellow-500'
  },
  completed: {
    bg: 'bg-green-50',
    border: 'border-l-green-400',
    text: 'text-green-600',
    dot: 'bg-green-500'
  },
  cancelled: {
    bg: 'bg-red-50',
    border: 'border-l-red-400',
    text: 'text-red-600',
    dot: 'bg-red-500'
  },
  overdue: {
    bg: 'bg-red-50',
    border: 'border-l-red-400',
    text: 'text-red-600',
    dot: 'bg-red-500'
  }
}

const priorityIcons = {
  low: <span className="text-blue-600 text-xs font-medium">Low</span>,
  medium: <span className="text-green-600 text-xs font-medium">Medium</span>,
  high: <span className="text-amber-600 text-xs font-medium">High</span>,
  urgent: <span className="bg-red-100 text-red-600 text-xs font-medium px-1.5 py-0.5 rounded-sm">Urgent</span>
}

export function JobCard({ job, isDragging = false, hasConflict = false, style, onAction }: JobCardProps) {
  const [showActions, setShowActions] = useState(false);
  
  const jobStart = parseISO(job.scheduled_at);
  const jobEnd = addHours(jobStart, job.duration_hours);
  
  const startTime = format(jobStart, 'h:mm a');
  const endTime = format(jobEnd, 'h:mm a');
  
  // Handle clicking on the card
  const handleCardClick = () => {
    if (onAction) {
      onAction('viewDetails', job);
    }
  };

  return (
    <motion.div
      style={style}
      layout
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      whileHover={{ scale: 1.01, y: -1, transition: { duration: 0.2 } }}
      whileTap={{ scale: 0.99 }}
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => setShowActions(false)}
      className={cn(
        'relative group select-none',
        'rounded-lg border-l-4 border border-gray-200 shadow hover:shadow-md transition-all duration-200',
        'p-3 min-h-[90px] min-w-[150px] bg-white/95 backdrop-blur-sm',
        statusColors[job.status as keyof typeof statusColors]?.bg,
        statusColors[job.status as keyof typeof statusColors]?.border,
        isDragging && 'shadow-xl rotate-2',
        hasConflict && 'ring-2 ring-red-400 ring-offset-1'
      )}
    >
      {/* Header: Status & Priority */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <div className={cn(
            'w-2 h-2 rounded-full',
            statusColors[job.status as keyof typeof statusColors]?.dot
          )} />
          <span className={cn(
            'text-xs px-2 py-0.5 rounded-full font-medium',
            statusColors[job.status as keyof typeof statusColors]?.text,
            'bg-white/80'
          )}>
            {job.status.replace('_', ' ')}
          </span>
          
          {/* Priority Badge */}
          {job.priority === 'urgent' && priorityIcons[job.priority]}
        </div>
      </div>

      {/* Main Content */}
      <div className="space-y-2">
        {/* Job Title */}
        <h4 className="font-semibold text-sm text-gray-900 line-clamp-2 leading-tight">
          {job.title}
        </h4>

        {/* Time & Duration */}
        <div className="flex items-center gap-1 text-xs">
          <Clock className="h-3 w-3 text-blue-600" />
          <span className="font-medium text-blue-700">{startTime}</span>
          <ChevronRight className="h-3 w-3 text-gray-400" />
          <span className="font-medium text-blue-700">{endTime}</span>
          <span className="text-gray-500 ml-1">({job.duration_hours}h)</span>
        </div>

        {/* Client Name */}
        <div className="flex items-center gap-1 text-xs text-gray-600">
          <User className="h-3 w-3 text-indigo-500" />
          <span className="truncate font-medium">{job.client_name}</span>
        </div>
        
        {/* Location (if available) */}
        {job.location && (
          <div className="flex items-center gap-1 text-xs text-gray-500">
            <MapPin className="h-3 w-3" />
            <span className="truncate">{job.location.split(',')[0]}</span>
          </div>
        )}
        
        {/* Conflict Warning */}
        {hasConflict && (
          <div className="flex items-center gap-1 text-xs text-red-600 mt-1 bg-red-50 px-1.5 py-1 rounded">
            <AlertTriangle className="h-3 w-3" />
            <span>Scheduling conflict</span>
          </div>
        )}
      </div>
    </motion.div>
  )
}

// Export for drag overlay
export default JobCard 