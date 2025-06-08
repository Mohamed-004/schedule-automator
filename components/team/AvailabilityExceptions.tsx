'use client'

import { useState, useEffect } from 'react'
import { format } from 'date-fns'
import { Calendar } from '@/components/ui/calendar'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Switch } from '@/components/ui/switch'
import { AvailabilityException, AvailabilityExceptionInput } from '@/lib/types'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/components/ui/use-toast'
import { CalendarX, Clock, PlusCircle, Trash2, Edit } from 'lucide-react'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import '@/components/ui/calendar.css'
import { AvailabilityExceptionForm } from './AvailabilityExceptionForm'

// Client-only component to prevent hydration mismatch on date formatting
const FormattedDate = ({ date }: { date: string }) => {
  const [isClient, setIsClient] = useState(false)
  useEffect(() => {
    setIsClient(true)
  }, [])

  return isClient ? new Date(date).toLocaleDateString('en-US', { 
    weekday: 'long', 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric', 
    timeZone: 'UTC' 
  }) : null
}

const formatTime = (timeStr: string | null | undefined): string => {
  if (!timeStr) return '';
  const [hours, minutes] = timeStr.split(':');
  const date = new Date();
  date.setHours(parseInt(hours, 10));
  date.setMinutes(parseInt(minutes, 10));
  return date.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  }).replace(/^0/, ''); // Remove leading zero from hour
};

interface AvailabilityExceptionsProps {
  exceptions: AvailabilityException[]
  onSave: (exception: AvailabilityExceptionInput) => Promise<any>
  onDelete: (exceptionId: string) => Promise<void>
  isLoading: boolean
}

export function AvailabilityExceptions({ exceptions, onSave, onDelete, isLoading }: AvailabilityExceptionsProps) {
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [formInitialData, setFormInitialData] = useState<AvailabilityExceptionInput | null>(null)
  const [exceptionToDelete, setExceptionToDelete] = useState<AvailabilityException | null>(null)

  const handleSave = async (exceptionData: AvailabilityExceptionInput) => {
    await onSave(exceptionData)
    setIsFormOpen(false)
    setFormInitialData(null)
  }

  const handleEdit = (exception: AvailabilityException) => {
    const formData: AvailabilityExceptionInput = {
      id: exception.id,
      date: exception.date,
      isAvailable: exception.is_available,
      allDay: exception.start_time === null,
      startTime: exception.start_time || undefined,
      endTime: exception.end_time || undefined,
      reason: exception.reason || undefined,
    }
    setFormInitialData(formData)
    setIsFormOpen(true)
  }

  const handleDeleteRequest = (exception: AvailabilityException) => {
    setExceptionToDelete(exception)
  }

  const confirmDelete = async () => {
    if (exceptionToDelete) {
      await onDelete(exceptionToDelete.id)
      setExceptionToDelete(null)
    }
  }

  const cancelDelete = () => {
    setExceptionToDelete(null)
  }

  const handleAddNew = () => {
    setFormInitialData(null)
    setIsFormOpen(true)
  }

  const handleCancel = () => {
    setIsFormOpen(false)
    setFormInitialData(null)
  }

  const sortedExceptions = [...exceptions].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
  const exceptionDates = exceptions.map(e => new Date(e.date));

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle>Time Off & Special Hours</CardTitle>
            {!isFormOpen && (
              <Button onClick={handleAddNew} size="sm">
                <PlusCircle className="mr-2 h-4 w-4" /> Add New
              </Button>
            )}
          </div>
          <CardDescription>
            Add specific dates for time off or different working hours that override the weekly schedule.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isFormOpen && (
            <div className="p-4 border rounded-lg bg-gray-50/50 mb-6 transition-all duration-300 ease-in-out">
              <h3 className="text-lg font-semibold mb-4 text-gray-800">
                {formInitialData ? 'Edit Exception' : 'Add New Exception'}
              </h3>
              <AvailabilityExceptionForm
                initialData={formInitialData}
                onSave={handleSave}
                onCancel={handleCancel}
                isLoading={isLoading}
                existingExceptionDates={exceptionDates}
              />
            </div>
          )}
          <div className="space-y-4">
            {sortedExceptions.length > 0 ? (
              sortedExceptions.map(exception => {
                const allDay = !exception.start_time;
                return (
                  <div key={exception.id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50 transition-colors">
                    <div>
                      <p className="font-semibold">
                        <FormattedDate date={exception.date} />
                      </p>
                      <p className={`text-sm font-medium ${exception.is_available ? 'text-green-600' : 'text-red-600'}`}>
                        {exception.is_available
                          ? (allDay ? 'Available: All Day' : `Available: ${formatTime(exception.start_time)} - ${formatTime(exception.end_time)}`)
                          : (allDay ? 'Unavailable: All Day' : `Unavailable: ${formatTime(exception.start_time)} - ${formatTime(exception.end_time)}`)
                        }
                      </p>
                      {exception.reason && <p className="text-sm text-muted-foreground mt-1">Reason: {exception.reason}</p>}
                    </div>
                    <div className="flex items-center gap-2">
                      <Button variant="ghost" size="icon" onClick={() => handleEdit(exception)} disabled={isLoading}>
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => handleDeleteRequest(exception)} disabled={isLoading}>
                        <Trash2 className="h-4 w-4 text-red-500" />
                      </Button>
                    </div>
                  </div>
                )
              })
            ) : (
              !isFormOpen && <p className="text-muted-foreground text-center py-4">No exceptions scheduled.</p>
            )}
          </div>
        </CardContent>
      </Card>
      
      <Dialog open={!!exceptionToDelete} onOpenChange={(isOpen) => !isOpen && cancelDelete()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Are you absolutely sure?</DialogTitle>
            <DialogDescription>
              This action cannot be undone. This will permanently delete the exception for{' '}
              <span className="font-semibold"><FormattedDate date={exceptionToDelete?.date || ''} /></span>.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:justify-end">
            <Button variant="outline" onClick={cancelDelete}>Cancel</Button>
            <Button variant="destructive" onClick={confirmDelete} disabled={isLoading}>
              {isLoading ? 'Deleting...' : 'Delete Exception'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
} 