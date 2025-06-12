'use client'

import { useState, useMemo } from 'react'
import {
  DndContext,
  DragOverlay,
  DragStartEvent,
  DragEndEvent,
  DragOverEvent,
  PointerSensor,
  useSensor,
  useSensors,
  closestCorners,
} from '@dnd-kit/core'
import { arrayMove } from '@dnd-kit/sortable'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Calendar, 
  Clock, 
  CheckCircle2, 
  XCircle, 
  RotateCcw,
  AlertTriangle,
  Sparkles 
} from 'lucide-react'
import { KanbanColumn } from './KanbanColumn'
import { JobCard, Job } from './JobCard'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'

interface KanbanBoardProps {
  jobs: Job[]
  onJobUpdate: (jobId: string, newStatus: string) => void
  onRefresh: () => void
}

const COLUMNS = [
  {
    id: 'scheduled',
    title: 'Scheduled',
    color: 'indigo',
    icon: <Calendar className="h-5 w-5" />,
    gradient: 'from-indigo-500 to-purple-600',
  },
  {
    id: 'in_progress',
    title: 'In Progress',
    color: 'blue',
    icon: <Clock className="h-5 w-5" />,
    gradient: 'from-blue-500 to-cyan-600',
  },
  {
    id: 'completed',
    title: 'Completed',
    color: 'emerald',
    icon: <CheckCircle2 className="h-5 w-5" />,
    gradient: 'from-emerald-500 to-green-600',
  },
  {
    id: 'cancelled',
    title: 'Cancelled',
    color: 'red',
    icon: <XCircle className="h-5 w-5" />,
    gradient: 'from-red-500 to-pink-600',
  },
  {
    id: 'reschedule_pending',
    title: 'Reschedule Pending',
    color: 'amber',
    icon: <RotateCcw className="h-5 w-5" />,
    gradient: 'from-amber-500 to-orange-600',
  },
]

export function KanbanBoard({ jobs, onJobUpdate, onRefresh }: KanbanBoardProps) {
  const [activeJob, setActiveJob] = useState<Job | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const supabase = createClient()

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  )

  // Group jobs by status
  const jobsByStatus = useMemo(() => {
    const grouped: Record<string, Job[]> = {}
    
    COLUMNS.forEach(column => {
      grouped[column.id] = jobs.filter(job => job.status === column.id)
    })
    
    return grouped
  }, [jobs])

  // Conflict detection
  const detectConflicts = (job: Job, newStatus: string): string[] => {
    const conflicts: string[] = []
    
    if (newStatus === 'in_progress') {
      // Check if worker is already assigned to another job at the same time
      const jobTime = new Date(job.scheduled_at)
      const workerName = job.worker_name || job.worker?.name
      
      if (workerName && workerName !== 'Unassigned') {
        const conflictingJobs = jobs.filter(j => 
          j.id !== job.id &&
          j.status === 'in_progress' &&
          (j.worker_name === workerName || j.worker?.name === workerName) &&
          Math.abs(new Date(j.scheduled_at).getTime() - jobTime.getTime()) < 2 * 60 * 60 * 1000 // 2 hours
        )
        
        if (conflictingJobs.length > 0) {
          conflicts.push(`Worker ${workerName} is already working on another job around this time`)
        }
      }
    }
    
    return conflicts
  }

  const handleDragStart = (event: DragStartEvent) => {
    const job = jobs.find(j => j.id === event.active.id)
    if (job) {
      setActiveJob(job)
      setIsDragging(true)
    }
  }

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event
    setActiveJob(null)
    setIsDragging(false)

    if (!over) return

    const jobId = active.id as string
    const newStatus = over.id as string
    const job = jobs.find(j => j.id === jobId)

    if (!job || job.status === newStatus) return

    // Check for conflicts
    const conflicts = detectConflicts(job, newStatus)
    
    if (conflicts.length > 0) {
      toast.error('Scheduling Conflict Detected', {
        description: conflicts[0],
        action: {
          label: 'Override',
          onClick: () => updateJobStatus(jobId, newStatus),
        },
      })
      return
    }

    await updateJobStatus(jobId, newStatus)
  }

  const updateJobStatus = async (jobId: string, newStatus: string) => {
    try {
      const { error } = await supabase
        .from('jobs')
        .update({ status: newStatus })
        .eq('id', jobId)

      if (error) throw error

      onJobUpdate(jobId, newStatus)
      
      // Success feedback with beautiful animation
      toast.success('Job Updated Successfully', {
        description: `Job moved to ${COLUMNS.find(c => c.id === newStatus)?.title}`,
        icon: <Sparkles className="h-4 w-4" />,
      })
      
      onRefresh()
    } catch (error) {
      console.error('Error updating job status:', error)
      toast.error('Failed to Update Job', {
        description: 'Please try again or contact support',
        icon: <AlertTriangle className="h-4 w-4" />,
      })
    }
  }

  return (
    <div className="h-full">
      {/* Header */}
      <motion.div
        className="mb-8 text-center"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <h2 className="text-3xl font-bold bg-gradient-to-r from-gray-900 via-blue-800 to-purple-800 bg-clip-text text-transparent mb-2">
          Job Pipeline
        </h2>
        <p className="text-gray-600">Drag and drop jobs to update their status</p>
      </motion.div>

      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        {/* Board Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6 h-full">
          {COLUMNS.map((column) => (
            <KanbanColumn
              key={column.id}
              id={column.id}
              title={column.title}
              jobs={jobsByStatus[column.id] || []}
              color={column.color}
              icon={column.icon}
              gradient={column.gradient}
            />
          ))}
        </div>

        {/* Drag Overlay */}
        <DragOverlay>
          {activeJob && (
            <motion.div
              initial={{ scale: 1.05, rotate: 5 }}
              animate={{ scale: 1.1, rotate: 8 }}
              className="transform"
            >
              <JobCard job={activeJob} isDragging />
            </motion.div>
          )}
        </DragOverlay>
      </DndContext>

      {/* Background Decorations */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden -z-10">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-400/5 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-400/5 rounded-full blur-3xl" />
        <div className="absolute top-3/4 left-1/2 w-64 h-64 bg-emerald-400/5 rounded-full blur-3xl" />
      </div>

      {/* Floating Stats */}
      {isDragging && (
        <motion.div
          className="fixed bottom-8 right-8 bg-white/90 backdrop-blur-md rounded-2xl p-4 shadow-2xl border"
          initial={{ opacity: 0, scale: 0.8, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.8, y: 20 }}
        >
          <div className="flex items-center gap-3">
            <div className="w-3 h-3 bg-blue-500 rounded-full animate-pulse" />
            <span className="font-medium text-gray-700">Moving job...</span>
          </div>
        </motion.div>
      )}
    </div>
  )
} 