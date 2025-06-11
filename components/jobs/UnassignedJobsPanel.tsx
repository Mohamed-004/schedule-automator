'use client'

import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useDroppable } from '@dnd-kit/core'
import { AlertTriangle, Clock, ChevronRight, ChevronDown, Filter, Search } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import { JobCard } from './JobCard'
import type { Job } from './TimelineScheduler'

interface UnassignedJobsPanelProps {
  jobs: Job[]
}

export function UnassignedJobsPanel({ jobs }: UnassignedJobsPanelProps) {
  const [isExpanded, setIsExpanded] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [priorityFilter, setPriorityFilter] = useState<'all' | 'urgent' | 'high'>('all')

  const { setNodeRef, isOver } = useDroppable({
    id: 'unassigned-jobs',
    data: {
      type: 'unassigned',
    },
  })

  // Filter jobs
  const filteredJobs = jobs.filter(job => {
    const matchesSearch = !searchTerm || 
      job.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      job.client_name.toLowerCase().includes(searchTerm.toLowerCase())
    
    const matchesPriority = priorityFilter === 'all' || job.priority === priorityFilter
    
    return matchesSearch && matchesPriority
  })

  // Group jobs by priority
  const urgentJobs = filteredJobs.filter(job => job.priority === 'urgent')
  const highJobs = filteredJobs.filter(job => job.priority === 'high')
  const otherJobs = filteredJobs.filter(job => !['urgent', 'high'].includes(job.priority))

  const totalJobs = filteredJobs.length
  const urgentCount = urgentJobs.length

  return (
    <div className={cn(
      'bg-white border-r border-gray-200 flex flex-col transition-all duration-300',
      isExpanded ? 'w-80' : 'w-12'
    )}>
      {/* Header */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="flex items-center gap-2 text-sm font-semibold text-gray-700 hover:text-gray-900 transition-colors"
          >
            {isExpanded ? (
              <ChevronDown className="h-4 w-4" />
            ) : (
              <ChevronRight className="h-4 w-4" />
            )}
            {isExpanded && 'Unassigned Jobs'}
          </button>
          
          {isExpanded && (
            <div className="flex items-center gap-2">
              <Badge variant={urgentCount > 0 ? "destructive" : "secondary"}>
                {totalJobs}
              </Badge>
              {urgentCount > 0 && (
                <AlertTriangle className="h-4 w-4 text-red-500" />
              )}
            </div>
          )}
        </div>

        {/* Search & Filters */}
        <AnimatePresence>
          {isExpanded && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="mt-3 space-y-2"
            >
              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  type="text"
                  placeholder="Search jobs..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9 h-8 text-sm"
                />
              </div>

              {/* Priority Filter */}
              <div className="flex gap-1">
                {(['all', 'urgent', 'high'] as const).map(priority => (
                  <button
                    key={priority}
                    onClick={() => setPriorityFilter(priority)}
                    className={cn(
                      'px-2 py-1 text-xs rounded-md font-medium transition-colors',
                      priorityFilter === priority
                        ? 'bg-blue-100 text-blue-700'
                        : 'text-gray-600 hover:bg-gray-100'
                    )}
                  >
                    {priority === 'all' ? 'All' : priority.charAt(0).toUpperCase() + priority.slice(1)}
                  </button>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Drop Zone */}
      <div
        ref={setNodeRef}
        className={cn(
          'flex-1 overflow-auto transition-colors',
          isOver && 'bg-green-50 border-green-200'
        )}
      >
        <AnimatePresence>
          {isExpanded && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="p-4 space-y-4"
            >
              {/* No Jobs Message */}
              {totalJobs === 0 && (
                <div className="text-center py-8">
                  <Clock className="h-8 w-8 text-gray-300 mx-auto mb-2" />
                  <p className="text-sm text-gray-500">No unassigned jobs</p>
                </div>
              )}

              {/* Urgent Jobs */}
              {urgentJobs.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <AlertTriangle className="h-4 w-4 text-red-500" />
                    <h3 className="text-sm font-semibold text-red-700">
                      Urgent ({urgentJobs.length})
                    </h3>
                  </div>
                  <div className="space-y-2">
                    {urgentJobs.map(job => (
                      <motion.div
                        key={job.id}
                        layout
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.8 }}
                      >
                        <JobCard job={job} />
                      </motion.div>
                    ))}
                  </div>
                </div>
              )}

              {/* High Priority Jobs */}
              {highJobs.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <div className="h-4 w-4 bg-orange-400 rounded-full" />
                    <h3 className="text-sm font-semibold text-orange-700">
                      High Priority ({highJobs.length})
                    </h3>
                  </div>
                  <div className="space-y-2">
                    {highJobs.map(job => (
                      <motion.div
                        key={job.id}
                        layout
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.8 }}
                      >
                        <JobCard job={job} />
                      </motion.div>
                    ))}
                  </div>
                </div>
              )}

              {/* Other Jobs */}
              {otherJobs.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <div className="h-4 w-4 bg-blue-400 rounded-full" />
                    <h3 className="text-sm font-semibold text-gray-700">
                      Standard ({otherJobs.length})
                    </h3>
                  </div>
                  <div className="space-y-2">
                    {otherJobs.map(job => (
                      <motion.div
                        key={job.id}
                        layout
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.8 }}
                      >
                        <JobCard job={job} />
                      </motion.div>
                    ))}
                  </div>
                </div>
              )}

              {/* Drop Zone Indicator */}
              {isOver && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="fixed inset-0 flex items-center justify-center bg-green-50/90 z-50"
                >
                  <div className="bg-white rounded-lg shadow-lg p-6 border-2 border-green-300 border-dashed">
                    <div className="text-center">
                      <div className="h-12 w-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
                        <ChevronDown className="h-6 w-6 text-green-600" />
                      </div>
                      <p className="text-sm font-medium text-green-800">
                        Drop to unassign job
                      </p>
                    </div>
                  </div>
                </motion.div>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Collapsed State */}
        {!isExpanded && totalJobs > 0 && (
          <div className="p-2">
            <div className="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center">
              <span className="text-xs font-bold text-red-600">{totalJobs}</span>
            </div>
          </div>
        )}
      </div>
    </div>
  )
} 