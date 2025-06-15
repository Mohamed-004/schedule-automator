'use client'

import React from 'react'
import { X, Clock, MapPin, User, Phone, Mail, Calendar, Edit, Trash2 } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { TimelineJob } from '@/lib/types'

interface TimelineModalProps {
  job: TimelineJob | null
  isOpen: boolean
  onClose: () => void
  onEdit?: (job: TimelineJob) => void
  onCancel?: (job: TimelineJob) => void
  onReassign?: (job: TimelineJob) => void
}

/**
 * TimelineModal displays full job details in a modal dialog
 * Provides actions for editing, canceling, and reassigning jobs
 */
export function TimelineModal({
  job,
  isOpen,
  onClose,
  onEdit,
  onCancel,
  onReassign
}: TimelineModalProps) {
  if (!job) return null

  // Status styling
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'scheduled':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200'
      case 'in_progress':
        return 'bg-blue-100 text-blue-800 border-blue-200'
      case 'completed':
        return 'bg-green-100 text-green-800 border-green-200'
      case 'cancelled':
        return 'bg-red-100 text-red-800 border-red-200'
      case 'rescheduled':
        return 'bg-orange-100 text-orange-800 border-orange-200'
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  // Priority styling
  const getPriorityColor = (priority?: string) => {
    switch (priority) {
      case 'low':
        return 'bg-gray-100 text-gray-800 border-gray-200'
      case 'medium':
        return 'bg-blue-100 text-blue-800 border-blue-200'
      case 'high':
        return 'bg-orange-100 text-orange-800 border-orange-200'
      case 'urgent':
        return 'bg-red-100 text-red-800 border-red-200'
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  }

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }

  const formatDuration = (minutes: number) => {
    if (minutes < 60) return `${minutes} minutes`
    const hours = Math.floor(minutes / 60)
    const mins = minutes % 60
    return mins > 0 ? `${hours} hour${hours > 1 ? 's' : ''} ${mins} minutes` : `${hours} hour${hours > 1 ? 's' : ''}`
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span>Job Details</span>
            <div className="flex items-center gap-2">
              <Badge className={getStatusColor(job.status)}>
                {job.status.charAt(0).toUpperCase() + job.status.slice(1)}
              </Badge>
              {job.priority && (
                <Badge className={getPriorityColor(job.priority)} variant="outline">
                  {job.priority.charAt(0).toUpperCase() + job.priority.slice(1)} Priority
                </Badge>
              )}
            </div>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Job Information */}
          <div className="space-y-4">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">{job.title}</h3>
              {job.description && (
                <p className="text-gray-600 mt-1">{job.description}</p>
              )}
            </div>

            {/* Time and Duration */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                <Calendar className="h-5 w-5 text-gray-500" />
                <div>
                  <div className="font-medium text-gray-900">{formatDate(job.startTime)}</div>
                  <div className="text-sm text-gray-600">
                    {formatTime(job.startTime)} - {formatTime(job.endTime)}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                <Clock className="h-5 w-5 text-gray-500" />
                <div>
                  <div className="font-medium text-gray-900">Duration</div>
                  <div className="text-sm text-gray-600">{formatDuration(job.duration)}</div>
                </div>
              </div>
            </div>

            {/* Client Information */}
            <div className="space-y-3">
              <h4 className="font-medium text-gray-900">Client Information</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex items-center gap-3">
                  <User className="h-4 w-4 text-gray-500" />
                  <div>
                    <div className="font-medium">{job.client_name}</div>
                    <div className="text-sm text-gray-500">Client</div>
                  </div>
                </div>

                {job.location && (
                  <div className="flex items-start gap-3">
                    <MapPin className="h-4 w-4 text-gray-500 mt-0.5" />
                    <div>
                      <div className="font-medium">{job.location}</div>
                      <div className="text-sm text-gray-500">Location</div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Worker Information */}
            {job.worker_name && (
              <div className="space-y-3">
                <h4 className="font-medium text-gray-900">Assigned Worker</h4>
                <div className="flex items-center gap-3 p-3 bg-blue-50 rounded-lg">
                  <div className="w-8 h-8 rounded-full bg-blue-500 text-white flex items-center justify-center font-medium text-sm">
                    {job.worker_name.split(' ').map(n => n.charAt(0)).join('').slice(0, 2)}
                  </div>
                  <div>
                    <div className="font-medium text-gray-900">{job.worker_name}</div>
                    <div className="text-sm text-gray-600">Assigned Technician</div>
                  </div>
                </div>
              </div>
            )}

            {/* Conflict Warnings */}
            {job.conflictStatus === 'outside_availability' && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                <div className="flex items-center gap-2 text-red-800">
                  <div className="w-2 h-2 bg-red-500 rounded-full" />
                  <span className="font-medium">Scheduling Conflict</span>
                </div>
                <p className="text-sm text-red-700 mt-1">
                  This job is scheduled outside the worker's availability hours.
                </p>
              </div>
            )}

            {job.conflictStatus === 'overlapping' && (
              <div className="p-3 bg-orange-50 border border-orange-200 rounded-lg">
                <div className="flex items-center gap-2 text-orange-800">
                  <div className="w-2 h-2 bg-orange-500 rounded-full" />
                  <span className="font-medium">Time Overlap</span>
                </div>
                <p className="text-sm text-orange-700 mt-1">
                  This job overlaps with another scheduled job.
                </p>
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex flex-wrap gap-2 pt-4 border-t">
            {onEdit && (
              <Button onClick={() => onEdit(job)} className="flex items-center gap-2">
                <Edit className="h-4 w-4" />
                Edit Job
              </Button>
            )}

            {onReassign && (
              <Button variant="outline" onClick={() => onReassign(job)} className="flex items-center gap-2">
                <User className="h-4 w-4" />
                Reassign Worker
              </Button>
            )}

            {onCancel && job.status !== 'cancelled' && job.status !== 'completed' && (
              <Button variant="destructive" onClick={() => onCancel(job)} className="flex items-center gap-2">
                <Trash2 className="h-4 w-4" />
                Cancel Job
              </Button>
            )}

            <Button variant="outline" onClick={onClose} className="ml-auto">
              Close
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
} 