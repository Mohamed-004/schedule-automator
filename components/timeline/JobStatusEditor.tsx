'use client'

import { useState, useTransition } from 'react'
import { Check, ChevronDown, Clock, Play, CheckCircle, XCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { useToast } from '@/components/ui/use-toast'

/**
 * Job Status Editor Component
 * Provides inline status editing for jobs with visual feedback
 * Follows Next.js 14 Server Actions pattern for data mutation
 */

interface JobStatusEditorProps {
  jobId: string
  currentStatus: 'pending' | 'scheduled' | 'in_progress' | 'completed' | 'cancelled'
  onStatusChange?: (newStatus: string) => void
  disabled?: boolean
  size?: 'sm' | 'md' | 'lg'
}

const statusConfig = {
  pending: {
    label: 'Scheduled', // Treat pending as scheduled
    icon: Clock,
    color: 'bg-blue-100 text-blue-800 border-blue-200',
    hoverColor: 'hover:bg-blue-200',
  },
  scheduled: {
    label: 'Scheduled',
    icon: Clock,
    color: 'bg-blue-100 text-blue-800 border-blue-200',
    hoverColor: 'hover:bg-blue-200',
  },
  in_progress: {
    label: 'In Progress',
    icon: Play,
    color: 'bg-orange-100 text-orange-800 border-orange-200',
    hoverColor: 'hover:bg-orange-200',
  },
  completed: {
    label: 'Completed',
    icon: CheckCircle,
    color: 'bg-green-100 text-green-800 border-green-200',
    hoverColor: 'hover:bg-green-200',
  },
  cancelled: {
    label: 'Cancelled',
    icon: XCircle,
    color: 'bg-red-100 text-red-800 border-red-200',
    hoverColor: 'hover:bg-red-200',
  },
} as const

export default function JobStatusEditor({
  jobId,
  currentStatus,
  onStatusChange,
  disabled = false,
  size = 'md',
}: JobStatusEditorProps) {
  const [isPending, startTransition] = useTransition()
  const [localStatus, setLocalStatus] = useState(currentStatus)
  const { toast } = useToast()

  const handleStatusUpdate = async (newStatus: string) => {
    if (newStatus === localStatus || disabled) return

    startTransition(async () => {
      try {
        const response = await fetch(`/api/jobs?id=${jobId}`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            status: newStatus,
          }),
        })

        if (!response.ok) {
          throw new Error('Failed to update job status')
        }

        const result = await response.json()
        
        if (result.success) {
          setLocalStatus(newStatus as typeof currentStatus)
          onStatusChange?.(newStatus)
          
          toast({
            title: 'Status Updated',
            description: `Job status changed to ${statusConfig[newStatus as keyof typeof statusConfig].label}`,
          })
        } else {
          throw new Error(result.error || 'Failed to update status')
        }
      } catch (error) {
        toast({
          title: 'Error',
          description: error instanceof Error ? error.message : 'Failed to update job status',
          variant: 'destructive',
        })
      }
    })
  }

  const currentConfig = statusConfig[localStatus]
  const Icon = currentConfig.icon
  
  const sizeClasses = {
    sm: 'text-xs px-2 py-1',
    md: 'text-sm px-3 py-1.5',
    lg: 'text-base px-4 py-2',
  }

  if (disabled) {
    return (
      <Badge variant="outline" className={cn(currentConfig.color, sizeClasses[size])}>
        <Icon className="w-3 h-3 mr-1" />
        {currentConfig.label}
      </Badge>
    )
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          disabled={isPending}
          className={cn(
            'justify-between gap-2 border transition-colors',
            currentConfig.color,
            currentConfig.hoverColor,
            sizeClasses[size],
            isPending && 'opacity-50 cursor-not-allowed'
          )}
        >
          <div className="flex items-center gap-1">
            <Icon className="w-3 h-3" />
            <span>{currentConfig.label}</span>
          </div>
          <ChevronDown className="w-3 h-3" />
        </Button>
      </DropdownMenuTrigger>
      
      <DropdownMenuContent align="start" className="w-40">
        {Object.entries(statusConfig).map(([status, config]) => {
          const StatusIcon = config.icon
          const isSelected = status === localStatus
          
          return (
            <DropdownMenuItem
              key={status}
              onClick={() => handleStatusUpdate(status)}
              className={cn(
                'flex items-center gap-2 cursor-pointer',
                isSelected && 'bg-muted'
              )}
            >
              <StatusIcon className="w-4 h-4" />
              <span>{config.label}</span>
              {isSelected && <Check className="w-4 h-4 ml-auto" />}
            </DropdownMenuItem>
          )
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  )
} 