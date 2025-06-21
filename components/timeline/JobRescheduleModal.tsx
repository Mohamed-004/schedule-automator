'use client'

import { useState, useTransition, useEffect } from 'react'
import { Calendar, Clock, User, AlertCircle, Check } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/components/ui/use-toast'
import { cn } from '@/lib/utils'
import { format, parseISO, addMinutes } from 'date-fns'

/**
 * Job Reschedule Modal Component
 * Provides comprehensive job rescheduling with worker availability validation
 * Integrates with existing reschedule API infrastructure
 */

interface JobRescheduleModalProps {
  jobId: string
  currentTitle: string
  currentDateTime: string
  currentDuration: number
  currentWorkerId?: string
  onRescheduleSuccess?: () => void
  children: React.ReactNode
}

interface WorkerAvailability {
  workerId: string
  isAvailable: boolean
  conflictingJobs?: string[]
  availableSlots?: Array<{
    start: string
    end: string
  }>
}

export default function JobRescheduleModal({
  jobId,
  currentTitle,
  currentDateTime,
  currentDuration,
  currentWorkerId,
  onRescheduleSuccess,
  children,
}: JobRescheduleModalProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [isCheckingAvailability, setIsCheckingAvailability] = useState(false)
  const [isLoadingWorkers, setIsLoadingWorkers] = useState(false)
  
  // Form state
  const [newDate, setNewDate] = useState('')
  const [newTime, setNewTime] = useState('')
  const [newWorkerId, setNewWorkerId] = useState(currentWorkerId || '')
  const [newDuration, setNewDuration] = useState(currentDuration.toString())
  
  // Workers data
  const [workers, setWorkers] = useState<Array<{
    id: string
    name: string
    email: string
  }>>([])
  
  // Availability state
  const [availability, setAvailability] = useState<WorkerAvailability | null>(null)
  const [validationMessage, setValidationMessage] = useState('')
  
  const { toast } = useToast()

  // Fetch workers when modal opens
  useEffect(() => {
    if (isOpen && workers.length === 0) {
      fetchWorkers()
    }
  }, [isOpen, workers.length])

  // Initialize form when modal opens
  useEffect(() => {
    if (isOpen) {
      const dateTime = parseISO(currentDateTime)
      setNewDate(format(dateTime, 'yyyy-MM-dd'))
      setNewTime(format(dateTime, 'HH:mm'))
      setNewWorkerId(currentWorkerId || '')
      setNewDuration(currentDuration.toString())
      setAvailability(null)
      setValidationMessage('')
    }
  }, [isOpen, currentDateTime, currentWorkerId, currentDuration])

  const fetchWorkers = async () => {
    setIsLoadingWorkers(true)
    try {
      const response = await fetch('/api/workers')
      if (response.ok) {
        const data = await response.json()
        setWorkers(data.workers || [])
      } else {
        toast({
          title: 'Error Loading Data',
          description: 'Failed to load workers list',
          variant: 'destructive',
        })
      }
    } catch (error) {
      toast({
        title: 'Error Loading Data',
        description: 'Failed to load workers list',
        variant: 'destructive',
      })
    } finally {
      setIsLoadingWorkers(false)
    }
  }

  // Check worker availability when form changes
  useEffect(() => {
    if (newDate && newTime && newWorkerId && newDuration) {
      checkWorkerAvailability()
    }
  }, [newDate, newTime, newWorkerId, newDuration])

  const checkWorkerAvailability = async () => {
    if (!newDate || !newTime || !newWorkerId || !newDuration) return

    setIsCheckingAvailability(true)
    setValidationMessage('')

    try {
      const proposedDateTime = `${newDate}T${newTime}:00.000Z`
      const proposedEndTime = addMinutes(parseISO(proposedDateTime), parseInt(newDuration))

      const response = await fetch('/api/workers/availability/check', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          workerId: newWorkerId,
          startTime: proposedDateTime,
          endTime: proposedEndTime.toISOString(),
          excludeJobId: jobId, // Exclude current job from conflict check
        }),
      })

      if (response.ok) {
        const result = await response.json()
        setAvailability(result)
        
        if (!result.isAvailable) {
          setValidationMessage(
            result.conflictingJobs?.length > 0 
              ? `Worker has ${result.conflictingJobs.length} conflicting job(s) at this time`
              : 'Worker is not available at this time'
          )
        } else {
          setValidationMessage('✓ Worker is available')
        }
      }
    } catch (error) {
      setValidationMessage('Failed to check availability')
    } finally {
      setIsCheckingAvailability(false)
    }
  }

  const handleReschedule = async () => {
    if (!newDate || !newTime || !newWorkerId || !newDuration) {
      toast({
        title: 'Missing Information',
        description: 'Please fill in all required fields',
        variant: 'destructive',
      })
      return
    }

    if (availability && !availability.isAvailable) {
      toast({
        title: 'Scheduling Conflict',
        description: 'Cannot reschedule to a time when the worker is not available',
        variant: 'destructive',
      })
      return
    }

    startTransition(async () => {
      try {
        const proposedDateTime = `${newDate}T${newTime}:00.000Z`
        
        const response = await fetch(`/api/jobs/${jobId}/reschedule`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            newStartTime: proposedDateTime,
            newDuration: parseInt(newDuration),
            newWorkerId: newWorkerId,
            requestedBy: 'business', // Admin reschedule
          }),
        })

        if (!response.ok) {
          throw new Error('Failed to reschedule job')
        }

        const result = await response.json()
        
        if (result.success) {
          toast({
            title: 'Job Rescheduled',
            description: `Job successfully rescheduled to ${format(parseISO(proposedDateTime), 'PPP p')}`,
          })
          
          setIsOpen(false)
          onRescheduleSuccess?.()
        }
      } catch (error) {
        toast({
          title: 'Reschedule Error',
          description: 'An error occurred while rescheduling the job',
          variant: 'destructive',
        })
      }
    })
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Reschedule Job</DialogTitle>
          <DialogDescription>
            Change the job date and time with worker availability validation
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="date" className="text-right">
              Date
            </Label>
            <Input
              id="date"
              value={newDate}
              onChange={(e) => setNewDate(e.target.value)}
              type="date"
              className="col-span-3"
            />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="time" className="text-right">
              Time
            </Label>
            <Input
              id="time"
              value={newTime}
              onChange={(e) => setNewTime(e.target.value)}
              type="time"
              className="col-span-3"
            />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="duration" className="text-right">
              Duration
            </Label>
            <Input
              id="duration"
              value={newDuration}
              onChange={(e) => setNewDuration(e.target.value)}
              type="number"
              className="col-span-3"
            />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="worker" className="text-right">
              Worker
            </Label>
                         <Select
               value={newWorkerId}
               onValueChange={(value) => setNewWorkerId(value)}
               disabled={isLoadingWorkers}
             >
              <SelectTrigger className="col-span-3">
                <SelectValue placeholder={
                  isLoadingWorkers ? "Loading workers..." : "Select a worker"
                } />
              </SelectTrigger>
              <SelectContent>
                {workers.map((worker) => (
                  <SelectItem key={worker.id} value={worker.id}>
                    {worker.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="availability" className="text-right">
              Availability
            </Label>
            <Badge className={cn(
              availability && availability.isAvailable ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800',
              'col-span-3'
            )}>
              {validationMessage}
            </Badge>
          </div>
        </div>
        <DialogFooter>
          <Button type="submit" onClick={handleReschedule}>
            {isPending ? 'Rescheduling...' : 'Reschedule'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
} 