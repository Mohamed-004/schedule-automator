'use client'

import React, { useState, useTransition } from 'react'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm, useFieldArray } from 'react-hook-form'
import { z } from 'zod'
import { Check, ChevronsUpDown, PlusIcon, Trash2, User, Clock, Loader2, Briefcase, FileText, ListChecks, Mail, Phone, MapPin, Users, AlertCircle } from 'lucide-react'
import { format } from 'date-fns'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import dynamic from 'next/dynamic'
import 'react-phone-number-input/style.css'

const PhoneInput = dynamic(() => import('react-phone-number-input'), { ssr: false })

const assignmentFormSchema = z.object({
  title: z.string().min(2, 'Title must be at least 2 characters.'),
  description: z.string().optional(),
  clientId: z.string().uuid({ message: 'Please select a client.' }),
  scheduledAtDate: z.date({ required_error: 'A date is required.' }),
  scheduledAtTime: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, 'Invalid time format. Please use HH:MM.'),
  scheduledEndTime: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, 'Invalid time format. Please use HH:MM.'),
  duration: z.coerce.number().int().positive('Duration must be calculated.'),
  assignedWorkerId: z.string().uuid({ message: 'Please select a worker.' }),
  workItems: z.array(z.object({ value: z.string().min(1, 'Item description cannot be empty.') })).min(1, 'At least one work item is required.'),
  jobTypeId: z.string().uuid({ message: 'Please select a job type.' }).optional(),
})

type AssignmentFormValues = z.infer<typeof assignmentFormSchema>

interface Client {
  id: string
  name: string
  email?: string | null
  phone?: string | null
}

interface JobType {
  id: string
  name: string
  description?: string | null
  requiredSkills?: string[] | null
}

interface PrefilledData {
  workerId: string
  workerName: string
  scheduledDate: Date
  scheduledTime: string
  scheduledEndTime: string
  suggestedDuration: number
}

interface EmbeddedAssignmentFormProps {
  clients: Client[]
  jobTypes?: JobType[]
  prefilledData: PrefilledData
  onJobCreated: (jobData: any) => void
  onCancel: () => void
}

// Generate time slots constrained to the available slot
const generateTimeSlots = (startTime: string, endTime: string) => {
  const startMinutes = timeToMinutes(startTime)
  const endMinutes = timeToMinutes(endTime)
  
  const slots = []
  
  // Generate 15-minute intervals within the available slot
  for (let minutes = startMinutes; minutes <= endMinutes; minutes += 15) {
    const hours = Math.floor(minutes / 60)
    const mins = minutes % 60
    slots.push(`${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}`)
  }
  
  return slots
}

function timeToMinutes(timeStr: string): number {
  if (!timeStr) return 0
  
  // Handle both 12-hour (AM/PM) and 24-hour formats
  const timeRegex12 = /^(\d{1,2}):(\d{2})\s*(AM|PM)$/i
  const timeRegex24 = /^(\d{1,2}):(\d{2})$/
  
  let hours = 0
  let minutes = 0
  
  if (timeRegex12.test(timeStr)) {
    // 12-hour format (e.g., "12:00 AM", "1:30 PM")
    const match = timeStr.match(timeRegex12)
    if (match) {
      hours = parseInt(match[1])
      minutes = parseInt(match[2])
      const period = match[3].toUpperCase()
      
      // Convert to 24-hour format
      if (period === 'AM') {
        if (hours === 12) hours = 0 // 12:00 AM = 00:00
      } else { // PM
        if (hours !== 12) hours += 12 // 1:00 PM = 13:00, but 12:00 PM = 12:00
      }
    }
  } else if (timeRegex24.test(timeStr)) {
    // 24-hour format (e.g., "13:30", "09:15")
    const match = timeStr.match(timeRegex24)
    if (match) {
      hours = parseInt(match[1])
      minutes = parseInt(match[2])
    }
  } else {
    // Fallback: try to split by colon and parse
    const parts = timeStr.split(':')
    if (parts.length >= 2) {
      hours = parseInt(parts[0]) || 0
      minutes = parseInt(parts[1]) || 0
    }
  }
  
  const totalMinutes = hours * 60 + minutes
  return totalMinutes
}

// Convert 12-hour format to 24-hour format for validation
function convertTo24Hour(timeStr: string): string {
  if (!timeStr) return ''
  
  // If already in 24-hour format, return as is
  if (/^([01]\d|2[0-3]):([0-5]\d)$/.test(timeStr)) {
    return timeStr
  }
  
  // Handle 12-hour format
  const timeRegex12 = /^(\d{1,2}):(\d{2})\s*(AM|PM)$/i
  if (timeRegex12.test(timeStr)) {
    const match = timeStr.match(timeRegex12)
    if (match) {
      let hours = parseInt(match[1])
      const minutes = match[2]
      const period = match[3].toUpperCase()
      
      // Convert to 24-hour format
      if (period === 'AM') {
        if (hours === 12) hours = 0 // 12:00 AM = 00:00
      } else { // PM
        if (hours !== 12) hours += 12 // 1:00 PM = 13:00, but 12:00 PM = 12:00
      }
      
      return `${String(hours).padStart(2, '0')}:${minutes}`
    }
  }
  
  return timeStr
}

/**
 * Embedded Assignment Form - Reusable job assignment form with pre-filling capabilities
 * Used within modals and overlays for contextual job creation
 */
export function EmbeddedAssignmentForm({
  clients,
  jobTypes = [],
  prefilledData,
  onJobCreated,
  onCancel
}: EmbeddedAssignmentFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isClientDialogOpen, setIsClientDialogOpen] = useState(false)
  const [newClientName, setNewClientName] = useState("")
  const [newClientEmail, setNewClientEmail] = useState("")
  const [newClientPhone, setNewClientPhone] = useState<string | undefined>("")
  const [newClientAddress, setNewClientAddress] = useState("")
  const [isCreatingClient, startCreatingClient] = useTransition()
  const [clientsList, setClientsList] = useState<Client[]>(clients)
  
  // Popover state management
  const [startTimePopoverOpen, setStartTimePopoverOpen] = useState(false)
  const [endTimePopoverOpen, setEndTimePopoverOpen] = useState(false)

  // Generate time slots constrained to the available slot
  const timeSlots = generateTimeSlots(prefilledData.scheduledTime, prefilledData.scheduledEndTime)

  // Calculate duration from prefilled times
  const calculateDuration = (startTime: string, endTime: string) => {
    const startMinutes = timeToMinutes(startTime)
    const endMinutes = timeToMinutes(endTime)
    const duration = endMinutes - startMinutes
    return Math.max(0, duration) // Ensure non-negative duration
  }

  const form = useForm<AssignmentFormValues>({
    resolver: zodResolver(assignmentFormSchema),
    defaultValues: {
      title: '',
      description: '',
      clientId: '',
      scheduledAtDate: prefilledData.scheduledDate,
      scheduledAtTime: convertTo24Hour(prefilledData.scheduledTime),
      scheduledEndTime: convertTo24Hour(prefilledData.scheduledEndTime),
      duration: calculateDuration(prefilledData.scheduledTime, prefilledData.scheduledEndTime),
      assignedWorkerId: prefilledData.workerId,
      workItems: [{ value: '' }],
      jobTypeId: '',
    },
  })

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: 'workItems',
  })

  // Watch for time changes to update duration and validate
  const watchedStartTime = form.watch('scheduledAtTime')
  const watchedEndTime = form.watch('scheduledEndTime')

  React.useEffect(() => {
    if (watchedStartTime && watchedEndTime) {
      const newDuration = calculateDuration(watchedStartTime, watchedEndTime)
      if (newDuration > 0) {
        form.setValue('duration', newDuration)
      } else {
        // If end time is before start time, reset end time
        const startMinutes = timeToMinutes(watchedStartTime)
        const availableEndMinutes = timeToMinutes(convertTo24Hour(prefilledData.scheduledEndTime))
        
        // Set end time to 1 hour after start time or the slot end, whichever is earlier
        const suggestedEndMinutes = Math.min(startMinutes + 60, availableEndMinutes)
        const suggestedEndHours = Math.floor(suggestedEndMinutes / 60)
        const suggestedEndMins = suggestedEndMinutes % 60
        const suggestedEndTime = `${String(suggestedEndHours).padStart(2, '0')}:${String(suggestedEndMins).padStart(2, '0')}`
        
        form.setValue('scheduledEndTime', suggestedEndTime)
        form.setValue('duration', calculateDuration(watchedStartTime, suggestedEndTime))
      }
    }
  }, [watchedStartTime, watchedEndTime, form, prefilledData.scheduledEndTime])

  // Initialize form with proper values
  React.useEffect(() => {
    const initialDuration = calculateDuration(prefilledData.scheduledTime, prefilledData.scheduledEndTime)
    if (initialDuration > 0) {
      form.setValue('duration', initialDuration)
    }
  }, [prefilledData, form])

  // Get form validation errors for display
  const formErrors = form.formState.errors
  const hasActualErrors = Object.keys(formErrors).length > 0 && form.formState.isSubmitted

  // Check form completion status
  const formValues = form.watch()
  const isFormComplete = () => {
    const hasTitle = formValues.title?.trim().length >= 2
    const hasClient = !!formValues.clientId
    const hasStartTime = !!formValues.scheduledAtTime
    const hasEndTime = !!formValues.scheduledEndTime
    const hasDuration = formValues.duration > 0
    const hasWorkItems = formValues.workItems?.some(item => item.value?.trim().length > 0)
    
    return hasTitle && hasClient && hasStartTime && hasEndTime && hasDuration && hasWorkItems
  }

  // Check if form has been touched and has missing required fields
  const getMissingFields = () => {
    const missing = []
    if (!formValues.title?.trim() || formValues.title.trim().length < 2) missing.push('Add a job title (minimum 2 characters)')
    if (!formValues.clientId) missing.push('Select a client')
    if (!formValues.scheduledAtTime) missing.push('Select start time')
    if (!formValues.scheduledEndTime) missing.push('Select end time')
    if (!formValues.workItems?.some(item => item.value?.trim().length > 0)) missing.push('Add at least one work item')
    return missing
  }

  const missingFields = getMissingFields()
  const showCompletionAlert = missingFields.length > 0 && !hasActualErrors

  const onSubmit = async (data: AssignmentFormValues) => {
    try {
      setIsSubmitting(true)

      // Validate that end time is after start time
      const startMinutes = timeToMinutes(data.scheduledAtTime)
      const endMinutes = timeToMinutes(data.scheduledEndTime)
      
      if (endMinutes <= startMinutes) {
        toast.error('End time must be after start time')
        return
      }

      // Filter out empty work items
      const filteredWorkItems = data.workItems.filter(item => item.value.trim().length > 0)
      
      if (filteredWorkItems.length === 0) {
        toast.error('At least one work item is required')
        return
      }

      const jobData = {
        ...data,
        workItems: filteredWorkItems,
        scheduledAt: new Date(`${format(data.scheduledAtDate, 'yyyy-MM-dd')}T${data.scheduledAtTime}:00`),
        scheduledEndAt: new Date(`${format(data.scheduledAtDate, 'yyyy-MM-dd')}T${data.scheduledEndTime}:00`),
      }

      const response = await fetch('/api/jobs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(jobData),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to create job')
      }

      const result = await response.json()
      toast.success('Job created successfully!')
      onJobCreated(result)
    } catch (error) {
      console.error('Error creating job:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to create job')
    } finally {
      setIsSubmitting(false)
    }
  }

  const createNewClient = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!newClientName.trim()) {
      toast.error('Client name is required')
      return
    }

    startCreatingClient(async () => {
      try {
        const clientData = {
          name: newClientName.trim(),
          email: newClientEmail.trim() || null,
          phone: newClientPhone || null,
          address: newClientAddress.trim() || null,
        }

        const response = await fetch('/api/clients', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(clientData),
        })

        if (!response.ok) {
          const errorData = await response.json()
          throw new Error(errorData.error || 'Failed to create client')
        }

        const newClient = await response.json()
        
        // Update clients list and select the new client
        setClientsList(prev => [...prev, newClient])
        form.setValue('clientId', newClient.id)
        
        // Reset form and close dialog
        setNewClientName('')
        setNewClientEmail('')
        setNewClientPhone('')
        setNewClientAddress('')
        setIsClientDialogOpen(false)
        
        toast.success('Client created successfully!')
      } catch (error) {
        console.error('Error creating client:', error)
        toast.error(error instanceof Error ? error.message : 'Failed to create client')
      }
    })
  }

  return (
    <div className="space-y-6">
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          
          {/* Form Validation Status */}
          {hasActualErrors && (
            <Alert variant="destructive" className="border-red-200 bg-red-50">
              <AlertCircle className="h-4 w-4 text-red-500" />
              <AlertDescription className="text-red-800">
                <span className="font-medium">Please fix the following errors:</span>
                <ul className="mt-2 list-disc list-inside space-y-1">
                  {formErrors.title && <li>{formErrors.title.message}</li>}
                  {formErrors.clientId && <li>{formErrors.clientId.message}</li>}
                  {formErrors.scheduledAtTime && <li>{formErrors.scheduledAtTime.message}</li>}
                  {formErrors.scheduledEndTime && <li>{formErrors.scheduledEndTime.message}</li>}
                  {formErrors.duration && <li>{formErrors.duration.message}</li>}
                  {formErrors.workItems && <li>{formErrors.workItems.message}</li>}
                  {formErrors.workItems?.root && <li>{formErrors.workItems.root.message}</li>}
                </ul>
              </AlertDescription>
            </Alert>
          )}

          {/* Form Completion Status */}
          {showCompletionAlert && (
            <Alert>
              <AlertCircle className="h-4 w-4 text-amber-500" />
              <AlertDescription>
                Complete the following to create your job:
                <ul className="mt-2 list-disc list-inside space-y-1">
                  {missingFields.map((field, index) => (
                    <li key={index}>{field}</li>
                  ))}
                </ul>
              </AlertDescription>
            </Alert>
          )}

          {/* Form Ready Status */}
          {!hasActualErrors && isFormComplete() && (
            <Alert className="border-green-200 bg-green-50">
              <div className="flex items-center">
                <div className="w-4 h-4 bg-green-500 rounded-full flex items-center justify-center mr-2">
                  <svg className="w-2.5 h-2.5 text-white" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                </div>
                <AlertDescription className="text-green-800 font-medium">
                  Form is complete and ready to submit!
                </AlertDescription>
              </div>
            </Alert>
          )}

          {/* Step 1: Basic Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Briefcase className="w-5 h-5" />
                Job Details
              </CardTitle>
              <CardDescription>
                Provide the basic information for this job assignment.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Job Title *</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., Kitchen Installation" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Additional details about the job..."
                        className="resize-none"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="clientId"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Client *</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant="outline"
                            role="combobox"
                            className={cn(
                              'w-full justify-between',
                              !field.value && 'text-muted-foreground'
                            )}
                          >
                            {field.value
                              ? clientsList.find((client) => client.id === field.value)?.name
                              : 'Select client'}
                            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-full p-0">
                        <Command>
                          <CommandInput placeholder="Search client..." />
                          <CommandList>
                            <CommandEmpty>
                              <div className="p-4 text-center">
                                <p className="text-sm text-muted-foreground mb-3">No client found.</p>
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  onClick={() => setIsClientDialogOpen(true)}
                                >
                                  <PlusIcon className="w-4 h-4 mr-2" />
                                  Create New Client
                                </Button>
                              </div>
                            </CommandEmpty>
                            <CommandGroup>
                              {clientsList.map((client) => (
                                <CommandItem
                                  value={client.name}
                                  key={client.id}
                                  onSelect={() => {
                                    form.setValue('clientId', client.id)
                                  }}
                                >
                                  <Check
                                    className={cn(
                                      'mr-2 h-4 w-4',
                                      client.id === field.value
                                        ? 'opacity-100'
                                        : 'opacity-0'
                                    )}
                                  />
                                  {client.name}
                                </CommandItem>
                              ))}
                              <CommandItem
                                onSelect={() => setIsClientDialogOpen(true)}
                                className="border-t"
                              >
                                <PlusIcon className="mr-2 h-4 w-4" />
                                Create New Client
                              </CommandItem>
                            </CommandGroup>
                          </CommandList>
                        </Command>
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {jobTypes.length > 0 && (
                <FormField
                  control={form.control}
                  name="jobTypeId"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel>Job Type</FormLabel>
                      <Popover>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button
                              variant="outline"
                              role="combobox"
                              className={cn(
                                'w-full justify-between',
                                !field.value && 'text-muted-foreground'
                              )}
                            >
                              {field.value
                                ? jobTypes.find((type) => type.id === field.value)?.name
                                : 'Select job type (optional)'}
                              <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-full p-0">
                          <Command>
                            <CommandInput placeholder="Search job type..." />
                            <CommandList>
                              <CommandEmpty>No job type found.</CommandEmpty>
                              <CommandGroup>
                                {jobTypes.map((type) => (
                                  <CommandItem
                                    value={type.name}
                                    key={type.id}
                                    onSelect={() => {
                                      form.setValue('jobTypeId', type.id)
                                    }}
                                  >
                                    <Check
                                      className={cn(
                                        'mr-2 h-4 w-4',
                                        type.id === field.value
                                          ? 'opacity-100'
                                          : 'opacity-0'
                                      )}
                                    />
                                    {type.name}
                                  </CommandItem>
                                ))}
                              </CommandGroup>
                            </CommandList>
                          </Command>
                        </PopoverContent>
                      </Popover>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}
            </CardContent>
          </Card>

          {/* Step 2: Schedule */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="w-5 h-5" />
                Schedule
              </CardTitle>
              <CardDescription>
                Set the timing for this job within the available slot.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="scheduledAtTime"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-2">
                        <Clock className="w-4 h-4" />
                        Start Time *
                      </FormLabel>
                      <Popover open={startTimePopoverOpen} onOpenChange={setStartTimePopoverOpen}>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button
                              variant="outline"
                              className={cn(
                                'w-full justify-start text-left font-normal',
                                !field.value && 'text-muted-foreground'
                              )}
                            >
                              <Clock className="mr-2 h-4 w-4" />
                              {field.value || 'Select start time'}
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent
                          className="w-[--radix-popover-trigger-width] p-1 max-h-[min(240px,calc(100vh-200px))] overflow-y-auto overflow-x-hidden"
                          align="start"
                          side="bottom"
                          sideOffset={4}
                          avoidCollisions={true}
                          collisionPadding={8}
                        >
                          {timeSlots.length > 0 ? (
                            timeSlots.map((time) => (
                              <button
                                key={time}
                                type="button"
                                className="w-full px-3 py-2 text-left hover:bg-emerald-50 hover:text-emerald-700 cursor-pointer text-sm border-none bg-transparent transition-colors duration-150 rounded-sm"
                                onClick={(e) => {
                                  e.preventDefault()
                                  e.stopPropagation()
                                  const convertedTime = convertTo24Hour(time)
                                  form.setValue('scheduledAtTime', convertedTime)
                                  form.trigger('scheduledAtTime')
                                  setStartTimePopoverOpen(false)
                                }}
                              >
                                {time}
                              </button>
                            ))
                          ) : (
                            <div className="px-3 py-2 text-sm text-gray-500">
                              No time slots available
                            </div>
                          )}
                        </PopoverContent>
                      </Popover>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="scheduledEndTime"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-2">
                        <Clock className="w-4 h-4" />
                        End Time *
                      </FormLabel>
                      <Popover open={endTimePopoverOpen} onOpenChange={setEndTimePopoverOpen}>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button
                              variant="outline"
                              className={cn(
                                'w-full justify-start text-left font-normal',
                                !field.value && 'text-muted-foreground'
                              )}
                            >
                              <Clock className="mr-2 h-4 w-4" />
                              {field.value || 'Select end time'}
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent
                          className="w-[--radix-popover-trigger-width] p-1 max-h-[min(240px,calc(100vh-200px))] overflow-y-auto overflow-x-hidden"
                          align="start"
                          side="bottom"
                          sideOffset={4}
                          avoidCollisions={true}
                          collisionPadding={8}
                        >
                          {timeSlots
                            .filter((time) => {
                              // Only show times after the selected start time
                              const startTime = form.watch('scheduledAtTime')
                              if (!startTime) return true
                              return timeToMinutes(convertTo24Hour(time)) > timeToMinutes(startTime)
                            })
                            .map((time) => (
                              <button
                                key={time}
                                type="button"
                                className="w-full px-3 py-2 text-left hover:bg-emerald-50 hover:text-emerald-700 cursor-pointer text-sm border-none bg-transparent transition-colors duration-150 rounded-sm"
                                onClick={(e) => {
                                  e.preventDefault()
                                  e.stopPropagation()
                                  const convertedTime = convertTo24Hour(time)
                                  form.setValue('scheduledEndTime', convertedTime)
                                  form.trigger('scheduledEndTime')
                                  setEndTimePopoverOpen(false)
                                }}
                              >
                                {time}
                              </button>
                            ))}
                        </PopoverContent>
                      </Popover>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Pre-filled worker info */}
              <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-lg">
                <div className="flex items-center gap-2 mb-3">
                  <User className="w-4 h-4 text-emerald-600" />
                  <span className="font-medium text-emerald-800">Assigned Worker</span>
                </div>
                <p className="text-emerald-700 font-medium mb-3">{prefilledData.workerName}</p>
                
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-emerald-700">Duration:</span>
                    <span className="text-sm text-emerald-600">{form.watch('duration') || 0} minutes</span>
                  </div>
                  
                  <div className="mt-3">
                    <Badge className="bg-emerald-600 text-white border-emerald-600 px-3 py-1 font-medium">
                      <Clock className="w-3 h-3 mr-2" />
                      Available: {prefilledData.scheduledTime} - {prefilledData.scheduledEndTime}
                    </Badge>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Step 3: Work Items */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ListChecks className="w-5 h-5" />
                Work Items *
              </CardTitle>
              <CardDescription>
                Add a checklist of mandatory tasks for this job.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {fields.map((field, index) => (
                  <div key={field.id} className="flex items-center gap-2">
                    <span className="text-sm text-gray-500 min-w-[20px]">{index + 1}.</span>
                    <FormField
                      control={form.control}
                      name={`workItems.${index}.value`}
                      render={({ field }) => (
                        <FormItem className="flex-1">
                          <FormControl>
                            <Input
                              placeholder="Enter task description..."
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    {fields.length > 1 && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => remove(index)}
                        className="h-10 w-10 p-0"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>
              
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="mt-3"
                onClick={() => append({ value: '' })}
              >
                <PlusIcon className="h-4 w-4 mr-2" />
                Add Task
              </Button>
            </CardContent>
          </Card>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t">
            <Button
              type="button"
              variant="outline"
              onClick={onCancel}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting || !isFormComplete()}
              className={cn(
                "min-w-[120px]",
                isFormComplete() && !isSubmitting 
                  ? "bg-green-600 hover:bg-green-700 text-white" 
                  : ""
              )}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Creating...
                </>
              ) : isFormComplete() ? (
                <>
                  <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  Create Job
                </>
              ) : (
                'Complete Form to Create Job'
              )}
            </Button>
          </div>
        </form>
      </Form>

      {/* Client Creation Dialog */}
      <Dialog open={isClientDialogOpen} onOpenChange={setIsClientDialogOpen}>
        <DialogContent className="sm:max-w-[480px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3 text-2xl">
              <Users className="h-7 w-7" />
              Create a New Client
            </DialogTitle>
            <DialogDescription>
              Add a new client to your database. This client will be automatically selected after creation.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={createNewClient}>
            <div className="space-y-6 py-6">
              <div className="space-y-2">
                <Label htmlFor="new-client-name" className="flex items-center gap-2 text-sm">
                  <User className="h-4 w-4" />
                  Name <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="new-client-name"
                  value={newClientName}
                  onChange={(e) => setNewClientName(e.target.value)}
                  placeholder="e.g., Acme Inc."
                  required
                  className="text-base"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="new-client-email" className="flex items-center gap-2 text-sm">
                  <Mail className="h-4 w-4" />
                  Email
                </Label>
                <Input
                  id="new-client-email"
                  type="email"
                  value={newClientEmail}
                  onChange={(e) => setNewClientEmail(e.target.value)}
                  placeholder="e.g., contact@acme.com"
                  className="text-base"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="new-client-phone" className="flex items-center gap-2 text-sm">
                  <Phone className="h-4 w-4" />
                  Phone
                </Label>
                <PhoneInput
                  id="new-client-phone"
                  international
                  countryCallingCodeEditable={false}
                  defaultCountry="US"
                  value={newClientPhone}
                  onChange={setNewClientPhone}
                  className="input text-base"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="new-client-address" className="flex items-center gap-2 text-sm">
                  <MapPin className="h-4 w-4" />
                  Address
                </Label>
                <Textarea
                  id="new-client-address"
                  value={newClientAddress}
                  onChange={(e) => setNewClientAddress(e.target.value)}
                  placeholder="e.g., 123 Main St, Anytown, USA 12345 or N/A"
                  className="text-base"
                />
              </div>
            </div>
            <DialogFooter className="pt-6">
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => setIsClientDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isCreatingClient}>
                {isCreatingClient && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {isCreatingClient ? "Saving Client..." : "Save Client"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
} 