'use client'

import { useState } from 'react'
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { 
  Edit2, 
  Trash2, 
  MapPin, 
  Calendar, 
  Clock, 
  User, 
  Mail, 
  Phone,
  MoreHorizontal,
  AlertTriangle,
  CheckCircle,
  Play,
  Pause
} from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Job } from '@/lib/types'
import { cn } from '@/lib/utils'

interface JobCardProps {
  job: Job
  workerName?: string
  clientData?: any
  onEdit?: (job: Job) => void
  onDelete?: (jobId: string) => void
  onStatusChange?: (jobId: string, status: string) => void
}

const getStatusConfig = (status: string) => {
  switch (status) {
    case 'scheduled':
      return {
        color: 'bg-blue-50 text-blue-700 border-blue-200',
        icon: Calendar,
        label: 'Scheduled'
      }
    case 'in_progress':
      return {
        color: 'bg-purple-50 text-purple-700 border-purple-200',
        icon: Play,
        label: 'In Progress'
      }
    case 'completed':
      return {
        color: 'bg-green-50 text-green-700 border-green-200',
        icon: CheckCircle,
        label: 'Completed'
      }
    case 'cancelled':
      return {
        color: 'bg-gray-50 text-gray-700 border-gray-200',
        icon: Pause,
        label: 'Cancelled'
      }
    case 'rescheduled':
      return {
        color: 'bg-orange-50 text-orange-700 border-orange-200',
        icon: AlertTriangle,
        label: 'Rescheduled'
      }
    default:
      return {
        color: 'bg-gray-50 text-gray-700 border-gray-200',
        icon: Calendar,
        label: status
      }
  }
}

const getPriorityConfig = (priority?: string) => {
  switch (priority) {
    case 'high':
      return {
        color: 'bg-red-100 text-red-800',
        label: 'High Priority'
      }
    case 'medium':
      return {
        color: 'bg-yellow-100 text-yellow-800',
        label: 'Medium Priority'
      }
    case 'low':
      return {
        color: 'bg-green-100 text-green-800',
        label: 'Low Priority'
      }
    default:
      return {
        color: 'bg-gray-100 text-gray-800',
        label: 'Normal'
      }
  }
}

export function JobCard({ 
  job, 
  workerName, 
  clientData, 
  onEdit, 
  onDelete, 
  onStatusChange 
}: JobCardProps) {
  const [isExpanded, setIsExpanded] = useState(false)
  
  const statusConfig = getStatusConfig(job.status)
  const priorityConfig = getPriorityConfig((job as any).priority)
  
  const formatDate = (dateStr: string) => {
    if (!dateStr) return 'No date set'
    const date = new Date(dateStr)
    return {
      date: date.toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric' 
      }),
      time: date.toLocaleTimeString('en-US', { 
        hour: 'numeric', 
        minute: '2-digit', 
        hour12: true 
      })
    }
  }

  const scheduledDateTime = job.scheduled_at ? formatDate(job.scheduled_at) : null

  return (
    <Card className={cn(
      "transition-all duration-200 hover:shadow-md hover:scale-[1.02] cursor-pointer",
      "border-l-4",
      job.status === 'scheduled' && "border-l-blue-500",
      job.status === 'in_progress' && "border-l-purple-500",
      job.status === 'completed' && "border-l-green-500",
      job.status === 'cancelled' && "border-l-gray-500",
      job.status === 'rescheduled' && "border-l-orange-500"
    )}>
      <CardContent className="p-4">
        <div className="space-y-3">
          {/* Header Row */}
          <div className="flex items-start justify-between">
            <div className="flex-1 min-w-0">
              <div className="flex items-center space-x-2 mb-1">
                <h3 className="font-semibold text-gray-900 truncate">
                  {job.title || 'Untitled Job'}
                </h3>
                                 {(job as any).priority && (job as any).priority !== 'normal' && (
                  <Badge 
                    className={cn(priorityConfig.color, "text-xs px-1.5 py-0.5")}
                  >
                    {priorityConfig.label}
                  </Badge>
                )}
              </div>
              
              {/* Client Info */}
              <div className="text-sm text-gray-600">
                <div className="font-medium">{job.client_name || 'No client assigned'}</div>
                {clientData && (
                  <div className="flex flex-col space-y-1 mt-1">
                    {clientData.email && (
                      <div className="flex items-center space-x-1">
                        <Mail className="h-3 w-3" />
                        <span className="truncate">{clientData.email}</span>
                      </div>
                    )}
                    {clientData.phone && (
                      <div className="flex items-center space-x-1">
                        <Phone className="h-3 w-3" />
                        <span>{clientData.phone}</span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Status and Actions */}
            <div className="flex items-center space-x-2 ml-3">
              <Badge className={cn(statusConfig.color, "border")}>
                <statusConfig.icon className="h-3 w-3 mr-1" />
                {statusConfig.label}
              </Badge>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="h-8 w-8 p-0 hover:bg-gray-100"
                  >
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => onEdit?.(job)}>
                    <Edit2 className="h-4 w-4 mr-2" />
                    Edit Job
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setIsExpanded(!isExpanded)}>
                    <User className="h-4 w-4 mr-2" />
                    {isExpanded ? 'Show Less' : 'Show Details'}
                  </DropdownMenuItem>
                  {onStatusChange && job.status !== 'completed' && (
                    <DropdownMenuItem 
                      onClick={() => onStatusChange(job.id, 
                        job.status === 'in_progress' ? 'completed' : 'in_progress'
                      )}
                    >
                      <Play className="h-4 w-4 mr-2" />
                      {job.status === 'in_progress' ? 'Mark Complete' : 'Start Job'}
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuItem 
                    onClick={() => onDelete?.(job.id)}
                    className="text-red-600 focus:text-red-600"
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete Job
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>

          {/* Date/Time and Worker Row */}
          <div className="flex flex-col md:flex-row md:items-center md:justify-between space-y-2 md:space-y-0">
                         <div className="flex items-center space-x-4 text-sm text-gray-600">
               {scheduledDateTime && typeof scheduledDateTime === 'object' && (
                 <div className="flex items-center space-x-1">
                   <Calendar className="h-4 w-4" />
                   <span>{scheduledDateTime.date}</span>
                   <Clock className="h-4 w-4 ml-2" />
                   <span>{scheduledDateTime.time}</span>
                 </div>
               )}
             </div>

            {/* Worker Assignment */}
            {workerName && (
              <div className="flex items-center space-x-2">
                <Avatar className="h-6 w-6">
                  <AvatarImage src={`/avatars/${job.worker_id}.png`} />
                  <AvatarFallback className="text-xs">
                    {workerName.split(' ').map(n => n[0]).join('').substring(0, 2)}
                  </AvatarFallback>
                </Avatar>
                <span className="text-sm font-medium text-gray-700">{workerName}</span>
              </div>
            )}
          </div>

          {/* Location */}
          {(job.location || clientData?.address) && (
            <div className="flex items-center space-x-1 text-sm text-gray-600">
              <MapPin className="h-4 w-4" />
              <span className="truncate">
                {job.location || clientData?.address}
              </span>
            </div>
          )}

          {/* Expanded Details */}
          {isExpanded && (
            <div className="pt-3 border-t border-gray-100">
              <div className="space-y-3">
                {job.description && (
                  <div>
                    <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                      Description
                    </label>
                    <p className="text-sm text-gray-700 mt-1">{job.description}</p>
                  </div>
                )}
                
                {(job as any).notes && (
                  <div>
                    <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                      Notes
                    </label>
                    <p className="text-sm text-gray-700 mt-1">{(job as any).notes}</p>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4 text-xs text-gray-500">
                  <div>
                    <span className="font-medium">Created:</span>
                    <div>{new Date(job.created_at).toLocaleDateString()}</div>
                  </div>
                  {job.updated_at && (
                    <div>
                      <span className="font-medium">Updated:</span>
                      <div>{new Date(job.updated_at).toLocaleDateString()}</div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
} 