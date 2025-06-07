'use client'

import { useState, useEffect } from 'react'
import { AvailabilitySlot } from '@/lib/types'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { useToast } from '@/components/ui/use-toast'
import { Info, AlertCircle } from 'lucide-react'

interface WeeklyAvailabilityEditorProps {
  slots: AvailabilitySlot[]
  onSave: (slots: AvailabilitySlot[]) => void
  isLoading?: boolean
}

const DAYS = [
  { value: 0, label: 'Sunday' },
  { value: 1, label: 'Monday' },
  { value: 2, label: 'Tuesday' },
  { value: 3, label: 'Wednesday' },
  { value: 4, label: 'Thursday' },
  { value: 5, label: 'Friday' },
  { value: 6, label: 'Saturday' },
]

export default function WeeklyAvailabilityEditor({
  slots = [],
  onSave,
  isLoading = false,
}: WeeklyAvailabilityEditorProps) {
  const [editedSlots, setEditedSlots] = useState<AvailabilitySlot[]>(slots)
  const [newDay, setNewDay] = useState<number>(1)
  const [newStart, setNewStart] = useState<string>('09:00')
  const [newEnd, setNewEnd] = useState<string>('17:00')
  const [showNoSlotsWarning, setShowNoSlotsWarning] = useState<boolean>(false)
  const { toast } = useToast()
  
  // Update editedSlots when props.slots changes
  useEffect(() => {
    setEditedSlots(slots)
  }, [slots])
  
  // Group slots by day for better UI organization
  const slotsByDay = DAYS.map(day => {
    return {
      ...day,
      slots: editedSlots.filter(slot => slot.day === day.value),
    }
  })
  
  const handleAddSlot = () => {
    // Validate the time range
    if (newStart >= newEnd) {
      toast({
        title: 'Invalid Time Range',
        description: 'End time must be after start time',
        variant: 'destructive'
      })
      return
    }
    
    // Check for overlapping slots
    const overlapping = editedSlots.some(
      slot => slot.day === newDay && 
      ((newStart >= slot.start && newStart < slot.end) || 
       (newEnd > slot.start && newEnd <= slot.end) ||
       (newStart <= slot.start && newEnd >= slot.end))
    )
    
    if (overlapping) {
      toast({
        title: 'Scheduling Conflict',
        description: 'This time slot overlaps with an existing slot',
        variant: 'destructive'
      })
      return
    }
    
    // Add the new slot
    setEditedSlots([
      ...editedSlots,
      { day: newDay, start: newStart, end: newEnd }
    ])
    
    toast({
      title: 'Availability Added',
      description: `Added ${DAYS.find(d => d.value === newDay)?.label} ${newStart} - ${newEnd}`,
      variant: 'success'
    })

    // Hide the no slots warning if it was showing
    setShowNoSlotsWarning(false)
  }
  
  const handleRemoveSlot = (index: number) => {
    const removedSlot = editedSlots[index]
    setEditedSlots(editedSlots.filter((_, i) => i !== index))
    
    toast({
      title: 'Availability Removed',
      description: `Removed ${DAYS.find(d => d.value === removedSlot.day)?.label} ${removedSlot.start} - ${removedSlot.end}`,
      variant: 'info'
    })
  }
  
  const handleSave = () => {
    // Check if there are any slots to save
    if (editedSlots.length === 0) {
      setShowNoSlotsWarning(true)
      toast({
        title: 'No Availability Set',
        description: 'You have not set any availability slots. Please add at least one slot or save an empty schedule.',
        variant: 'warning',
        action: (
          <Button 
            onClick={() => {
              onSave(editedSlots)
              setShowNoSlotsWarning(false)
              toast({
                title: 'Empty Schedule Saved',
                description: 'Your availability has been set to have no time slots.',
                variant: 'success'
              })
            }}
            variant="outline"
            className="bg-white hover:bg-gray-100 text-gray-800"
          >
            Save Empty
          </Button>
        ),
      })
      return
    }
    
    // Check if there are no weekday slots (Mon-Fri)
    const hasWeekdaySlots = editedSlots.some(slot => slot.day >= 1 && slot.day <= 5)
    if (!hasWeekdaySlots) {
      toast({
        title: 'No Weekday Availability',
        description: 'You have not set any availability for weekdays (Mon-Fri). Is this intentional?',
        variant: 'warning',
        action: (
          <Button 
            onClick={() => {
              onSave(editedSlots)
              toast({
                title: 'Schedule Saved',
                description: 'Your availability schedule has been saved without weekday slots.',
                variant: 'success'
              })
            }}
            variant="outline"
            className="bg-white hover:bg-gray-100 text-gray-800"
          >
            Save Anyway
          </Button>
        ),
      })
      return
    }
    
    // All checks passed, save the schedule
    onSave(editedSlots)
    
    toast({
      title: 'Schedule Saved',
      description: 'Your weekly availability has been saved successfully',
      variant: 'success'
    })
  }
  
  const handleTemplateWeekday = () => {
    // Set standard 9-5 weekday schedule
    const weekdaySlots: AvailabilitySlot[] = [
      { day: 1, start: '09:00', end: '17:00' }, // Monday
      { day: 2, start: '09:00', end: '17:00' }, // Tuesday
      { day: 3, start: '09:00', end: '17:00' }, // Wednesday
      { day: 4, start: '09:00', end: '17:00' }, // Thursday
      { day: 5, start: '09:00', end: '17:00' }, // Friday
    ]
    setEditedSlots(weekdaySlots)
    
    // Hide the no slots warning if it was showing
    setShowNoSlotsWarning(false)
    
    toast({
      title: 'Template Applied',
      description: 'Standard weekday schedule (9-5) has been applied',
      variant: 'info'
    })
  }
  
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-xl">Weekly Availability</CardTitle>
      </CardHeader>
      <CardContent>
        {showNoSlotsWarning && (
          <div className="mb-6 p-4 border border-yellow-300 bg-yellow-50 rounded-md flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-yellow-500 mt-0.5" />
            <div>
              <h4 className="font-medium text-yellow-700">No Availability Slots</h4>
              <p className="text-sm text-yellow-600">
                You haven't added any availability slots yet. Please add at least one time slot below.
              </p>
            </div>
          </div>
        )}
        
        <div className="mb-6">
          <div className="flex flex-col gap-4">
            {slotsByDay.map((day) => (
              <div key={day.value} className="border-b pb-3">
                <h3 className="font-medium mb-2">{day.label}</h3>
                {day.slots.length === 0 ? (
                  <p className="text-muted-foreground text-sm">No availability set</p>
                ) : (
                  <div className="space-y-2">
                    {day.slots.map((slot, index) => (
                      <div key={index} className="flex items-center gap-2">
                        <span className="text-sm">
                          {slot.start} - {slot.end}
                        </span>
                        <Button 
                          variant="outline" 
                          size="sm" 
                          onClick={() => handleRemoveSlot(editedSlots.indexOf(slot))}
                        >
                          Remove
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
        
        <div className="border-t pt-4">
          <h3 className="font-medium mb-3">Add Time Slot</h3>
          <div className="flex flex-wrap gap-3 mb-4">
            <Select
              value={newDay.toString()}
              onValueChange={(value) => setNewDay(parseInt(value))}
            >
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Select day" />
              </SelectTrigger>
              <SelectContent>
                {DAYS.map((day) => (
                  <SelectItem key={day.value} value={day.value.toString()}>
                    {day.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            <div className="flex items-center gap-2">
              <Input
                type="time"
                value={newStart}
                onChange={(e) => setNewStart(e.target.value)}
                className="w-[120px]"
              />
              <span>to</span>
              <Input
                type="time"
                value={newEnd}
                onChange={(e) => setNewEnd(e.target.value)}
                className="w-[120px]"
              />
            </div>
            
            <Button onClick={handleAddSlot}>Add Slot</Button>
          </div>
          
          <div className="flex flex-wrap gap-3 mt-6">
            <Button variant="outline" onClick={handleTemplateWeekday}>
              <Info className="h-4 w-4 mr-2" />
              Apply 9-5 Weekday Template
            </Button>
          </div>
        </div>
        
        <div className="border-t pt-6 mt-6">
          <div className="flex justify-end">
            <Button 
              onClick={handleSave} 
              disabled={isLoading}
              className="px-6"
            >
              {isLoading ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
} 