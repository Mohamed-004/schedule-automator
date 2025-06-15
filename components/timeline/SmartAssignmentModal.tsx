'use client'

import React, { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Loader2, X, Calendar, Clock, User, MapPin, Briefcase } from 'lucide-react'
import { EmbeddedAssignmentForm } from './EmbeddedAssignmentForm'
import { format } from 'date-fns'

interface SmartAssignmentModalProps {
  isOpen: boolean
  onClose: () => void
  workerId: string
  workerName: string
  selectedDate: Date
  selectedTimeSlot: {
    startTime: string
    endTime: string
  }
  onJobCreated?: (jobData: any) => void
}

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

/**
 * Smart Assignment Modal - Full job assignment interface triggered from available timeline slots
 * Provides context-aware pre-filling and intelligent suggestions
 */
export function SmartAssignmentModal({
  isOpen,
  onClose,
  workerId,
  workerName,
  selectedDate,
  selectedTimeSlot,
  onJobCreated
}: SmartAssignmentModalProps) {
  const [clients, setClients] = useState<Client[]>([])
  const [jobTypes, setJobTypes] = useState<JobType[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Load required data when modal opens
  useEffect(() => {
    if (isOpen) {
      loadData()
    }
  }, [isOpen])

  const loadData = async () => {
    setIsLoading(true)
    setError(null)

    try {
      // Load clients (required)
      const clientsResponse = await fetch('/api/clients')
      
      if (!clientsResponse.ok) {
        throw new Error('Failed to load clients')
      }

      const clientsData = await clientsResponse.json()
      const processedClients = Array.isArray(clientsData) ? clientsData : (clientsData.data || [])
      setClients(processedClients)

      // Load job types (optional - don't fail if it doesn't exist)
      try {
        const jobTypesResponse = await fetch('/api/job-types')
        if (jobTypesResponse.ok) {
          const jobTypesData = await jobTypesResponse.json()
          const processedJobTypes = Array.isArray(jobTypesData) ? jobTypesData : (jobTypesData.data || [])
          setJobTypes(processedJobTypes)
        } else {
          console.warn('Job types endpoint not available, proceeding without job types')
          setJobTypes([])
        }
      } catch (jobTypesError) {
        console.warn('Failed to load job types, proceeding without them:', jobTypesError)
        setJobTypes([])
      }

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load data')
    } finally {
      setIsLoading(false)
    }
  }

  // Calculate suggested duration based on time slot
  const calculateSuggestedDuration = () => {
    try {
      // Helper function to convert time string to minutes (handles both 12-hour and 24-hour formats)
      const timeToMinutes = (timeStr: string): number => {
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
        
        return hours * 60 + minutes
      }

      const startMinutes = timeToMinutes(selectedTimeSlot.startTime)
      const endMinutes = timeToMinutes(selectedTimeSlot.endTime)
      const diffMinutes = endMinutes - startMinutes
      
      // Handle overnight slots (e.g., 23:00 to 01:00)
      const actualDiff = diffMinutes < 0 ? diffMinutes + (24 * 60) : diffMinutes
      
      // Suggest common durations or the full slot
      if (actualDiff <= 0) return 60 // Default fallback
      if (actualDiff <= 60) return actualDiff
      if (actualDiff <= 120) return 120
      if (actualDiff <= 180) return 180
      return Math.min(actualDiff, 240) // Max 4 hours
    } catch (error) {
      console.error('Error calculating duration:', error)
      return 60 // Default fallback
    }
  }

  const handleJobCreated = (jobData: any) => {
    onJobCreated?.(jobData)
    onClose()
  }

  const formatTimeSlot = () => {
    return `${selectedTimeSlot.startTime} - ${selectedTimeSlot.endTime}`
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl w-[95vw] max-h-[90vh] flex flex-col overflow-hidden">
        <DialogHeader className="pb-4 border-b flex-shrink-0">
          <div className="flex items-center justify-between">
            <DialogTitle className="flex items-center gap-3 text-xl">
              <Briefcase className="w-6 h-6 text-blue-600" />
              Create Job Assignment
            </DialogTitle>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto overflow-x-hidden">
          {/* Context Information Card */}
          <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200 shadow-sm mb-6">
            <CardHeader className="pb-4">
              <CardTitle className="text-xl text-blue-900 flex items-center gap-3">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <Calendar className="w-5 h-5 text-blue-600" />
                </div>
                Assignment Context
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col gap-4">
                <div className="flex items-center gap-3 p-4 bg-white/80 rounded-lg border border-blue-100 shadow-sm">
                  <div className="p-3 bg-blue-100 rounded-full">
                    <User className="w-5 h-5 text-blue-600" />
                  </div>
                  <div className="flex-1">
                    <p className="text-xs font-medium text-blue-600 uppercase tracking-wide mb-1">Worker</p>
                    <p className="text-blue-900 font-semibold text-lg">{workerName}</p>
                  </div>
                </div>
                
                <div className="flex items-center gap-3 p-4 bg-white/80 rounded-lg border border-blue-100 shadow-sm">
                  <div className="p-3 bg-blue-100 rounded-full">
                    <Calendar className="w-5 h-5 text-blue-600" />
                  </div>
                  <div className="flex-1">
                    <p className="text-xs font-medium text-blue-600 uppercase tracking-wide mb-1">Date</p>
                    <p className="text-blue-900 font-semibold text-lg">{format(selectedDate, 'EEEE, MMM d, yyyy')}</p>
                  </div>
                </div>
                
                <div className="flex items-center gap-3 p-4 bg-white/80 rounded-lg border border-blue-100 shadow-sm">
                  <div className="p-3 bg-blue-100 rounded-full">
                    <Clock className="w-5 h-5 text-blue-600" />
                  </div>
                  <div className="flex-1">
                    <p className="text-xs font-medium text-blue-600 uppercase tracking-wide mb-1">Available Time</p>
                    <p className="text-blue-900 font-semibold text-lg">{formatTimeSlot()}</p>
                  </div>
                </div>
              </div>
              
              <div className="mt-6 flex justify-center">
                <Badge className="bg-emerald-600 text-white border-emerald-600 px-4 py-2 text-sm font-medium">
                  <div className="w-2 h-2 bg-white rounded-full mr-2"></div>
                  Available Slot Selected
                </Badge>
              </div>
            </CardContent>
          </Card>

          {/* Assignment Form */}
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
              <span className="ml-3 text-lg">Loading assignment form...</span>
            </div>
          ) : error ? (
            <Card className="border-red-200 bg-red-50">
              <CardContent className="pt-6">
                <div className="text-center">
                  <p className="text-red-800 font-medium mb-2">Error Loading Form</p>
                  <p className="text-red-600 mb-4">{error}</p>
                  <Button onClick={loadData} variant="outline" size="sm">
                    Try Again
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : (
            <EmbeddedAssignmentForm
              clients={clients}
              jobTypes={jobTypes}
              prefilledData={{
                workerId,
                workerName,
                scheduledDate: selectedDate,
                scheduledTime: selectedTimeSlot.startTime,
                scheduledEndTime: selectedTimeSlot.endTime,
                suggestedDuration: calculateSuggestedDuration()
              }}
              onJobCreated={handleJobCreated}
              onCancel={onClose}
            />
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}