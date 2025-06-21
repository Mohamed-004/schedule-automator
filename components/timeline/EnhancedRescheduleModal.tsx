'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { format, parseISO, isBefore, isAfter, addDays, startOfDay, isToday, isTomorrow } from 'date-fns'
import { cn } from '@/lib/utils'
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle 
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Calendar } from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Switch } from '@/components/ui/switch'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { ProgressStepper } from '@/components/ui/progress-stepper'
import { 
  Clock, 
  User, 
  Phone, 
  MapPin, 
  CalendarIcon, 
  CheckCircle, 
  AlertTriangle, 
  Loader2, 
  Info, 
  RefreshCw, 
  Zap,
  ChevronDown,
  ChevronUp
} from 'lucide-react'

/**
 * Professional Reschedule Modal Component
 * A complete UI/UX overhaul with a focus on performance, professional design, and robust functionality.
 */

// Interfaces
interface Job {
  id: string
  title: string
  description?: string
  scheduled_at: string
  duration_minutes: number
  client_name?: string
  client_phone?: string
  location?: string
  status: string
  worker_id?: string
  worker?: { id: string; name: string }
  // Additional fields from database join
  worker_name?: string
  client_id?: string
  // Nested objects from joins
  clients?: { name: string; phone?: string; email?: string }
  workers?: { name: string; email?: string }
}

interface Worker {
  id: string
  name: string
  phone?: string
  email?: string
  status: string
}

interface WorkerAvailability {
  workerId: string
  workerName: string
  isAvailable: boolean
  utilizationPercentage: number
  conflictingJobs: number
  nextAvailableSlot?: string
}

interface NextAvailableSlot {
  workerId: string
  workerName: string
  dateTime: string
  utilizationPercentage?: number
}

interface EnhancedRescheduleModalProps {
  isOpen: boolean
  onClose: () => void
  job: Job | null
  onReschedule: (jobId: string, newDateTime: string, workerId: string, reason?: string, notifyClient?: boolean) => Promise<void>
}

export function EnhancedRescheduleModal({
  isOpen,
  onClose,
  job,
  onReschedule,
}: EnhancedRescheduleModalProps) {
  // State Management
  const [currentStep, setCurrentStep] = useState<'select-time' | 'choose-worker' | 'confirm'>('select-time')
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined)
  const [selectedTime, setSelectedTime] = useState<string>('')
  const [selectedWorkerId, setSelectedWorkerId] = useState<string>('')
  const [rescheduleReason, setRescheduleReason] = useState<string>('')
  const [notifyClient, setNotifyClient] = useState<boolean>(true)
  
  // Loading States
  const [isCheckingAvailability, setIsCheckingAvailability] = useState<boolean>(false)
  const [isLoadingNextSlots, setIsLoadingNextSlots] = useState<boolean>(false)
  const [isProcessing, setIsProcessing] = useState<boolean>(false)
  const [isCalendarOpen, setIsCalendarOpen] = useState<boolean>(false)
  const [isJobDetailsOpen, setIsJobDetailsOpen] = useState<boolean>(false)
  
  // Data States
  const [workers, setWorkers] = useState<Worker[]>([])
  const [workerAvailability, setWorkerAvailability] = useState<WorkerAvailability[]>([])
  const [nextAvailableSlots, setNextAvailableSlots] = useState<NextAvailableSlot[]>([])
  const [validationErrors, setValidationErrors] = useState<string[]>([])
  const [completeJobData, setCompleteJobData] = useState<Job | null>(null)
  const [isLoadingJobData, setIsLoadingJobData] = useState<boolean>(false)

  // Computed Values
  const availableWorkers = workerAvailability.filter(w => w.isAvailable)
  const unavailableWorkers = workerAvailability.filter(w => !w.isAvailable)
  const hasNoAvailableWorkers = workerAvailability.length > 0 && availableWorkers.length === 0

  // Steps Configuration  
  const steps = [
    { id: 'select-time', title: 'Select Time', description: 'Choose new date and time', icon: Clock },
    { id: 'choose-worker', title: 'Choose Worker', description: 'Select available worker', icon: User },
    { id: 'confirm', title: 'Confirm', description: 'Review and confirm changes', icon: CheckCircle }
  ]

  // Reset form when modal opens/closes
  const resetForm = () => {
    setCurrentStep('select-time')
    setSelectedDate(undefined)
    setSelectedTime('')
    setSelectedWorkerId('')
    setRescheduleReason('')
    setNotifyClient(true)
    setWorkerAvailability([])
    setNextAvailableSlots([])
    setValidationErrors([])
    setIsJobDetailsOpen(false)
    setCompleteJobData(null)
  }

  // Fetch workers on mount
  const fetchWorkers = async () => {
    try {
      const response = await fetch('/api/workers')
      if (!response.ok) throw new Error('Failed to fetch workers')
      const data = await response.json()
      setWorkers(data.workers || [])
    } catch (error) {
      console.error('Error fetching workers:', error)
      setValidationErrors(prev => [...prev, 'Failed to load workers'])
    }
  }

  // Fetch complete job data with client and worker information
  const fetchCompleteJobData = async (jobId: string) => {
    if (!jobId) return

    setIsLoadingJobData(true)
    try {
      const response = await fetch(`/api/jobs?jobId=${jobId}`)
      if (!response.ok) throw new Error('Failed to fetch job data')
      const data = await response.json()
      
      // The API should return the job with joined client and worker data
      if (data.jobs && data.jobs.length > 0) {
        setCompleteJobData(data.jobs[0])
      }
    } catch (error) {
      console.error('Error fetching complete job data:', error)
      setValidationErrors(prev => [...prev, 'Failed to load job details'])
    } finally {
      setIsLoadingJobData(false)
    }
  }

  // Check worker availability
  const checkWorkerAvailability = useCallback(async () => {
    if (!selectedDate || !selectedTime || !job) return

    setIsCheckingAvailability(true)
    setValidationErrors([])

    try {
      const dateTimeString = `${format(selectedDate, 'yyyy-MM-dd')}T${selectedTime}:00`
      const currentJobData = completeJobData || job
      

      
      const response = await fetch('/api/workers/availability/check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          dateTime: dateTimeString,
          durationMinutes: currentJobData.duration_minutes || 60,
          excludeJobId: currentJobData.id,
          getAllWorkers: true
        })
      })

      if (!response.ok) throw new Error('Failed to check availability')
      
      const data = await response.json()
      setWorkerAvailability(data.workers || [])
    } catch (error) {
      console.error('Error checking availability:', error)
      setValidationErrors(prev => [...prev, 'Failed to check worker availability'])
    } finally {
      setIsCheckingAvailability(false)
    }
  }, [selectedDate, selectedTime, job, completeJobData])

  // Load next available slots with utilization sorting
  const loadNextAvailableSlots = async () => {
    if (!job) return

    setIsLoadingNextSlots(true)
    try {
      const currentJobData = completeJobData || job
      
      const response = await fetch('/api/workers/availability/next-available', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jobId: currentJobData.id,
          duration: currentJobData.duration_minutes || 60,
          searchStartDate: new Date().toISOString(),
          searchDaysLimit: 14,
          debug: false
        })
      })

      if (!response.ok) throw new Error('Failed to fetch next available slots')
      
      const data = await response.json()
      
      // Sort slots by worker utilization (lowest first) and then by date
      const sortedSlots = (data.slots || []).sort((a: NextAvailableSlot, b: NextAvailableSlot) => {
        // First sort by utilization (lower is better)
        if (a.utilizationPercentage !== b.utilizationPercentage) {
          return (a.utilizationPercentage || 0) - (b.utilizationPercentage || 0)
        }
        // Then sort by date (earlier is better)
        return new Date(a.dateTime).getTime() - new Date(b.dateTime).getTime()
      })
      
      setNextAvailableSlots(sortedSlots)
    } catch (error) {
      console.error('Error loading next available slots:', error)
      setValidationErrors(prev => [...prev, 'Failed to load next available slots'])
    } finally {
      setIsLoadingNextSlots(false)
    }
  }

  // Validation
  const validateStep = (step: string): boolean => {
    const errors: string[] = []

    if (step === 'select-time') {
      if (!selectedDate) errors.push('Please select a date')
      if (!selectedTime) errors.push('Please select a time')
      if (selectedDate && isBefore(selectedDate, startOfDay(new Date()))) {
        errors.push('Cannot schedule in the past')
      }
    }

    if (step === 'choose-worker') {
      if (!selectedWorkerId) errors.push('Please select a worker')
    }

    setValidationErrors(errors)
    return errors.length === 0
  }

  // Step Navigation
  const handleStepForward = () => {
    if (!validateStep(currentStep)) return

    if (currentStep === 'select-time') {
      setCurrentStep('choose-worker')
      checkWorkerAvailability()
    } else if (currentStep === 'choose-worker') {
      setCurrentStep('confirm')
    }
  }

  const handleStepBack = () => {
    if (currentStep === 'choose-worker') {
      setCurrentStep('select-time')
    } else if (currentStep === 'confirm') {
      setCurrentStep('choose-worker')
    }
  }

  // Execute reschedule
  const executeReschedule = async () => {
    if (!job || !selectedDate || !selectedTime || !selectedWorkerId) return

    setIsProcessing(true)
    try {
      const newDateTime = `${format(selectedDate, 'yyyy-MM-dd')}T${selectedTime}:00`
      await onReschedule(job.id, newDateTime, selectedWorkerId, rescheduleReason, notifyClient)
      onClose()
    } catch (error) {
      console.error('Error rescheduling job:', error)
      setValidationErrors(['Failed to reschedule job. Please try again.'])
    } finally {
      setIsProcessing(false)
    }
  }

  // Quick slot selection
  const handleQuickSlotSelect = (slot: NextAvailableSlot) => {
    try {
      const slotDate = parseISO(slot.dateTime)
      setSelectedDate(slotDate)
      setSelectedTime(format(slotDate, 'HH:mm'))
      setSelectedWorkerId(slot.workerId)
      setCurrentStep('confirm')
    } catch (error) {
      console.error('Error selecting quick slot:', error)
      setValidationErrors(['Invalid slot selected'])
    }
  }

  // Effects
  useEffect(() => {
    if (isOpen && job?.id) {
      resetForm()
      fetchWorkers()
      fetchCompleteJobData(job.id)
    }
  }, [isOpen, job?.id])

  useEffect(() => {
    if (selectedDate && selectedTime && (currentStep === 'choose-worker' || currentStep === 'select-time')) {
      const timeoutId = setTimeout(checkWorkerAvailability, 500)
      return () => clearTimeout(timeoutId)
    }
  }, [selectedDate, selectedTime, currentStep, checkWorkerAvailability])

  if (!job) return null

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold">
            Reschedule Appointment
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Validation Errors */}
          {validationErrors.length > 0 && (
            <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4">
              <div className="flex items-start space-x-2">
                <AlertTriangle className="w-5 h-5 text-destructive mt-0.5" />
                <div className="space-y-1">
                  <h4 className="text-sm font-medium text-destructive">Please fix the following issues:</h4>
                  <ul className="text-sm text-destructive/80 space-y-1">
                    {validationErrors.map((error, index) => (
                      <li key={index} className="flex items-center space-x-2">
                        <span>•</span>
                        <span>{error}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          )}

          {/* Progress Stepper */}
          <ProgressStepper
            steps={steps}
            currentStep={currentStep}
          />

          {/* Job Details - Collapsible */}
          <Collapsible open={isJobDetailsOpen} onOpenChange={setIsJobDetailsOpen}>
            <CollapsibleTrigger asChild>
              <Button variant="ghost" className="w-full justify-between p-0 h-auto">
                <div className="flex items-center space-x-2">
                  <h3 className="text-lg font-semibold">Current Appointment Details</h3>
                </div>
                {isJobDetailsOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <Card className="mt-2">
                <CardContent className="pt-6">
                  {isLoadingJobData ? (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                      <span className="ml-2 text-muted-foreground">Loading job details...</span>
                    </div>
                  ) : (
                    <>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                        <div className="space-y-2">
                          <div className="flex items-center space-x-2">
                            <User className="w-4 h-4 text-muted-foreground" />
                            <span className="font-medium">Client:</span>
                            <span>{completeJobData?.client_name || job.client_name || job.clients?.name || 'No client assigned'}</span>
                          </div>
                          <div className="flex items-center space-x-2">
                            <User className="w-4 h-4 text-muted-foreground" />
                            <span className="font-medium">Worker:</span>
                            <span>{completeJobData?.worker_name || job.worker_name || job.workers?.name || job.worker?.name || 'No worker assigned'}</span>
                          </div>
                          {(completeJobData?.client_phone || job.client_phone || job.clients?.phone) && (
                            <div className="flex items-center space-x-2">
                              <Phone className="w-4 h-4 text-muted-foreground" />
                              <span>{completeJobData?.client_phone || job.client_phone || job.clients?.phone}</span>
                            </div>
                          )}
                          {(completeJobData?.location || job.location) && (
                            <div className="flex items-center space-x-2">
                              <MapPin className="w-4 h-4 text-muted-foreground" />
                              <span>{completeJobData?.location || job.location}</span>
                            </div>
                          )}
                        </div>
                        <div className="space-y-2">
                          <div className="flex items-center space-x-2">
                            <Clock className="w-4 h-4 text-muted-foreground" />
                            <span className="font-medium">Duration:</span>
                            <span>
                              {(() => {
                                const minutes = completeJobData?.duration_minutes || job.duration_minutes || 60
                                if (minutes >= 60) {
                                  const hours = Math.floor(minutes / 60)
                                  const remainingMinutes = minutes % 60
                                  if (remainingMinutes === 0) {
                                    return `${hours} hour${hours !== 1 ? 's' : ''}`
                                  } else {
                                    return `${hours}h ${remainingMinutes}m`
                                  }
                                } else {
                                  return `${minutes} minutes`
                                }
                              })()}
                            </span>
                          </div>
                          <div className="flex items-start space-x-2">
                            <CalendarIcon className="w-4 h-4 text-muted-foreground mt-0.5" />
                            <div className="flex-1 min-w-0">
                              <span className="font-medium block">Current Time:</span>
                              <div className="text-sm text-muted-foreground mt-1">
                                {(() => {
                                  try {
                                    const scheduledAt = completeJobData?.scheduled_at || job.scheduled_at
                                    
                                    if (scheduledAt) {
                                      // Clean the string of any unexpected characters
                                      const cleanedDate = scheduledAt.toString().trim()
                                      
                                      let date: Date
                                      if (cleanedDate.includes('T')) {
                                        // ISO format: "2025-06-10T13:00:00+00:00"
                                        date = parseISO(cleanedDate)
                                      } else {
                                        // PostgreSQL format: "2025-06-10 13:00:00+00"
                                        date = new Date(cleanedDate)
                                      }
                                      
                                      if (isNaN(date.getTime())) {
                                        return `Invalid date (raw: ${cleanedDate})`
                                      }
                                      
                                      const formattedDate = format(date, 'MMM dd, yyyy')
                                      const formattedTime = format(date, 'h:mm a')
                                      
                                      return (
                                        <div className="space-y-1">
                                          <div className="font-medium">{formattedDate}</div>
                                          <div className="text-lg font-semibold text-foreground">{formattedTime}</div>
                                        </div>
                                      )
                                    }
                                    return 'Not scheduled'
                                  } catch (error) {
                                    console.error('Date formatting error:', error)
                                    return `Error: ${error instanceof Error ? error.message : 'Unknown error'}`
                                  }
                                })()}
                              </div>
                            </div>
                          </div>
                          <Badge variant="secondary">{completeJobData?.status || job.status}</Badge>
                        </div>
                      </div>
                      {(completeJobData?.description || job.description) && (
                        <div className="mt-4 pt-4 border-t">
                          <p className="text-sm text-muted-foreground">{completeJobData?.description || job.description}</p>
                        </div>
                      )}
                    </>
                  )}
                </CardContent>
              </Card>
            </CollapsibleContent>
          </Collapsible>

          {/* Validation Errors */}
          {validationErrors.length > 0 && (
            <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4">
              <div className="flex items-center space-x-2 mb-2">
                <AlertTriangle className="w-4 h-4 text-destructive" />
                <p className="font-medium text-destructive">Please fix the following issues:</p>
              </div>
              <ul className="list-disc list-inside space-y-1 text-sm text-destructive">
                {validationErrors.map((error, index) => (
                  <li key={index}>{error}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Step Content */}
          {currentStep === 'select-time' && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Clock className="w-5 h-5" />
                  <span>Select New Date & Time</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Date Picker */}
                  <div className="space-y-2">
                    <Label htmlFor="date-picker">Date</Label>
                    <Popover open={isCalendarOpen} onOpenChange={setIsCalendarOpen}>
                      <PopoverTrigger asChild>
                        <Button
                          id="date-picker"
                          variant="outline"
                          className={cn(
                            "w-full justify-start text-left font-normal",
                            !selectedDate && "text-muted-foreground"
                          )}
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {selectedDate ? format(selectedDate, "PPP") : "Pick a date"}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <div className="p-3 border-b">
                          <h4 className="font-medium text-sm">Select a date</h4>
                          <p className="text-xs text-muted-foreground">Choose when to reschedule this appointment</p>
                        </div>
                        <Calendar
                          mode="single"
                          selected={selectedDate}
                          onSelect={(date) => {
                            setSelectedDate(date)
                            setIsCalendarOpen(false)
                            // Clear validation errors when date changes
                            setValidationErrors(prev => prev.filter(error => !error.includes('time')))
                            // Clear previous worker availability when date changes
                            setWorkerAvailability([])
                          }}
                          disabled={(date) => 
                            isBefore(date, startOfDay(new Date())) ||
                            isAfter(date, addDays(new Date(), 90))
                          }
                          initialFocus
                          className="rounded-md"
                        />
                        <div className="p-3 border-t bg-muted/30">
                          <p className="text-xs text-muted-foreground">
                            Available dates: Today to {format(addDays(new Date(), 90), 'MMM dd, yyyy')}
                          </p>
                        </div>
                      </PopoverContent>
                    </Popover>
                  </div>

                  {/* Time Picker with real-time validation */}
                  <div className="space-y-2">
                    <Label htmlFor="time-picker">Time</Label>
                    <Input
                      id="time-picker"
                      type="time"
                      value={selectedTime}
                      onChange={(e) => {
                        setSelectedTime(e.target.value)
                        // Clear previous validation errors
                        setValidationErrors(prev => prev.filter(error => !error.includes('time')))
                        // Clear previous worker availability when time changes
                        setWorkerAvailability([])
                      }}
                      step="900" // 15 minute intervals
                      className="w-full"
                    />
                    <p className="text-xs text-muted-foreground">
                      Select any time (24-hour format)
                    </p>
                    
                    {/* Real-time availability check */}
                    {selectedDate && selectedTime && (
                      <div className="mt-3 p-3 rounded-lg border bg-muted/30">
                        {isCheckingAvailability ? (
                          <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                            <Loader2 className="w-4 h-4 animate-spin" />
                            <span>Checking availability for {completeJobData?.duration_minutes || job.duration_minutes || 60} minute appointment...</span>
                          </div>
                        ) : workerAvailability.length > 0 ? (
                          <div className="text-sm">
                            {availableWorkers.length > 0 ? (
                              <div className="flex items-center space-x-2 text-green-700">
                                <CheckCircle className="w-4 h-4" />
                                <span className="font-medium">
                                  {availableWorkers.length} worker{availableWorkers.length !== 1 ? 's' : ''} available
                                </span>
                                <span className="text-green-600">
                                  for {format(selectedDate, 'MMM dd')} at {selectedTime}
                                </span>
                              </div>
                            ) : (
                              <div className="flex items-center space-x-2 text-red-700">
                                <AlertTriangle className="w-4 h-4" />
                                <span className="font-medium">No workers available</span>
                                <span className="text-red-600">
                                  for {format(selectedDate, 'MMM dd')} at {selectedTime}
                                </span>
                              </div>
                            )}
                                                        <div className="mt-1 text-xs text-muted-foreground">
                               Duration: {completeJobData?.duration_minutes || job.duration_minutes || 60} minutes
                               {availableWorkers.length === 0 && workerAvailability.length > 0 && (
                                 <div className="mt-1 text-orange-600 font-medium">
                                   Try the Quick Reschedule Options below for alternative times
                                 </div>
                               )}
                             </div>
                          </div>
                        ) : null}
                      </div>
                    )}
                  </div>
                </div>

                {/* Quick Slots Section */}
                <div className="space-y-4 pt-4 border-t">
                  <div className="flex items-center justify-between">
                    <h4 className="font-medium flex items-center space-x-2">
                      <Zap className="w-4 h-4 text-blue-500" />
                      <span>Quick Reschedule Options</span>
                    </h4>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={loadNextAvailableSlots}
                      disabled={isLoadingNextSlots}
                    >
                      {isLoadingNextSlots ? (
                        <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Loading...</>
                      ) : (
                        <><RefreshCw className="w-4 h-4 mr-2" />Find Available Slots</>
                      )}
                    </Button>
                  </div>

                  {nextAvailableSlots.length > 0 && (
                    <div className="grid gap-2">
                      {nextAvailableSlots.slice(0, 5).map((slot, index) => {
                        const slotDate = parseISO(slot.dateTime)
                        const isSlotToday = isToday(slotDate)
                        const isSlotTomorrow = isTomorrow(slotDate)
                        
                        let dateLabel = ''
                        if (isSlotToday) {
                          dateLabel = 'Today'
                        } else if (isSlotTomorrow) {
                          dateLabel = 'Tomorrow'
                        } else {
                          dateLabel = format(slotDate, 'EEE, MMM dd')
                        }
                        
                        const utilizationColor = 
                          (slot.utilizationPercentage || 0) < 30 ? 'bg-green-500' :
                          (slot.utilizationPercentage || 0) < 60 ? 'bg-yellow-500' : 'bg-red-500'
                        
                        return (
                          <Button
                            key={index}
                            variant="outline"
                            className="justify-between h-auto p-3 text-left hover:bg-muted/50"
                            onClick={() => handleQuickSlotSelect(slot)}
                          >
                            <div className="flex items-center space-x-3">
                              <div className={`w-2 h-2 rounded-full ${utilizationColor}`} />
                              <div>
                                <p className="font-medium">{slot.workerName}</p>
                                <p className="text-xs text-muted-foreground">
                                  {dateLabel} at {format(slotDate, 'h:mm a')}
                                </p>
                              </div>
                            </div>
                            <div className="flex flex-col items-end space-y-1">
                              <Badge variant="secondary" className="text-xs">
                                {index === 0 ? 'Recommended' : 'Available'}
                              </Badge>
                              {slot.utilizationPercentage !== undefined && (
                                <span className="text-xs text-muted-foreground">
                                  {Math.round(slot.utilizationPercentage)}% busy
                                </span>
                              )}
                            </div>
                          </Button>
                        )
                      })}
                    </div>
                  )}

                  {isLoadingNextSlots && (
                    <div className="flex items-center justify-center py-4">
                      <div className="flex items-center space-x-2 text-muted-foreground">
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span className="text-sm">Finding next available slots...</span>
                      </div>
                    </div>
                  )}

                  {!isLoadingNextSlots && nextAvailableSlots.length === 0 && (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      Click "Find Available Slots" to see next available times
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {currentStep === 'choose-worker' && (
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <User className="w-5 h-5" />
                      <span>Choose Worker</span>
                    </div>
                    <Badge variant="outline" className="text-xs">
                      {selectedDate && (() => {
                        try {
                          return format(selectedDate, 'MMM dd')
                        } catch (error) {
                          return 'Invalid'
                        }
                      })()} at {selectedTime}
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {isCheckingAvailability ? (
                    <div className="flex items-center justify-center py-8">
                      <div className="flex items-center space-x-3">
                        <Loader2 className="w-5 h-5 animate-spin" />
                        <span>Checking worker availability...</span>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {/* Available Workers */}
                      {availableWorkers.length > 0 && (
                        <div className="space-y-3">
                          <h4 className="font-medium text-green-700 flex items-center space-x-2">
                            <CheckCircle className="w-4 h-4" />
                            <span>Available Workers</span>
                          </h4>
                          <div className="grid gap-3">
                            {availableWorkers.map((worker) => (
                              <div
                                key={worker.workerId}
                                className={cn(
                                  "p-4 border rounded-lg cursor-pointer transition-all",
                                  selectedWorkerId === worker.workerId
                                    ? "border-primary bg-primary/5 ring-2 ring-primary/20"
                                    : "border-border hover:border-primary/50 hover:bg-muted/50"
                                )}
                                onClick={() => setSelectedWorkerId(worker.workerId)}
                              >
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center space-x-3">
                                    <div className="w-2 h-2 rounded-full bg-green-500" />
                                    <span className="font-medium">{worker.workerName}</span>
                                  </div>
                                  <div className="flex items-center space-x-2">
                                    <TooltipProvider>
                                      <Tooltip>
                                        <TooltipTrigger asChild>
                                          <Badge variant="secondary" className="text-xs">
                                            {worker.utilizationPercentage}% Utilized
                                          </Badge>
                                        </TooltipTrigger>
                                        <TooltipContent>
                                          <p>Current utilization for this time period</p>
                                        </TooltipContent>
                                      </Tooltip>
                                    </TooltipProvider>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Unavailable Workers */}
                      {unavailableWorkers.length > 0 && (
                        <div className="space-y-3">
                          <h4 className="font-medium text-orange-700 flex items-center space-x-2">
                            <AlertTriangle className="w-4 h-4" />
                            <span>Unavailable Workers</span>
                          </h4>
                          <div className="grid gap-3">
                            {unavailableWorkers.map((worker) => (
                              <div
                                key={worker.workerId}
                                className="p-4 border border-orange-200 bg-orange-50 rounded-lg opacity-60"
                              >
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center space-x-3">
                                    <div className="w-2 h-2 rounded-full bg-orange-500" />
                                    <span className="font-medium">{worker.workerName}</span>
                                  </div>
                                  <Badge variant="destructive" className="text-xs">
                                    {worker.conflictingJobs} conflicts
                                  </Badge>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* No Workers Available - Show Next Available Slots */}
                      {hasNoAvailableWorkers && (
                        <div className="space-y-4">
                          <div className="flex items-center justify-between">
                            <h4 className="font-medium text-orange-700 flex items-center space-x-2">
                              <Info className="w-4 h-4" />
                              <span>No workers available at this time</span>
                            </h4>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={loadNextAvailableSlots}
                              disabled={isLoadingNextSlots}
                            >
                              {isLoadingNextSlots ? (
                                <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Loading...</>
                              ) : (
                                <><RefreshCw className="w-4 h-4 mr-2" />Find Next Available</>
                              )}
                            </Button>
                          </div>

                          {nextAvailableSlots.length > 0 && (
                            <div className="space-y-3">
                              <h5 className="text-sm font-medium text-muted-foreground">
                                Next Available Slots:
                              </h5>
                              <div className="grid gap-2">
                                {nextAvailableSlots.slice(0, 5).map((slot, index) => (
                                  <Button
                                    key={index}
                                    variant="outline"
                                    className="justify-between h-auto p-3"
                                    onClick={() => handleQuickSlotSelect(slot)}
                                  >
                                    <div className="flex items-center space-x-3">
                                      <Zap className="w-4 h-4 text-blue-500" />
                                      <div className="text-left">
                                        <p className="font-medium">{slot.workerName}</p>
                                        <p className="text-xs text-muted-foreground">
                                          {(() => {
                                            try {
                                              const date = parseISO(slot.dateTime)
                                              if (isNaN(date.getTime())) {
                                                return 'Invalid date'
                                              }
                                              return format(date, 'MMM dd, yyyy at h:mm a')
                                            } catch (error) {
                                              return 'Invalid date'
                                            }
                                          })()}
                                        </p>
                                      </div>
                                    </div>
                                    <Badge variant="secondary" className="text-xs">
                                      Quick Select
                                    </Badge>
                                  </Button>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          )}

          {currentStep === 'confirm' && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <CheckCircle className="w-5 h-5" />
                  <span>Confirm Reschedule</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Summary */}
                <div className="bg-muted/50 rounded-lg p-4">
                  <h4 className="font-medium mb-3">Reschedule Summary</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-muted-foreground">New Date & Time</p>
                      <p className="font-medium">
                        {selectedDate && (() => {
                          try {
                            return format(selectedDate, 'EEEE, MMMM dd, yyyy')
                          } catch (error) {
                            return 'Invalid date'
                          }
                        })()}
                      </p>
                      <p className="font-medium">{selectedTime}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Assigned Worker</p>
                      <p className="font-medium">
                        {workerAvailability.find(w => w.workerId === selectedWorkerId)?.workerName || 'Unknown'}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Additional Options */}
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="reschedule-reason">Reason (Optional)</Label>
                    <Input
                      id="reschedule-reason"
                      value={rescheduleReason}
                      onChange={(e) => setRescheduleReason(e.target.value)}
                      placeholder="e.g., Client request, scheduling conflict"
                    />
                  </div>
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="notify-client"
                      checked={notifyClient}
                      onCheckedChange={setNotifyClient}
                    />
                    <Label htmlFor="notify-client">Notify client of the change</Label>
                  </div>
                </div>

                <Button
                  onClick={executeReschedule}
                  disabled={isProcessing}
                  className="w-full"
                  size="lg"
                >
                  {isProcessing ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    'Confirm & Reschedule'
                  )}
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Navigation Buttons */}
          <div className="flex justify-between pt-4 border-t">
            <Button
              variant="outline"
              onClick={handleStepBack}
              disabled={currentStep === 'select-time' || isProcessing}
            >
              Back
            </Button>
            <div className="flex space-x-2">
              <Button variant="ghost" onClick={onClose} disabled={isProcessing}>
                Cancel
              </Button>
              {currentStep !== 'confirm' && (
                <Button
                  onClick={handleStepForward}
                  disabled={
                    (currentStep === 'select-time' && (!selectedDate || !selectedTime || (workerAvailability.length > 0 && availableWorkers.length === 0))) ||
                    (currentStep === 'choose-worker' && !selectedWorkerId) ||
                    isCheckingAvailability
                  }
                  className={
                    currentStep === 'select-time' && workerAvailability.length > 0 && availableWorkers.length === 0
                      ? 'opacity-50 cursor-not-allowed'
                      : ''
                  }
                >
                  {isCheckingAvailability ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Checking...
                    </>
                  ) : (
                    'Next'
                  )}
                </Button>
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
} 