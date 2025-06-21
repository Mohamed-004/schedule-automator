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
  AlertCircle,
  Briefcase,
  Loader2, 
  Info, 
  RefreshCw, 
  Zap,
  ChevronDown,
  ChevronUp,
  ChevronLeft,
  ChevronRight,
  FileText,
  Search
} from 'lucide-react'
import { useToast } from '@/components/ui/use-toast'

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
  const [currentCalendarDate, setCurrentCalendarDate] = useState<Date>(new Date())
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
  const [availabilityMessage, setAvailabilityMessage] = useState<string>('')
  const [smsStatus, setSmsStatus] = useState<{
    clientSent: boolean
    workerSent: boolean
    clientPhone: string | null
    workerPhone: string | null
  } | null>(null)

  const { toast } = useToast()

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
    setSmsStatus(null)
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
      
      // Filter out past dates and very early morning slots (before 6 AM)
      const now = new Date()
      const filteredSlots = (data.slots || []).filter((slot: NextAvailableSlot) => {
        try {
          const slotDate = parseISO(slot.dateTime)
          // Remove past dates
          if (slotDate <= now) return false
          
          // Remove very early morning slots (before 6 AM) unless explicitly enabled
          const hour = slotDate.getHours()
          if (hour < 6) return false
          
          return true
        } catch {
          return false
        }
      })
      
      // Sort slots by worker utilization (lowest first) and then by date
      const sortedSlots = filteredSlots.sort((a: NextAvailableSlot, b: NextAvailableSlot) => {
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
    setSmsStatus(null) // Reset SMS status
    
    try {
      // Create a proper ISO datetime string
      const dateTimeString = `${format(selectedDate, 'yyyy-MM-dd')}T${selectedTime}:00`
      const dateTime = new Date(dateTimeString)
      const newDateTime = dateTime.toISOString()
      
      // Debug: Log all the data being sent
      const requestData = {
        action: 'manual-reschedule',
        newDateTime,
        newWorkerId: selectedWorkerId,
        reason: rescheduleReason,
        notifyClient
      }
      
      console.log('🔧 RESCHEDULE DEBUG - Request Data:', {
        jobId: job.id,
        requestData,
        originalJob: job,
        completeJobData,
        selectedDate: selectedDate.toISOString(),
        selectedTime,
        selectedWorkerId,
        rescheduleReason,
        notifyClient,
        dateTimeString,
        constructedDate: dateTime,
        formattedDateTime: newDateTime
      })
      
      // Call the reschedule function
      await onReschedule(job.id, newDateTime, selectedWorkerId, rescheduleReason, notifyClient)
      
      console.log('✅ RESCHEDULE DEBUG - onReschedule completed successfully')
      
      // Show success message with SMS notification info
      if (notifyClient) {
        const clientPhone = completeJobData?.client_phone || job.client_phone
        const workerChanged = selectedWorkerId !== job.worker_id
        
        console.log('📱 RESCHEDULE DEBUG - SMS Notification Info:', {
          clientPhone,
          workerChanged,
          notifyClient,
          selectedWorkerId,
          originalWorkerId: job.worker_id
        })
        
        if (clientPhone) {
          // Show SMS sent confirmation
          setSmsStatus({
            clientSent: true,
            workerSent: workerChanged,
            clientPhone,
            workerPhone: null
          })
          
          // Show success toast with SMS info
          if (typeof window !== 'undefined' && window.dispatchEvent) {
            window.dispatchEvent(new CustomEvent('show-toast', {
              detail: {
                type: 'success',
                title: 'Appointment Rescheduled Successfully!',
                description: `SMS notifications sent to client${workerChanged ? ' and worker' : ''}.`
              }
            }))
          }
        } else {
          // Show warning if no client phone
          if (typeof window !== 'undefined' && window.dispatchEvent) {
            window.dispatchEvent(new CustomEvent('show-toast', {
              detail: {
                type: 'warning',
                title: 'Appointment Rescheduled',
                description: 'Client has no phone number on file. Please contact them manually.'
              }
            }))
          }
        }
      } else {
        // Show standard success message
        if (typeof window !== 'undefined' && window.dispatchEvent) {
          window.dispatchEvent(new CustomEvent('show-toast', {
            detail: {
              type: 'success',
              title: 'Appointment Rescheduled Successfully!',
              description: 'The appointment has been updated.'
            }
          }))
        }
      }

      // Close modal after success
      onClose()
    } catch (error) {
      console.error('❌ RESCHEDULE DEBUG - Error in executeReschedule:', error)
      
      // Enhanced error logging
      if (error instanceof Error) {
        console.error('❌ RESCHEDULE DEBUG - Error details:', {
          message: error.message,
          stack: error.stack,
          name: error.name
        })
      }
      
      // Show error message
      if (typeof window !== 'undefined' && window.dispatchEvent) {
        window.dispatchEvent(new CustomEvent('show-toast', {
          detail: {
            type: 'error',
            title: 'Reschedule Failed',
            description: error instanceof Error ? error.message : 'An unexpected error occurred'
          }
        }))
      }
    } finally {
      setIsProcessing(false)
    }
  }

  // Quick slot selection
  const handleQuickSlotSelect = (slot: NextAvailableSlot) => {
    try {
      const slotDate = parseISO(slot.dateTime)
      
      // Ensure we have a valid date
      if (isNaN(slotDate.getTime())) {
        throw new Error('Invalid date in slot')
      }
      
      // Set selectedDate as Date object (keeping existing type)
      setSelectedDate(slotDate)
      setSelectedTime(format(slotDate, 'HH:mm'))
      setSelectedWorkerId(slot.workerId)
      
      // Ensure the worker is available in workerAvailability for confirmation step
      const workerExists = workerAvailability.find(w => w.workerId === slot.workerId)
      if (!workerExists) {
        // Add worker to availability with proper data
        setWorkerAvailability(prev => [...prev, {
          workerId: slot.workerId,
          workerName: slot.workerName,
          isAvailable: true,
          utilizationPercentage: slot.utilizationPercentage || 0,
          conflictingJobs: 0
        }])
      } else {
        // Update existing worker data to ensure proper name is set
        setWorkerAvailability(prev => prev.map(w => 
          w.workerId === slot.workerId 
            ? { ...w, workerName: slot.workerName, isAvailable: true }
            : w
        ))
      }
      
      setCurrentStep('confirm')
    } catch (error) {
      console.error('Error selecting quick slot:', error)
      setValidationErrors(['Invalid slot selected. Please try again.'])
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
        <DialogHeader className="pb-4 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-lg bg-blue-600 flex items-center justify-center">
              <Clock className="w-5 h-5 text-white" />
            </div>
            <div>
              <DialogTitle className="text-xl font-semibold text-gray-900">
            Reschedule Appointment
          </DialogTitle>
              <p className="text-sm text-gray-600 mt-0.5">
                {job?.title ? `${job.title} - ` : ''}
                {job?.client_name || 'Unknown Client'}
              </p>
            </div>
          </div>
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
                <CardContent className="pt-4">
                  {isLoadingJobData ? (
                    <div className="flex items-center justify-center py-8">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                      <span className="ml-3 text-gray-600">Loading appointment details...</span>
                      </div>
                                      ) : completeJobData ? (
                     <div className="space-y-6">
                       {/* 👤 CLIENT INFO Section */}
                       <div className="space-y-4">
                         <div className="flex items-center space-x-3">
                           <div className="w-8 h-8 rounded-full bg-blue-50 flex items-center justify-center ring-1 ring-blue-100">
                             <User className="w-4 h-4 text-blue-600" />
                        </div>
                           <h4 className="text-sm font-medium text-blue-700">Client Information</h4>
                         </div>
                         <div className="pl-11 space-y-3">
                           <div className="flex items-center space-x-3">
                             <div className="w-5 h-5 flex items-center justify-center">
                               <User className="w-4 h-4 text-gray-500" />
                             </div>
                             <span className="text-sm font-medium text-gray-900">{completeJobData.client_name || 'Unknown Client'}</span>
                           </div>
                           {completeJobData.client_phone && (
                             <div className="flex items-center space-x-3">
                               <div className="w-5 h-5 flex items-center justify-center">
                                 <Phone className="w-4 h-4 text-gray-500" />
                               </div>
                               <span className="text-sm text-gray-700">{completeJobData.client_phone}</span>
                        </div>
                      )}
                    </div>
                      </div>

                       {/* 📋 JOB INFO Section */}
                       <div className="space-y-4">
                         <div className="flex items-center space-x-3">
                           <div className="w-8 h-8 rounded-full bg-emerald-50 flex items-center justify-center ring-1 ring-emerald-100">
                             <Briefcase className="w-4 h-4 text-emerald-600" />
                    </div>
                           <h4 className="text-sm font-medium text-emerald-700">Service Details</h4>
                  </div>
                         <div className="pl-11 space-y-3">
                           <div className="flex items-center space-x-3">
                             <div className="w-5 h-5 flex items-center justify-center">
                               <Clock className="w-4 h-4 text-gray-500" />
                             </div>
                             <span className="text-sm text-gray-700">
                               Duration: <span className="font-medium text-gray-900">{completeJobData.duration_minutes ? `${Math.floor(completeJobData.duration_minutes / 60)} hour${Math.floor(completeJobData.duration_minutes / 60) !== 1 ? 's' : ''}` : 'Unknown'}</span>
                             </span>
                           </div>
                           <div className="flex items-center space-x-3">
                             <div className="w-5 h-5 flex items-center justify-center">
                               <CalendarIcon className="w-4 h-4 text-gray-500" />
                             </div>
                             <span className="text-sm text-gray-700">
                               {completeJobData.scheduled_at ? (() => {
                                 try {
                                   const startDate = new Date(completeJobData.scheduled_at);
                                   return format(startDate, "EEEE, MMMM dd, yyyy 'at' h:mm a");
                                 } catch (error) {
                                   console.error('Date parsing error:', error);
                                   return 'Invalid date';
                                 }
                               })() : 'No date set'}
                             </span>
                           </div>
                         </div>
                       </div>

                       {/* 👷 ASSIGNED WORKER Section */}
                       <div className="space-y-4">
                         <div className="flex items-center space-x-3">
                           <div className="w-8 h-8 rounded-full bg-amber-50 flex items-center justify-center ring-1 ring-amber-100">
                             <User className="w-4 h-4 text-amber-600" />
                           </div>
                           <h4 className="text-sm font-medium text-amber-700">Assigned Team Member</h4>
                         </div>
                         <div className="pl-11 space-y-3">
                           <div className="flex items-center space-x-3">
                             <div className="w-5 h-5 flex items-center justify-center">
                               <User className="w-4 h-4 text-gray-500" />
                             </div>
                             <span className="text-sm font-medium text-gray-900">{completeJobData.worker_name || 'No worker assigned'}</span>
                           </div>
                           <div className="flex items-center space-x-3">
                             <div className="w-5 h-5 flex items-center justify-center">
                               <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
                             </div>
                             <Badge className="bg-emerald-500 text-white border border-emerald-600 hover:bg-emerald-600 text-xs font-medium">
                               ✓ Confirmed
                             </Badge>
                           </div>
                         </div>
                       </div>

                       {/* 📝 JOB NOTES Section */}
                       {completeJobData.description && (
                         <div className="space-y-4">
                           <div className="flex items-center space-x-3">
                             <div className="w-8 h-8 rounded-full bg-violet-50 flex items-center justify-center ring-1 ring-violet-100">
                               <FileText className="w-4 h-4 text-violet-600" />
                             </div>
                             <h4 className="text-sm font-medium text-violet-700">Additional Notes</h4>
                           </div>
                           <div className="pl-11">
                             <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                               <p className="text-sm text-gray-700 leading-relaxed">{completeJobData.description}</p>
                             </div>
                           </div>
                         </div>
                       )}
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-gray-100 flex items-center justify-center">
                        <AlertCircle className="w-5 h-5 text-gray-400" />
                      </div>
                      <p className="text-sm text-gray-600">Unable to load appointment details</p>
                    </div>
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
            <Card className="border-0 shadow-none">
              <CardHeader className="px-0 pb-4">
                <CardTitle className="flex items-center space-x-3 text-xl">
                  <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center">
                    <Clock className="w-4 h-4 text-gray-600" />
                  </div>
                  <span className="text-gray-900">Select New Date & Time</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="px-0 space-y-8">
                {/* Date and Time Selection - Vertically Stacked */}
                <div className="space-y-6">
                  {/* Date Picker Section */}
                  <div className="space-y-3">
                    <Label htmlFor="date-picker" className="text-sm font-medium text-gray-700">
                      Choose Date
                    </Label>
                    <Popover open={isCalendarOpen} onOpenChange={setIsCalendarOpen}>
                      <PopoverTrigger asChild>
                        <Button
                          id="date-picker"
                          variant="outline"
                          className={cn(
                            "w-full justify-start text-left font-normal h-11 px-4 border-gray-200 hover:border-gray-300 transition-colors",
                            !selectedDate && "text-gray-500"
                          )}
                        >
                          <CalendarIcon className="mr-3 h-4 w-4 text-gray-500" />
                          {selectedDate ? format(selectedDate, "EEEE, MMMM dd, yyyy") : "Select appointment date"}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="center" side="bottom" sideOffset={4}>
                        {/* Clean Calendar Header */}
                        <div className="p-4 border-b bg-gray-50">
                          <div className="flex items-center justify-between mb-3">
                            <h4 className="font-medium text-gray-900">Select a date</h4>
                            {/* Calendar Navigation Controls */}
                            <div className="flex items-center space-x-2">
                              <Button
                                variant="outline"
                                size="sm"
                                className="h-7 w-7 p-0 border-gray-200"
                                onClick={() => {
                                  const newDate = new Date(currentCalendarDate);
                                  newDate.setMonth(newDate.getMonth() - 1);
                                  setCurrentCalendarDate(newDate);
                                }}
                              >
                                <ChevronLeft className="h-3 w-3" />
                              </Button>
                              <span className="text-sm font-medium text-gray-700 min-w-[120px] text-center">
                                {format(currentCalendarDate, "MMMM yyyy")}
                              </span>
                              <Button
                                variant="outline"
                                size="sm"
                                className="h-7 w-7 p-0 border-gray-200"
                                onClick={() => {
                                  const newDate = new Date(currentCalendarDate);
                                  newDate.setMonth(newDate.getMonth() + 1);
                                  setCurrentCalendarDate(newDate);
                                }}
                              >
                                <ChevronRight className="h-3 w-3" />
                              </Button>
                            </div>
                          </div>
                          <p className="text-xs text-gray-600">Choose when to reschedule this appointment</p>
                        </div>
                        
                        {/* Professional Calendar */}
                        <div className="p-3">
                        <Calendar
                          mode="single"
                          selected={selectedDate}
                          onSelect={(date) => {
                              if (date) {
                                setSelectedDate(date);
                                setIsCalendarOpen(false);
                                // Clear validation errors when date changes
                                setValidationErrors(prev => prev.filter(error => !error.includes('time')));
                                // Clear previous worker availability when date changes
                                setWorkerAvailability([]);
                              }
                            }}
                            month={currentCalendarDate}
                            onMonthChange={setCurrentCalendarDate}
                            disabled={(date) => date < new Date() || date > new Date(Date.now() + 365 * 24 * 60 * 60 * 1000)}
                            className="rounded-md border-none"
                            classNames={{
                              months: "flex flex-col sm:flex-row space-y-2 sm:space-x-2 sm:space-y-0",
                              month: "space-y-2",
                              caption: "hidden", // Hide default caption since we have custom navigation
                              caption_label: "hidden",
                              nav: "hidden", // Hide default navigation
                              nav_button: "hidden",
                              nav_button_previous: "hidden",
                              nav_button_next: "hidden",
                              table: "w-full border-collapse space-y-1",
                              head_row: "flex",
                              head_cell: "text-gray-500 rounded-md w-7 font-normal text-[0.75rem]",
                              row: "flex w-full mt-1",
                              cell: "text-center text-sm p-0 relative [&:has([aria-selected])]:bg-gray-100 first:[&:has([aria-selected])]:rounded-l-md last:[&:has([aria-selected])]:rounded-r-md focus-within:relative focus-within:z-20",
                              day: "h-7 w-7 p-0 font-normal text-gray-700 hover:bg-gray-100 rounded-md transition-colors",
                              day_selected: "bg-gray-900 text-white hover:bg-gray-800 focus:bg-gray-900 focus:text-white",
                              day_today: "bg-gray-100 text-gray-900 font-medium",
                              day_outside: "text-gray-400",
                              day_disabled: "text-gray-300 opacity-50",
                              day_range_middle: "aria-selected:bg-gray-100 aria-selected:text-gray-900",
                              day_hidden: "invisible",
                            }}
                          />
                        </div>
                      </PopoverContent>
                    </Popover>
                  </div>

                  {/* Time Picker */}
                  <div className="space-y-4">
                    <Label htmlFor="time-picker" className="text-sm font-medium text-gray-700">
                      Choose Time
                    </Label>
                    <div className="relative">
                      <input
                      id="time-picker"
                      type="time"
                      value={selectedTime}
                        onChange={(e) => {
                          setSelectedTime(e.target.value);
                          // Clear validation errors when time changes
                          setValidationErrors(prev => prev.filter(error => !error.includes('time')));
                        }}
                        className="w-full h-11 px-4 text-base border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
                        placeholder="Select time"
                      />
                    </div>
                  </div>
                </div>

                {/* Validation Errors */}
                {validationErrors.length > 0 && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                    <div className="flex items-start space-x-3">
                      <div className="flex-shrink-0">
                        <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                        </svg>
                      </div>
                      <div className="flex-1">
                        <h3 className="text-sm font-medium text-red-800">Please fix the following:</h3>
                        <ul className="mt-2 text-sm text-red-700 space-y-1">
                          {validationErrors.map((error, index) => (
                            <li key={index}>• {error}</li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </div>
                )}

                {/* Worker Availability Check */}
                {selectedDate && selectedTime && (
                  <div className="border border-gray-200 rounded-lg p-4 bg-gray-50">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="text-sm font-medium text-gray-900">Availability Check</h3>
                      {isCheckingAvailability && (
                        <div className="flex items-center space-x-2">
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-600"></div>
                          <span className="text-xs text-gray-600">Checking...</span>
                        </div>
                      )}
                    </div>
                    
                    {workerAvailability.length > 0 ? (
                      <div className="space-y-2">
                        {workerAvailability.map((worker) => (
                          <div key={worker.workerId} className="flex items-center justify-between p-2 bg-white rounded border">
                            <span className="text-sm text-gray-700">{worker.workerName}</span>
                            <span className={`text-xs px-2 py-1 rounded-full ${
                              worker.isAvailable 
                                ? 'bg-green-100 text-green-800' 
                                : 'bg-red-100 text-red-800'
                            }`}>
                              {worker.isAvailable ? '✓ Available' : '✗ Unavailable'}
                            </span>
                          </div>
                        ))}
                      </div>
                    ) : availabilityMessage && (
                      <p className="text-sm text-gray-600">{availabilityMessage}</p>
                    )}
                  </div>
                )}

                {/* Smart Time Slot Suggestions */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <Label className="text-sm font-medium text-gray-700">Smart Time Suggestions</Label>
                    <Button
                      onClick={loadNextAvailableSlots}
                      disabled={isLoadingNextSlots}
                      size="sm"
                      className="h-8 px-3 bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white border-0 shadow-sm"
                    >
                      {isLoadingNextSlots ? (
                        <div className="animate-spin rounded-full h-3 w-3 border border-white border-t-transparent"></div>
                      ) : (
                        <>
                          <svg className="w-3 h-3 mr-1.5" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M12 2L14.09 8.26L22 9L14.09 9.74L12 16L9.91 9.74L2 9L9.91 8.26L12 2Z" fill="currentColor"/>
                            <path d="M6 18L7.5 21.5L11 22L7.5 22.5L6 26L4.5 22.5L1 22L4.5 21.5L6 18Z" fill="currentColor"/>
                          </svg>
                          Suggest Times
                        </>
                      )}
                    </Button>
                  </div>

                  {/* Available Time Slots Display */}
                  <div className="space-y-3">
                    {nextAvailableSlots.length > 0 ? (
                      <div className="grid gap-3">
                        {nextAvailableSlots
                          .sort((a, b) => (a.utilizationPercentage || 0) - (b.utilizationPercentage || 0))
                          .slice(0, 5).map((slot, index) => (
                          <div
                            key={`${slot.workerId}-${slot.dateTime}-${index}`}
                            onClick={() => handleQuickSlotSelect(slot)}
                            className="p-4 rounded-lg border border-gray-200 bg-white hover:border-blue-300 hover:shadow-sm cursor-pointer transition-all duration-200"
                          >
                            <div className="space-y-3">
                              <div className="flex items-start space-x-3">
                                <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                                  <span className="text-sm font-medium text-blue-700">
                                    {slot.workerName.split(' ').map(n => n[0]).join('')}
                                  </span>
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center justify-between mb-1">
                                    <p className="text-sm font-medium text-gray-900 truncate">{slot.workerName}</p>
                                    <span className="text-xs font-medium text-gray-600 ml-2">{slot.utilizationPercentage || 0}% busy</span>
                                  </div>
                                  
                                  {/* Utilization Progress Bar */}
                                  <div className="mb-2">
                                    <div className="w-full bg-gray-200 rounded-full h-2 shadow-sm">
                                      <div 
                                        className={cn(
                                          "h-2 rounded-full transition-all duration-300 shadow-sm",
                                          (slot.utilizationPercentage || 0) < 30 && "bg-emerald-500",
                                          (slot.utilizationPercentage || 0) >= 30 && (slot.utilizationPercentage || 0) < 70 && "bg-amber-500", 
                                          (slot.utilizationPercentage || 0) >= 70 && "bg-red-500"
                                        )}
                                        style={{ width: `${Math.min(slot.utilizationPercentage || 0, 100)}%` }}
                                      />
                                    </div>
                                  </div>
                                  
                                  <p className="text-xs text-gray-500">
                                    {(() => {
                                      try {
                                        const slotDate = parseISO(slot.dateTime);
                                        const today = new Date();
                                        const tomorrow = addDays(today, 1);
                                        
                                        if (isToday(slotDate)) {
                                          return `Today at ${format(slotDate, 'h:mm a')}`;
                                        } else if (isTomorrow(slotDate)) {
                                          return `Tomorrow at ${format(slotDate, 'h:mm a')}`;
                                        } else {
                                          return format(slotDate, 'MMM d, h:mm a');
                                        }
                                      } catch {
                                        return 'Invalid date';
                                      }
                                    })()}
                                  </p>
                                </div>
                              </div>
                              
                              {/* Badge Showcase */}
                              <div className="flex items-center space-x-2 pt-2 border-t border-gray-100">
                                <Badge className={cn(
                                  "text-xs font-medium px-2.5 py-1 border",
                                  (slot.utilizationPercentage || 0) < 30 && "bg-emerald-500 text-white border-emerald-600",
                                  (slot.utilizationPercentage || 0) >= 30 && (slot.utilizationPercentage || 0) < 70 && "bg-amber-500 text-white border-amber-600",
                                  (slot.utilizationPercentage || 0) >= 70 && "bg-red-500 text-white border-red-600"
                                )}>
                                  {(slot.utilizationPercentage || 0) < 30 ? "Available" : 
                                   (slot.utilizationPercentage || 0) < 70 ? "Busy" : "Very Busy"}
                                </Badge>
                                {index === 0 && (
                                  <Badge className="bg-blue-50 text-blue-600 border-0 text-xs font-medium px-2.5 py-1">
                                    <svg className="w-2.5 h-2.5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                                    </svg>
                                    Recommended
                                  </Badge>
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : workerAvailability.length > 0 ? (
                      <div className="grid gap-2">
                        {workerAvailability
                          .filter(w => w.isAvailable)
                          .sort((a, b) => a.utilizationPercentage - b.utilizationPercentage)
                          .map((worker, index) => (
                          <div
                            key={`${worker.workerId}-${index}`}
                            onClick={() => {
                              setSelectedWorkerId(worker.workerId);
                              // Keep the current selected time since this is for worker selection
                              setValidationErrors([]);
                            }}
                            className={cn(
                              "p-4 rounded-xl border cursor-pointer transition-all duration-300 hover:shadow-md",
                              selectedWorkerId === worker.workerId
                                ? "border-blue-500 bg-blue-600 shadow-lg transform scale-[1.02]"
                                : "border-gray-200 bg-white hover:border-blue-300 hover:shadow-sm"
                            )}
                          >
                            <div className="space-y-3">
                              <div className="flex items-center space-x-3">
                                <div className={cn(
                                  "w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold shadow-sm",
                                  selectedWorkerId === worker.workerId
                                    ? "bg-white text-blue-600"
                                    : "bg-blue-100 text-blue-700"
                                )}>
                                  {worker.workerName.split(' ').map(n => n[0]).join('').toUpperCase()}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center justify-between mb-1">
                                    <p className={cn(
                                      "font-semibold truncate",
                                      selectedWorkerId === worker.workerId ? "text-white" : "text-gray-900"
                                    )}>
                                      {worker.workerName}
                                    </p>
                                    <span className={cn(
                                      "text-xs font-medium ml-2",
                                      selectedWorkerId === worker.workerId ? "text-blue-100" : "text-gray-600"
                                    )}>
                                      {worker.utilizationPercentage}% busy
                                    </span>
                                  </div>
                                  
                                  {/* Utilization Progress Bar */}
                                  <div className="mb-2">
                                    <div className={cn(
                                      "w-full rounded-full h-2 shadow-sm",
                                      selectedWorkerId === worker.workerId ? "bg-blue-500" : "bg-gray-200"
                                    )}>
                                      <div 
                                        className={cn(
                                          "h-2 rounded-full transition-all duration-300 shadow-sm",
                                          selectedWorkerId === worker.workerId
                                            ? "bg-white"
                                            : worker.utilizationPercentage < 30 ? "bg-emerald-500"
                                            : worker.utilizationPercentage < 70 ? "bg-amber-500" 
                                            : "bg-red-500"
                                        )}
                                        style={{ width: `${Math.min(worker.utilizationPercentage, 100)}%` }}
                                      />
                                    </div>
                                  </div>
                                  
                                  <p className={cn(
                                    "text-sm",
                                    selectedWorkerId === worker.workerId ? "text-blue-100" : "text-gray-600"
                                  )}>
                                    {worker.nextAvailableSlot ? `Next: ${worker.nextAvailableSlot}` : 'Available now'}
                                  </p>
                                </div>
                              </div>
                              
                              {/* Badge Showcase */}
                              <div className={cn(
                                "flex items-center space-x-2 pt-3 border-t",
                                selectedWorkerId === worker.workerId ? "border-blue-400" : "border-gray-100"
                              )}>
                                <Badge className={cn(
                                  "text-xs font-medium px-2.5 py-1 border",
                                  selectedWorkerId === worker.workerId
                                    ? "bg-white text-blue-600 border-white"
                                    : worker.utilizationPercentage < 30 ? "bg-emerald-500 text-white border-emerald-600"
                                    : worker.utilizationPercentage < 70 ? "bg-amber-500 text-white border-amber-600"
                                    : "bg-red-500 text-white border-red-600"
                                )}>
                                  {worker.utilizationPercentage < 30 ? 'Available' 
                                   : worker.utilizationPercentage < 70 ? 'Busy' 
                                   : 'Very Busy'}
                                </Badge>
                                {index === 0 && (
                                  <Badge className={cn(
                                    "text-xs font-medium px-2.5 py-1 border-0",
                                    selectedWorkerId === worker.workerId
                                      ? "bg-white text-blue-600"
                                      : "bg-blue-50 text-blue-600"
                                  )}>
                                    <svg className="w-2.5 h-2.5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                                    </svg>
                                    Recommended
                                  </Badge>
                                )}
                              </div>
                            </div>
                          </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-center py-8">
                          <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-gray-100 flex items-center justify-center">
                            <Search className="w-5 h-5 text-gray-400" />
                          </div>
                          <p className="text-sm text-gray-600 mb-2">No suggestions yet</p>
                          <p className="text-xs text-gray-500">Click "Find Available Times" to see suggested slots</p>
                        </div>
                      )}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {currentStep === 'choose-worker' && (
            <div className="space-y-6">
              <Card>
                <CardHeader className="pb-4">
                  <CardTitle className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center">
                        <User className="w-4 h-4 text-blue-600" />
                    </div>
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900">Select Team Member</h3>
                        <p className="text-sm text-gray-500 mt-0.5">Choose who will handle this appointment</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <div className="flex items-center space-x-1 text-sm text-gray-600">
                        <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                        <span className="font-medium">
                      {selectedDate && (() => {
                        try {
                          return format(selectedDate, 'MMM dd')
                        } catch (error) {
                          return 'Invalid'
                        }
                      })()} at {selectedTime}
                        </span>
                      </div>
                    </div>
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
                        <div className="space-y-5">
                          <div className="flex items-center space-x-3">
                            <div className="w-7 h-7 rounded-full bg-blue-100 flex items-center justify-center">
                              <CheckCircle className="w-4 h-4 text-blue-600" />
                            </div>
                            <div>
                              <h4 className="text-base font-semibold text-gray-900">Available Team Members</h4>
                              <p className="text-sm text-gray-500">Ready to take this appointment</p>
                            </div>
                          </div>
                          <div className="grid gap-3">
                            {availableWorkers.map((worker) => (
                              <div
                                key={worker.workerId}
                                className={cn(
                                  "group relative p-4 border rounded-xl cursor-pointer transition-all duration-300 hover:shadow-lg hover:-translate-y-0.5 min-h-[120px]",
                                  selectedWorkerId === worker.workerId
                                    ? "border-blue-300 bg-blue-50/60 ring-2 ring-blue-200 shadow-md"
                                    : "border-gray-200 hover:border-blue-300 hover:bg-blue-50/20 bg-white"
                                )}
                                onClick={() => setSelectedWorkerId(worker.workerId)}
                              >
                                <div className="grid grid-cols-12 gap-4 items-center h-full">
                                  {/* Avatar and Name Section */}
                                  <div className="col-span-8 flex items-center space-x-3">
                                    <div className="relative">
                                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center shadow-sm">
                                        <span className="text-sm font-bold text-white">
                                          {worker.workerName.split(' ').map(n => n[0]).join('').toUpperCase()}
                                        </span>
                                      </div>
                                      <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-blue-500 rounded-full border-2 border-white flex items-center justify-center">
                                        <CheckCircle className="w-1.5 h-1.5 text-white" />
                                      </div>
                                    </div>
                                    <div className="flex-1 min-w-0">
                                      <div className="flex items-center space-x-2 mb-1">
                                        <h5 className="text-base font-semibold text-gray-900 truncate">{worker.workerName}</h5>
                                        {selectedWorkerId === worker.workerId && (
                                          <div className="w-2 h-2 rounded-full bg-blue-500 flex-shrink-0"></div>
                                        )}
                                  </div>
                                  <div className="flex items-center space-x-2">
                                        {worker.utilizationPercentage <= 30 && (
                                          <div className="inline-flex items-center space-x-1 px-2.5 py-0.5 bg-blue-50 text-blue-600 rounded-full">
                                            <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                                            </svg>
                                            <span className="text-xs font-medium">Recommended</span>
                                          </div>
                                        )}
                                        <div className="inline-flex items-center space-x-1 px-2.5 py-0.5 bg-gray-100 text-gray-600 rounded-full">
                                          <div className="w-2.5 h-2.5 rounded-full bg-blue-500" />
                                          <span className="text-xs font-medium">Available</span>
                                        </div>
                                      </div>
                                    </div>
                                  </div>

                                  {/* Time and Status Section */}
                                  <div className="col-span-4 flex flex-col items-end space-y-2">
                                    <div className="flex items-center space-x-1.5 text-sm text-gray-600">
                                      <svg className="w-3.5 h-3.5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                      </svg>
                                      <span className="font-medium">
                                        {(() => {
                                          try {
                                            const [hours, minutes] = selectedTime.split(':')
                                            const date = new Date()
                                            date.setHours(parseInt(hours), parseInt(minutes))
                                            return format(date, 'h:mm a')
                                          } catch {
                                            return selectedTime
                                          }
                                        })()}
                                      </span>
                                    </div>
                                    <TooltipProvider>
                                      <Tooltip>
                                        <TooltipTrigger asChild>
                                          <div className="inline-flex items-center space-x-1 px-2.5 py-0.5 bg-gray-100 text-gray-600 rounded-full cursor-help">
                                            <div className="w-1.5 h-1.5 rounded-full bg-gray-400" />
                                            <span className="text-xs font-medium">{worker.utilizationPercentage}% busy</span>
                                          </div>
                                        </TooltipTrigger>
                                        <TooltipContent>
                                          <div className="text-xs space-y-1">
                                            <p className="font-medium">Workload Analysis</p>
                                            <div className="flex items-center space-x-2">
                                              <div className="w-2 h-2 rounded-full bg-blue-500" />
                                              <span>Available for appointments</span>
                                            </div>
                                            <div className="flex items-center space-x-2">
                                              <div className="w-2 h-2 rounded-full bg-gray-400" />
                                              <span>{worker.utilizationPercentage <= 30 ? 'Light' : worker.utilizationPercentage <= 60 ? 'Moderate' : 'Heavy'} workload</span>
                                            </div>
                                          </div>
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
                        <div className="space-y-4 mt-8">
                          <div className="flex items-center space-x-3">
                            <div className="w-7 h-7 rounded-full bg-gray-100 flex items-center justify-center">
                              <AlertTriangle className="w-4 h-4 text-gray-500" />
                            </div>
                            <div>
                              <h4 className="text-base font-semibold text-gray-900">Currently Unavailable</h4>
                              <p className="text-sm text-gray-500">Team members with scheduling conflicts</p>
                            </div>
                          </div>
                          <div className="grid gap-4">
                            {unavailableWorkers.map((worker) => (
                              <div
                                key={worker.workerId}
                                className="p-4 border border-gray-200 rounded-xl bg-gray-50/80 opacity-75 min-h-[120px]"
                              >
                                <div className="grid grid-cols-12 gap-4 items-center h-full">
                                  {/* Avatar and Name Section */}
                                  <div className="col-span-8 flex items-center space-x-3">
                                    <div className="relative">
                                      <div className="w-10 h-10 rounded-full bg-gray-400 flex items-center justify-center">
                                        <span className="text-sm font-bold text-white">
                                          {worker.workerName.split(' ').map(n => n[0]).join('').toUpperCase()}
                                        </span>
                                  </div>
                                      <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-gray-500 rounded-full border-2 border-white flex items-center justify-center">
                                        <svg className="w-1.5 h-1.5 text-white" fill="currentColor" viewBox="0 0 20 20">
                                          <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                                        </svg>
                                      </div>
                                    </div>
                                    <div className="flex-1 min-w-0">
                                      <div className="flex items-center space-x-2 mb-1">
                                        <h5 className="text-base font-semibold text-gray-700 truncate">{worker.workerName}</h5>
                                      </div>
                                      <div className="flex items-center space-x-2">
                                        <div className="inline-flex items-center space-x-1 px-2.5 py-0.5 bg-gray-100 text-gray-600 rounded-full">
                                          <div className="w-1.5 h-1.5 rounded-full bg-gray-500" />
                                          <span className="text-xs font-medium">Unavailable</span>
                                        </div>
                                      </div>
                                    </div>
                                  </div>

                                  {/* Status Section */}
                                  <div className="col-span-4 flex flex-col items-end space-y-2">
                                    <div className="text-sm text-gray-500">
                                      {worker.conflictingJobs && worker.conflictingJobs > 0 
                                        ? "Has conflicts"
                                        : "Off schedule"
                                      }
                                    </div>
                                    <div className="inline-flex items-center space-x-1 px-2.5 py-0.5 bg-gray-100 text-gray-600 rounded-full">
                                      <div className="w-1.5 h-1.5 rounded-full bg-gray-400" />
                                      <span className="text-xs font-medium">
                                        {worker.conflictingJobs && worker.conflictingJobs > 0 
                                          ? `${worker.conflictingJobs} conflict${worker.conflictingJobs !== 1 ? 's' : ''}`
                                          : "Not working"
                                        }
                                      </span>
                                    </div>
                                  </div>
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
            <div className="space-y-6">
              {/* Clean Professional Header */}
              <div className="flex items-center space-x-3 pb-4 border-b border-gray-200">
                <div className="w-10 h-10 rounded-lg bg-blue-600 flex items-center justify-center">
                  <CheckCircle className="w-5 h-5 text-white" />
                </div>
                    <div>
                  <h3 className="text-lg font-semibold text-gray-900">Confirm Reschedule</h3>
                  <p className="text-sm text-gray-600">Review the appointment changes below</p>
                </div>
              </div>

              {/* Clean Summary Card */}
              <div className="bg-gray-50 rounded-lg p-6 border border-gray-200">
                <div className="flex items-center space-x-3 mb-5">
                  <CalendarIcon className="w-5 h-5 text-gray-600" />
                  <h4 className="text-base font-semibold text-gray-900">Reschedule Summary</h4>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* New Date & Time */}
                  <div className="space-y-3">
                    <p className="text-sm font-medium text-gray-700">New Date & Time</p>
                    <div className="bg-white rounded-lg p-4 border border-gray-200">
                      <p className="text-sm font-semibold text-gray-900">
                        {selectedDate && selectedTime && (() => {
                          try {
                            // Create a clean date object
                            let dateObj;
                            if (selectedDate instanceof Date) {
                              dateObj = new Date(selectedDate);
                            } else {
                              dateObj = new Date(selectedDate);
                            }
                            
                            // Parse time and set hours/minutes
                            const [hours, minutes] = selectedTime.split(':').map(num => parseInt(num, 10));
                            dateObj.setHours(hours, minutes, 0, 0);
                            
                            // Format with proper error handling
                            if (isNaN(dateObj.getTime())) {
                              return 'Invalid date selected';
                            }
                            
                            return format(dateObj, 'EEEE, MMMM dd, yyyy \'at\' h:mm a');
                          } catch (error) {
                            console.error('Date formatting error:', error);
                            return 'Invalid date format';
                          }
                        })()}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        {selectedDate && (() => {
                          try {
                            const dateObj = selectedDate instanceof Date ? selectedDate : new Date(selectedDate);
                            if (isToday(dateObj)) return 'Today';
                            if (isTomorrow(dateObj)) return 'Tomorrow';
                            return format(dateObj, 'EEEE');
                          } catch {
                            return '';
                          }
                        })()}
                      </p>
                    </div>
                  </div>

                  {/* Assigned Worker */}
                  <div className="space-y-3">
                    <p className="text-sm font-medium text-gray-700">Assigned Worker</p>
                    <div className="bg-white rounded-lg p-4 border border-gray-200">
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white text-sm font-medium">
                          {(() => {
                            // Enhanced worker name resolution with proper fallbacks
                            let workerName = 'Unknown Worker';
                            
                            // Try workerAvailability first
                            const availabilityWorker = workerAvailability.find(w => w.workerId === selectedWorkerId);
                            if (availabilityWorker?.workerName) {
                              workerName = availabilityWorker.workerName;
                            } else {
                              // Fallback to workers array
                              const worker = workers.find(w => w.id === selectedWorkerId);
                              if (worker?.name) {
                                workerName = worker.name;
                              }
                            }
                            
                            // Proper name formatting and initials
                            const cleanName = workerName.trim();
                            const nameParts = cleanName.split(' ');
                            if (nameParts.length >= 2) {
                              return (nameParts[0][0] + nameParts[1][0]).toUpperCase();
                            }
                            return cleanName.slice(0, 2).toUpperCase();
                          })()}
                    </div>
                    <div>
                          <p className="text-sm font-semibold text-gray-900">
                            {(() => {
                              // Enhanced worker name resolution with proper formatting
                              let workerName = 'Unknown Worker';
                              
                              // Try workerAvailability first
                              const availabilityWorker = workerAvailability.find(w => w.workerId === selectedWorkerId);
                              if (availabilityWorker?.workerName) {
                                workerName = availabilityWorker.workerName;
                              } else {
                                // Fallback to workers array
                                const worker = workers.find(w => w.id === selectedWorkerId);
                                if (worker?.name) {
                                  workerName = worker.name;
                                }
                              }
                              
                              // Proper name formatting
                              return workerName.split(' ')
                                .map(part => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
                                .join(' ');
                            })()}
                          </p>
                          <div className="flex items-center space-x-1 mt-1">
                            <div className="w-2 h-2 rounded-full bg-green-500"></div>
                            <span className="text-xs text-gray-600">Available</span>
                          </div>
                        </div>
                      </div>
                    </div>
                    </div>
                  </div>
                </div>

              {/* Clean Options Section */}
                <div className="space-y-4">
                {/* Reason Input */}
                <div className="space-y-2">
                  <Label htmlFor="reschedule-reason" className="text-sm font-medium text-gray-900">
                    Reason for Change <span className="text-gray-500 font-normal">(Optional)</span>
                  </Label>
                    <Input
                      id="reschedule-reason"
                      value={rescheduleReason}
                      onChange={(e) => setRescheduleReason(e.target.value)}
                    placeholder="e.g., Client request, scheduling conflict, emergency"
                    className="bg-white border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                    />
                  </div>

                {/* Client Notification */}
                <div className="bg-white rounded-lg p-4 border border-gray-200">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                    <Switch
                      id="notify-client"
                      checked={notifyClient}
                      onCheckedChange={setNotifyClient}
                        className="data-[state=checked]:bg-blue-600 data-[state=unchecked]:bg-gray-200"
                      />
                      <div>
                        <Label htmlFor="notify-client" className="text-sm font-medium text-gray-900">
                          Notify client and worker of the change
                        </Label>
                        <p className="text-xs text-gray-600 mt-0.5">
                          {(() => {
                            const clientPhone = completeJobData?.client_phone || job?.client_phone
                            const workerChanged = selectedWorkerId !== job?.worker_id
                            
                            if (clientPhone) {
                              return `SMS notifications will be sent to client${workerChanged ? ' and worker' : ''}`
                            } else {
                              return 'Client has no phone number - manual contact required'
                            }
                          })()}
                        </p>
                  </div>
                    </div>
                    {notifyClient && (
                      <Badge variant="secondary" className="bg-blue-100 text-blue-700 text-xs">
                        Recommended
                      </Badge>
                    )}
                </div>

                  {/* SMS Status Display */}
                  {smsStatus && (
                    <div className="mt-3 pt-3 border-t border-gray-100">
                      <div className="flex items-center space-x-2">
                        <CheckCircle className="w-4 h-4 text-green-600" />
                        <span className="text-sm text-green-700 font-medium">
                          Notifications sent successfully!
                        </span>
                      </div>
                      <div className="mt-2 space-y-1">
                        {smsStatus.clientSent && (
                          <div className="flex items-center space-x-2 text-xs text-gray-600">
                            <div className="w-1 h-1 rounded-full bg-green-500"></div>
                            <span>Client SMS notification delivered</span>
                          </div>
                        )}
                        {smsStatus.workerSent && (
                          <div className="flex items-center space-x-2 text-xs text-gray-600">
                            <div className="w-1 h-1 rounded-full bg-green-500"></div>
                            <span>Worker SMS notification delivered</span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Clean Action Button */}
              <div className="pt-4">
                <Button
                  onClick={executeReschedule}
                  disabled={isProcessing}
                  size="lg"
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-3"
                >
                  {isProcessing ? (
                    <div className="flex items-center space-x-2">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Processing Reschedule...</span>
                    </div>
                  ) : (
                    <div className="flex items-center space-x-2">
                      <CheckCircle className="w-4 h-4" />
                      <span>Confirm & Reschedule Appointment</span>
                    </div>
                  )}
                </Button>
              </div>
            </div>
          )}

                    {/* Clean Navigation Buttons */}
          <div className="flex justify-between items-center pt-4 border-t border-gray-200">
            <div className="flex items-center space-x-3">
            <Button
              variant="outline"
              onClick={handleStepBack}
              disabled={currentStep === 'select-time' || isProcessing}
                className="px-4 py-2 border-gray-300 hover:bg-gray-50 disabled:opacity-50"
            >
                <ChevronLeft className="w-4 h-4 mr-1" />
              Back
            </Button>
            </div>
            <div className="flex space-x-3">
              <Button 
                variant="ghost" 
                onClick={onClose} 
                disabled={isProcessing}
                className="px-4 py-2 text-gray-600 hover:text-gray-900 hover:bg-gray-50"
              >
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
                  className={cn(
                    "px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium",
                    (currentStep === 'select-time' && workerAvailability.length > 0 && availableWorkers.length === 0) && "opacity-50 cursor-not-allowed"
                  )}
                >
                  {isCheckingAvailability ? (
                    <div className="flex items-center space-x-2">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Checking...</span>
                    </div>
                  ) : (
                    <div className="flex items-center space-x-2">
                      <span>Next</span>
                      <ChevronRight className="w-4 h-4 ml-1" />
                    </div>
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