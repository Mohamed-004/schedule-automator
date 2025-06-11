'use client'

import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { motion } from 'framer-motion'
import { Clock, User, MapPin, AlertTriangle, Star, Calendar } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

export interface Job {
  id: string
  title: string
  client_name?: string
  client?: { name: string }
  worker_name?: string
  worker?: { name: string } | null
  scheduled_at: string
  location?: string
  status: 'scheduled' | 'in_progress' | 'completed' | 'cancelled' | 'reschedule_pending'
  priority?: 'low' | 'medium' | 'high' | 'urgent'
  duration_hours?: number
  description?: string
}

interface JobCardProps {
  job: Job
  isDragging?: boolean
}

const priorityConfig = {
  low: { color: 'bg-gray-100 text-gray-700 border-gray-200', stars: 1 },
  medium: { color: 'bg-blue-100 text-blue-700 border-blue-200', stars: 2 },
  high: { color: 'bg-orange-100 text-orange-700 border-orange-200', stars: 3 },
  urgent: { color: 'bg-red-100 text-red-700 border-red-200', stars: 4 },
}

const statusConfig = {
  scheduled: { color: 'bg-indigo-50 border-indigo-200 shadow-indigo-100' },
  in_progress: { color: 'bg-blue-50 border-blue-200 shadow-blue-100' },
  completed: { color: 'bg-emerald-50 border-emerald-200 shadow-emerald-100' },
  cancelled: { color: 'bg-red-50 border-red-200 shadow-red-100' },
  reschedule_pending: { color: 'bg-amber-50 border-amber-200 shadow-amber-100' },
}

export function JobCard({ job, isDragging }: JobCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging: sortableIsDragging,
  } = useSortable({ id: job.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  const clientName = job.client_name || job.client?.name || 'No Client'
  const workerName = job.worker_name || job.worker?.name || 'Unassigned'
  const priority = job.priority || 'medium'
  const statusColors = statusConfig[job.status] || statusConfig.scheduled

  const formatTime = (dateString: string) => {
    try {
      const date = new Date(dateString)
      return date.toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
      })
    } catch {
      return 'Invalid Date'
    }
  }

  const isOverdue = new Date(job.scheduled_at) < new Date() && job.status === 'scheduled'

  return (
    <motion.div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={cn(
        'group relative cursor-grab active:cursor-grabbing',
        'bg-white rounded-xl border-2 transition-all duration-200',
        'hover:shadow-lg hover:-translate-y-1',
        statusColors.color,
        isDragging || sortableIsDragging ? 'shadow-2xl scale-105 rotate-2 z-50' : 'shadow-sm',
        'backdrop-blur-sm'
      )}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
    >
      {/* Gradient overlay for premium look */}
      <div className="absolute inset-0 bg-gradient-to-br from-white/20 via-transparent to-transparent rounded-xl pointer-events-none" />
      
      {/* Priority indicator */}
      <div className="absolute -top-1 -right-1 z-10">
        <div className={cn('px-2 py-1 rounded-full text-xs font-medium border', priorityConfig[priority].color)}>
          <div className="flex items-center gap-1">
            {Array.from({ length: priorityConfig[priority].stars }).map((_, i) => (
              <Star key={i} className="h-2.5 w-2.5 fill-current" />
            ))}
          </div>
        </div>
      </div>

      {/* Overdue warning */}
      {isOverdue && (
        <div className="absolute -top-1 -left-1 z-10">
          <div className="bg-red-500 text-white p-1 rounded-full animate-pulse">
            <AlertTriangle className="h-3 w-3" />
          </div>
        </div>
      )}

      <div className="p-4 space-y-3">
        {/* Header */}
        <div className="space-y-2">
          <h3 className="font-semibold text-gray-900 text-sm leading-tight line-clamp-2 group-hover:text-gray-700 transition-colors">
            {job.title}
          </h3>
          
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-gray-600 bg-gray-100 px-2 py-1 rounded-full">
              #{job.id.slice(-6)}
            </span>
            {job.duration_hours && (
              <Badge variant="outline" className="text-xs">
                {job.duration_hours}h
              </Badge>
            )}
          </div>
        </div>

        {/* Client */}
        <div className="flex items-center gap-2 text-sm">
          <div className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0" />
          <span className="text-gray-700 font-medium truncate">{clientName}</span>
        </div>

        {/* Worker */}
        <div className="flex items-center gap-2 text-sm">
          <User className="h-3.5 w-3.5 text-gray-500 flex-shrink-0" />
          <span className={cn(
            'truncate',
            workerName === 'Unassigned' ? 'text-gray-400 italic' : 'text-gray-600'
          )}>
            {workerName}
          </span>
        </div>

        {/* Date & Time */}
        <div className="flex items-center gap-2 text-sm">
          <Calendar className="h-3.5 w-3.5 text-gray-500 flex-shrink-0" />
          <span className={cn(
            'text-gray-600 font-medium',
            isOverdue && 'text-red-600 font-semibold'
          )}>
            {formatTime(job.scheduled_at)}
          </span>
        </div>

        {/* Location */}
        {job.location && job.location !== 'N/A' && (
          <div className="flex items-center gap-2 text-sm">
            <MapPin className="h-3.5 w-3.5 text-gray-500 flex-shrink-0" />
            <span className="text-gray-600 truncate">{job.location}</span>
          </div>
        )}

        {/* Description preview */}
        {job.description && (
          <div className="text-xs text-gray-500 line-clamp-2 italic">
            {job.description}
          </div>
        )}

        {/* Action dots for visual interest */}
        <div className="flex justify-center pt-1">
          <div className="flex gap-1">
            {[1, 2, 3].map((dot) => (
              <div 
                key={dot} 
                className="w-1 h-1 bg-gray-300 rounded-full group-hover:bg-gray-400 transition-colors"
              />
            ))}
          </div>
        </div>
      </div>

      {/* Hover glow effect */}
      <div className="absolute inset-0 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none">
        <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-blue-400/10 via-purple-400/10 to-pink-400/10" />
      </div>
    </motion.div>
  )
} 