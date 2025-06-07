'use client'

import { useState } from 'react'
import { format } from 'date-fns'
import { Calendar } from '@/components/ui/calendar'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Switch } from '@/components/ui/switch'
import { AvailabilityExceptionInput } from '@/lib/types'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/components/ui/use-toast'
import { CalendarX, Clock } from 'lucide-react'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'

interface AvailabilityExceptionsProps {
  exceptions: AvailabilityExceptionInput[]
  onSave: (exception: AvailabilityExceptionInput) => Promise<any>
  onDelete: (id: string) => Promise<void>
  isLoading?: boolean
}

export default function AvailabilityExceptions({
  exceptions = [],
  onSave,
  onDelete,
  isLoading = false,
}: AvailabilityExceptionsProps) {
  const [showDialog, setShowDialog] = useState(false)
  const [date, setDate] = useState<Date | undefined>(new Date())
  const [isAvailable, setIsAvailable] = useState(false)
  const [allDay, setAllDay] = useState(true)
  const [startTime, setStartTime] = useState('09:00')
  const [endTime, setEndTime] = useState('17:00')
  const [reason, setReason] = useState('')
  const [editingId, setEditingId] = useState<string | undefined>(undefined)
  const { toast } = useToast()
  
  const resetForm = () => {
    setDate(new Date())
    setIsAvailable(false)
    setAllDay(true)
    setStartTime('09:00')
    setEndTime('17:00')
    setReason('')
    setEditingId(undefined)
  }
  
  const handleEdit = (exception: AvailabilityExceptionInput) => {
    setDate(new Date(exception.date))
    setIsAvailable(exception.isAvailable)
    setAllDay(exception.allDay)
    setStartTime(exception.startTime || '09:00')
    setEndTime(exception.endTime || '17:00')
    setReason(exception.reason || '')
    setEditingId(exception.id)
    setShowDialog(true)
  }
  
  const handleDelete = async (id: string) => {
    try {
      await onDelete(id)
      toast({
        title: 'Exception Removed',
        description: 'The time off/exception has been removed from your schedule',
        variant: 'success'
      })
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to delete the exception',
        variant: 'destructive'
      })
    }
  }
  
  const handleSave = async () => {
    if (!date) {
      toast({
        title: 'Missing Date',
        description: 'Please select a date for this exception',
        variant: 'destructive'
      })
      return
    }
    
    if (!allDay && startTime >= endTime) {
      toast({
        title: 'Invalid Time Range',
        description: 'End time must be after start time',
        variant: 'destructive'
      })
      return
    }
    
    try {
      const exceptionData: AvailabilityExceptionInput = {
        id: editingId,
        date: format(date, 'yyyy-MM-dd'),
        isAvailable,
        allDay,
        startTime: allDay ? undefined : startTime,
        endTime: allDay ? undefined : endTime,
        reason: reason.trim() || undefined
      }
      
      await onSave(exceptionData)
      
      toast({
        title: 'Exception Saved',
        description: `${isAvailable ? 'Special availability' : 'Time off'} for ${format(date, 'MMM dd, yyyy')} saved`,
        variant: 'success'
      })
      
      setShowDialog(false)
      resetForm()
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to save the exception',
        variant: 'destructive'
      })
    }
  }
  
  const formatExceptionDate = (dateStr: string) => {
    const date = new Date(dateStr)
    return format(date, 'MMM dd, yyyy')
  }
  
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-xl flex justify-between items-center">
          <span>Time Off & Exceptions</span>
          <Dialog open={showDialog} onOpenChange={setShowDialog} modal={false}>
            <DialogTrigger asChild>
              <Button onClick={resetForm}>Add Exception</Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]">
              <DialogHeader>
                <DialogTitle>
                  {editingId ? 'Edit Exception' : 'Add New Exception'}
                </DialogTitle>
              </DialogHeader>
              
              <div className="space-y-4 py-4">
                <div className="flex flex-col space-y-3">
                  <Label htmlFor="exception-type" className="font-medium">Exception Type</Label>
                  <RadioGroup 
                    value={isAvailable ? 'available' : 'unavailable'} 
                    onValueChange={(value) => setIsAvailable(value === 'available')}
                    className="flex gap-4"
                  >
                    <div className="flex items-center space-x-2 border rounded-md p-3 hover:bg-slate-50 cursor-pointer flex-1">
                      <RadioGroupItem value="unavailable" id="unavailable" className="border-slate-400" />
                      <Label htmlFor="unavailable" className="font-normal cursor-pointer">Time Off (Unavailable)</Label>
                    </div>
                    <div className="flex items-center space-x-2 border rounded-md p-3 hover:bg-slate-50 cursor-pointer flex-1">
                      <RadioGroupItem value="available" id="available" className="border-slate-400" />
                      <Label htmlFor="available" className="font-normal cursor-pointer">Special Availability</Label>
                    </div>
                  </RadioGroup>
                </div>
                
                <div className="space-y-2">
                  <Label className="font-medium">Date</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={`w-full justify-start text-left font-normal ${date ? "" : "text-muted-foreground"}`}
                      >
                        {date ? format(date, 'PPP') : <span>Pick a date</span>}
                        <CalendarX className="ml-auto h-4 w-4 opacity-50" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={date}
                        onSelect={setDate}
                        initialFocus
                        className="border rounded-md"
                      />
                    </PopoverContent>
                  </Popover>
                </div>
                
                <div className="flex items-center space-x-2 p-2 border rounded-md">
                  <Switch 
                    checked={allDay} 
                    onCheckedChange={setAllDay}
                    id="all-day"
                  />
                  <Label htmlFor="all-day" className="font-normal cursor-pointer">All Day</Label>
                </div>
                
                {!allDay && (
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="start-time" className="font-medium">Start Time</Label>
                      <Input
                        id="start-time"
                        type="time"
                        value={startTime}
                        onChange={(e) => setStartTime(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="end-time" className="font-medium">End Time</Label>
                      <Input
                        id="end-time"
                        type="time"
                        value={endTime}
                        onChange={(e) => setEndTime(e.target.value)}
                      />
                    </div>
                  </div>
                )}
                
                <div className="space-y-2">
                  <Label htmlFor="reason" className="font-medium">Reason (Optional)</Label>
                  <Textarea
                    id="reason"
                    placeholder="Vacation, appointment, etc."
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                  />
                </div>
              </div>
              
              <DialogFooter>
                <Button variant="outline" onClick={() => setShowDialog(false)}>
                  Cancel
                </Button>
                <Button onClick={handleSave} disabled={isLoading}>
                  {isLoading ? 'Saving...' : 'Save Exception'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {exceptions.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground flex flex-col items-center">
            <CalendarX className="h-12 w-12 mb-3 opacity-30" />
            <p>No exceptions or time off scheduled.</p>
            <p className="text-sm mt-1">Click "Add Exception" to set special availability or time off.</p>
          </div>
        ) : (
          <div className="divide-y">
            {exceptions.map((exception) => (
              <div key={exception.id} className="py-3 first:pt-0 flex justify-between items-start">
                <div>
                  <div className="flex items-center gap-2">
                    <Badge variant={exception.isAvailable ? 'outline' : 'destructive'}>
                      {exception.isAvailable ? 'Special Hours' : 'Time Off'}
                    </Badge>
                    <span className="font-medium">{formatExceptionDate(exception.date)}</span>
                  </div>
                  
                  <div className="mt-1">
                    {exception.allDay ? (
                      <span className="text-sm text-muted-foreground">All day</span>
                    ) : (
                      <div className="flex items-center gap-1 text-sm text-muted-foreground">
                        <Clock className="h-3 w-3" />
                        <span>{exception.startTime} - {exception.endTime}</span>
                      </div>
                    )}
                  </div>
                  
                  {exception.reason && (
                    <p className="text-sm mt-1 text-muted-foreground">{exception.reason}</p>
                  )}
                </div>
                
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleEdit(exception)}
                  >
                    Edit
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDelete(exception.id!)}
                    disabled={isLoading}
                  >
                    Remove
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
} 