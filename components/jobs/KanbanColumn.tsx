'use client'

import { useDroppable } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Calendar, 
  Clock, 
  CheckCircle2, 
  XCircle, 
  RotateCcw, 
  Plus,
  TrendingUp
} from 'lucide-react'
import { JobCard, Job } from './JobCard'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

interface KanbanColumnProps {
  id: string
  title: string
  jobs: Job[]
  color: string
  icon: React.ReactNode
  gradient: string
}

const statusIcons = {
  scheduled: Calendar,
  in_progress: Clock,
  completed: CheckCircle2,
  cancelled: XCircle,
  reschedule_pending: RotateCcw,
}

const statusGradients = {
  scheduled: 'from-indigo-500 to-purple-600',
  in_progress: 'from-blue-500 to-cyan-600',
  completed: 'from-emerald-500 to-green-600',
  cancelled: 'from-red-500 to-pink-600',
  reschedule_pending: 'from-amber-500 to-orange-600',
}

export function KanbanColumn({ id, title, jobs, color, icon, gradient }: KanbanColumnProps) {
  const { setNodeRef, isOver } = useDroppable({ id })

  const getStatusMetrics = () => {
    const totalHours = jobs.reduce((sum, job) => sum + (job.duration_hours || 0), 0)
    const urgentJobs = jobs.filter(job => job.priority === 'urgent').length
    
    return { totalHours, urgentJobs }
  }

  const { totalHours, urgentJobs } = getStatusMetrics()

  return (
    <motion.div
      className="flex flex-col h-full min-h-[600px]"
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.5 }}
    >
      {/* Column Header */}
      <div className="relative overflow-hidden rounded-2xl mb-4 group">
        {/* Gradient Background */}
        <div className={cn('bg-gradient-to-br p-6 text-white relative', gradient)}>
          {/* Decorative overlay */}
          <div className="absolute inset-0 bg-black/10 group-hover:bg-black/5 transition-colors duration-300" />
          <div className="absolute inset-0 bg-gradient-to-br from-white/20 via-transparent to-transparent" />
          
          {/* Content */}
          <div className="relative z-10">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-white/20 rounded-xl backdrop-blur-sm">
                  {icon}
                </div>
                <div>
                  <h3 className="font-bold text-lg">{title}</h3>
                  <p className="text-white/80 text-sm">
                    {jobs.length} {jobs.length === 1 ? 'job' : 'jobs'}
                  </p>
                </div>
              </div>
              
              <motion.div 
                className="p-2 bg-white/20 rounded-xl backdrop-blur-sm cursor-pointer hover:bg-white/30 transition-colors"
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
              >
                <Plus className="h-5 w-5" />
              </motion.div>
            </div>

            {/* Metrics */}
            <div className="flex items-center gap-4 text-sm">
              {totalHours > 0 && (
                <div className="flex items-center gap-1 bg-white/20 px-2 py-1 rounded-lg backdrop-blur-sm">
                  <Clock className="h-4 w-4" />
                  <span>{totalHours}h total</span>
                </div>
              )}
              
              {urgentJobs > 0 && (
                <div className="flex items-center gap-1 bg-red-500/30 px-2 py-1 rounded-lg backdrop-blur-sm">
                  <TrendingUp className="h-4 w-4" />
                  <span>{urgentJobs} urgent</span>
                </div>
              )}
            </div>
          </div>

          {/* Animated background pattern */}
          <div className="absolute inset-0 opacity-10">
            <div className="absolute top-0 left-0 w-20 h-20 bg-white rounded-full -translate-x-10 -translate-y-10 group-hover:scale-150 transition-transform duration-1000" />
            <div className="absolute bottom-0 right-0 w-16 h-16 bg-white rounded-full translate-x-8 translate-y-8 group-hover:scale-125 transition-transform duration-1000 delay-200" />
          </div>
        </div>
      </div>

      {/* Drop Zone */}
      <div
        ref={setNodeRef}
        className={cn(
          'flex-1 min-h-[400px] p-4 rounded-2xl border-2 border-dashed transition-all duration-300',
          isOver 
            ? 'border-blue-400 bg-blue-50/50 shadow-lg scale-105' 
            : 'border-gray-200 bg-gray-50/30',
          'backdrop-blur-sm'
        )}
      >
        <SortableContext items={jobs.map(job => job.id)} strategy={verticalListSortingStrategy}>
          <AnimatePresence mode="popLayout">
            {jobs.length === 0 ? (
              <motion.div 
                className="flex flex-col items-center justify-center h-full text-gray-400"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                <div className="p-8 rounded-2xl bg-white/50 backdrop-blur-sm border border-gray-200 text-center">
                  <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 rounded-2xl flex items-center justify-center">
                    {icon}
                  </div>
                  <p className="font-medium mb-2">No jobs yet</p>
                  <p className="text-sm text-gray-500">Drag jobs here or create new ones</p>
                </div>
              </motion.div>
            ) : (
              <div className="space-y-4">
                {jobs.map((job) => (
                  <motion.div
                    key={job.id}
                    layout
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    transition={{ duration: 0.2 }}
                  >
                    <JobCard job={job} />
                  </motion.div>
                ))}
              </div>
            )}
          </AnimatePresence>
        </SortableContext>

        {/* Drop indicator */}
        {isOver && (
          <motion.div
            className="absolute inset-0 rounded-2xl border-4 border-blue-400 bg-blue-100/20 pointer-events-none"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
          >
            <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-blue-400/20 to-transparent" />
          </motion.div>
        )}
      </div>
    </motion.div>
  )
} 