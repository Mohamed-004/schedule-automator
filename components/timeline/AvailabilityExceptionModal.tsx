'use client'

import React, { useState, useEffect } from 'react'
import { format } from 'date-fns'
import { X, Calendar, Clock, AlertTriangle, CheckCircle2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'

interface AvailabilityExceptionModalProps {
  workerId: string
  selectedDate: Date
  onClose: () => void
  onSave: () => void
}

interface AvailabilityException {
  id?: string
  worker_id: string
  date: string
  is_available: boolean
  start_time?: string | null
  end_time?: string | null
  reason?: string | null
}

export function AvailabilityExceptionModal({
  workerId,
  selectedDate,
  onClose,
  onSave
}: AvailabilityExceptionModalProps) {
  const [loading, setLoading] = useState(false)
  const [existingException, setExistingException] = useState<AvailabilityException | null>(null)
  const [formData, setFormData] = useState({
    is_available: true,
    start_time: '09:00',
    end_time: '17:00',
    reason: ''
  })

  const dateString = format(selectedDate, 'yyyy-MM-dd')
  const displayDate = format(selectedDate, 'EEEE, MMMM d, yyyy')

  // Load existing exception if any
  useEffect(() => {
    const loadExistingException = async () => {
      try {
        // This would be replaced with actual API call
        // const response = await fetch(`/api/workers/${workerId}/availability-exceptions?date=${dateString}`)
        // const data = await response.json()
        // setExistingException(data)
        
        // For now, we'll simulate no existing exception
        setExistingException(null)
      } catch (error) {
        console.error('Error loading existing exception:', error)
      }
    }

    loadExistingException()
  }, [workerId, dateString])

  // Update form data when existing exception is loaded
  useEffect(() => {
    if (existingException) {
      setFormData({
        is_available: existingException.is_available,
        start_time: existingException.start_time || '09:00',
        end_time: existingException.end_time || '17:00',
        reason: existingException.reason || ''
      })
    }
  }, [existingException])

  const handleSave = async () => {
    setLoading(true)
    try {
      const exceptionData = {
        worker_id: workerId,
        date: dateString,
        is_available: formData.is_available,
        start_time: formData.is_available ? formData.start_time : null,
        end_time: formData.is_available ? formData.end_time : null,
        reason: formData.reason || null
      }

      // This would be replaced with actual API call
      // if (existingException) {
      //   await fetch(`/api/workers/${workerId}/availability-exceptions/${existingException.id}`, {
      //     method: 'PUT',
      //     headers: { 'Content-Type': 'application/json' },
      //     body: JSON.stringify(exceptionData)
      //   })
      // } else {
      //   await fetch(`/api/workers/${workerId}/availability-exceptions`, {
      //     method: 'POST',
      //     headers: { 'Content-Type': 'application/json' },
      //     body: JSON.stringify(exceptionData)
      //   })
      // }

      console.log('Saving availability exception:', exceptionData)
      
      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      onSave()
    } catch (error) {
      console.error('Error saving availability exception:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async () => {
    if (!existingException) return
    
    setLoading(true)
    try {
      // This would be replaced with actual API call
      // await fetch(`/api/workers/${workerId}/availability-exceptions/${existingException.id}`, {
      //   method: 'DELETE'
      // })

      console.log('Deleting availability exception:', existingException.id)
      
      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      onSave()
    } catch (error) {
      console.error('Error deleting availability exception:', error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">
              {existingException ? 'Edit' : 'Set'} Availability Exception
            </h2>
            <p className="text-sm text-gray-600 mt-1">
              {displayDate}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Availability Toggle */}
          <div className="space-y-3">
            <Label className="text-base font-medium">Availability Status</Label>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => setFormData(prev => ({ ...prev, is_available: true }))}
                className={cn(
                  "p-3 rounded-lg border-2 transition-all duration-200 flex items-center gap-2",
                  formData.is_available
                    ? "border-green-500 bg-green-50 text-green-700"
                    : "border-gray-200 bg-gray-50 text-gray-600 hover:border-gray-300"
                )}
              >
                <CheckCircle2 className="w-5 h-5" />
                <span className="font-medium">Available</span>
              </button>
              <button
                onClick={() => setFormData(prev => ({ ...prev, is_available: false }))}
                className={cn(
                  "p-3 rounded-lg border-2 transition-all duration-200 flex items-center gap-2",
                  !formData.is_available
                    ? "border-red-500 bg-red-50 text-red-700"
                    : "border-gray-200 bg-gray-50 text-gray-600 hover:border-gray-300"
                )}
              >
                <AlertTriangle className="w-5 h-5" />
                <span className="font-medium">Unavailable</span>
              </button>
            </div>
          </div>

          {/* Time Range (only if available) */}
          {formData.is_available && (
            <div className="space-y-4">
              <Label className="text-base font-medium">Available Hours</Label>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="start_time" className="text-sm text-gray-600">Start Time</Label>
                  <Input
                    id="start_time"
                    type="time"
                    value={formData.start_time}
                    onChange={(e) => setFormData(prev => ({ ...prev, start_time: e.target.value }))}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="end_time" className="text-sm text-gray-600">End Time</Label>
                  <Input
                    id="end_time"
                    type="time"
                    value={formData.end_time}
                    onChange={(e) => setFormData(prev => ({ ...prev, end_time: e.target.value }))}
                    className="mt-1"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Reason */}
          <div className="space-y-2">
            <Label htmlFor="reason" className="text-base font-medium">
              Reason <span className="text-sm text-gray-500 font-normal">(optional)</span>
            </Label>
            <Textarea
              id="reason"
              placeholder={formData.is_available ? "e.g., Working from home, Different hours" : "e.g., Sick leave, Personal day, Vacation"}
              value={formData.reason}
              onChange={(e) => setFormData(prev => ({ ...prev, reason: e.target.value }))}
              rows={3}
            />
          </div>

          {/* Conflict Warning */}
          {!formData.is_available && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-medium text-amber-800">Potential Conflicts</h4>
                  <p className="text-sm text-amber-700 mt-1">
                    Setting this worker as unavailable may conflict with existing appointments. 
                    Please review and reschedule any conflicting jobs before saving.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-6 border-t bg-gray-50">
          <div>
            {existingException && (
              <Button
                variant="destructive"
                onClick={handleDelete}
                disabled={loading}
                size="sm"
              >
                Delete Exception
              </Button>
            )}
          </div>
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              onClick={onClose}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              disabled={loading}
            >
              {loading ? 'Saving...' : existingException ? 'Update' : 'Save'} Exception
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
} 