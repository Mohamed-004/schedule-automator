'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { AvailabilitySlot } from '@/lib/types'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { useToast } from '@/components/ui/use-toast'
import { PlusCircle, Trash2, Edit, Save, X, Clock, Info, Loader2, AlertTriangle, Copy, AlertCircle } from 'lucide-react'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { cn } from '@/lib/utils'

// Enhanced slot type for local state management
type EditableSlot = AvailabilitySlot & { tempId: string }

// Props for the main component
interface WeeklyAvailabilityEditorProps {
  slots: AvailabilitySlot[]
  onSave: (slots: AvailabilitySlot[]) => Promise<void>
  isLoading?: boolean
}

// Constant for days of the week
const DAYS = [
  { value: 1, label: 'Monday' },
  { value: 2, label: 'Tuesday' },
  { value: 3, label: 'Wednesday' },
  { value: 4, label: 'Thursday' },
  { value: 5, label: 'Friday' },
  { value: 6, label: 'Saturday' },
  { value: 0, label: 'Sunday' },
]

// Helper function to check for time overlaps on the same day
const hasOverlap = (newSlot: AvailabilitySlot, existingSlots: AvailabilitySlot[]): boolean => {
  for (const existingSlot of existingSlots) {
    if (newSlot.day === existingSlot.day) {
      // A collision occurs if one slot's start time is before the other's end time,
      // AND its end time is after the other's start time.
      if (newSlot.start < existingSlot.end && newSlot.end > existingSlot.start) {
        return true
      }
    }
  }
  return false
}

// --- Sub-component for a single, editable time slot ---
interface TimeSlotRowProps {
  slot: EditableSlot
  onUpdate: (slot: EditableSlot) => boolean
  onRemove: (tempId: string) => void
  onCopy: (slot: EditableSlot) => void
  isSaving: boolean
  isNew: boolean
  isModified: boolean
  error?: string | null
}

function TimeSlotRow({ slot, onUpdate, onRemove, onCopy, isSaving, isNew, isModified, error }: TimeSlotRowProps) {
  const [isEditing, setIsEditing] = useState(slot.start === '') // auto-edit if new
  const [startTime, setStartTime] = useState(slot.start)
  const [endTime, setEndTime] = useState(slot.end)
  const { toast } = useToast()

  const handleSave = () => {
    if (startTime >= endTime) {
      toast({
        title: 'Invalid Time Range',
        description: 'Start time must be before end time.',
        variant: 'destructive',
      })
      return
    }
    const updatedSlot = { ...slot, start: startTime, end: endTime }
    if (onUpdate(updatedSlot)) {
      setIsEditing(false)
    }
  }

  const handleCancel = () => {
    // If the slot was a new, unsaved one, remove it on cancel
    if (slot.start === '') {
      onRemove(slot.tempId)
    } else {
      setStartTime(slot.start)
      setEndTime(slot.end)
      setIsEditing(false)
    }
  }

  if (isEditing) {
    return (
      <div className={cn(
        'flex items-center gap-2 p-2 rounded-lg transition-colors border',
        isNew ? 'bg-green-50 border-green-200' : 'bg-transparent',
        isModified && !isNew ? 'bg-yellow-50 border-yellow-200' : '',
        error ? 'bg-red-50 border-red-300' : 'border-transparent'
      )}>
        <div className="flex-grow grid grid-cols-[1fr_auto_1fr] items-center gap-2">
          <Input
            type="time"
            value={startTime}
            onChange={(e) => setStartTime(e.target.value)}
            className="w-[120px] bg-white"
            disabled={isSaving}
          />
          <span className="text-muted-foreground">to</span>
          <Input
            type="time"
            value={endTime}
            onChange={(e) => setEndTime(e.target.value)}
            className="w-[120px] bg-white"
            disabled={isSaving}
          />
        </div>
        <Button variant="ghost" size="icon" onClick={handleSave} disabled={isSaving} aria-label="Save slot">
          <Save className="h-4 w-4 text-green-600" />
        </Button>
        <Button variant="ghost" size="icon" onClick={handleCancel} disabled={isSaving} aria-label="Cancel">
          <X className="h-4 w-4 text-gray-600" />
        </Button>
      </div>
    )
  }

  return (
    <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
      <div className="flex items-center gap-2">
        <Clock className="h-4 w-4 text-gray-500" />
        <span className="font-mono text-sm tracking-wider">
          {slot.start} - {slot.end}
        </span>
      </div>
      <div className="flex items-center gap-1">
        <Button size="icon" variant="ghost" onClick={() => setIsEditing(true)} disabled={isSaving}>
          <Edit className="h-4 w-4 text-gray-600" />
        </Button>
        <Button size="icon" variant="ghost" onClick={() => onRemove(slot.tempId)} disabled={isSaving}>
          <Trash2 className="h-4 w-4 text-red-500" />
        </Button>
      </div>
    </div>
  )
}

// --- Main Editor Component ---
export default function WeeklyAvailabilityEditor({
  slots = [],
  onSave,
  isLoading = false,
}: WeeklyAvailabilityEditorProps) {
  const [editedSlots, setEditedSlots] = useState<EditableSlot[]>([])
  const [originalSlots, setOriginalSlots] = useState<EditableSlot[]>([])
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({})
  const isDirty = useMemo(() => JSON.stringify(originalSlots) !== JSON.stringify(editedSlots), [originalSlots, editedSlots])
  const { toast } = useToast()

  useEffect(() => {
    // Initialize state with unique IDs for editing
    const initialSlots = slots.map(s => ({ ...s, tempId: s.id || crypto.randomUUID() }))
    setEditedSlots(initialSlots.sort((a,b) => a.day - b.day || a.start.localeCompare(b.start)))
    setOriginalSlots(initialSlots.sort((a,b) => a.day - b.day || a.start.localeCompare(b.start)))
  }, [slots])

  const handleAddNewSlot = (day: number) => {
    const newSlot: EditableSlot = {
      day,
      start: '', // Empty start time triggers editing mode
      end: '',
      tempId: crypto.randomUUID(),
    }
    setEditedSlots(prev => [...prev, newSlot])
  }

  const handleRemoveSlot = (tempIdToRemove: string) => {
    setEditedSlots(prev => prev.filter(s => s.tempId !== tempIdToRemove))
  }

  const handleUpdateSlot = (updatedSlot: EditableSlot): boolean => {
    const otherSlots = editedSlots.filter(s => s.tempId !== updatedSlot.tempId)
    if (hasOverlap(updatedSlot, otherSlots)) {
      toast({
        title: 'Scheduling Conflict',
        description: 'This time slot overlaps with another slot on the same day.',
        variant: 'destructive',
      })
      return false
    }
    setEditedSlots(prev => 
        prev.map(s => (s.tempId === updatedSlot.tempId ? updatedSlot : s))
          .sort((a,b) => a.day - b.day || a.start.localeCompare(b.start))
      )
    toast({
        title: 'Slot Updated',
        description: 'Your draft schedule has been updated.',
        variant: 'success'
    })
    return true
  }

  const handleApplyTemplate = () => {
    const weekdaySlots: EditableSlot[] = DAYS.filter(d => d.value >= 1 && d.value <= 5)
                                            .map(d => ({
                                                day: d.value,
                                                start: '09:00',
                                                end: '17:00',
                                                tempId: crypto.randomUUID()
                                            }))
    setEditedSlots(weekdaySlots);
    toast({
      title: 'Template Applied',
      description: 'Cleared schedule and applied 9-5, Mon-Fri template.',
      variant: 'info'
    })
  }

  const handleSaveAll = async () => {
    // Final validation check for any new, un-edited slots
    if (editedSlots.some(s => s.start === '')) {
      toast({
        title: 'Incomplete Slots',
        description: 'Please finish editing all new time slots before saving.',
        variant: 'destructive',
      })
      return
    }

    try {
      // Strip temporary IDs before sending to backend
      const slotsToSave = editedSlots.map(({ tempId, ...rest }) => rest)
      await onSave(slotsToSave)
      // Success toast is handled by the parent hook
    } catch (error) {
      // Error toast is handled by the parent hook
      console.error('Save failed:', error)
    }
  }

  const handleCopySlot = (slotToCopy: EditableSlot) => {
    const newSlot: EditableSlot = {
        ...slotToCopy,
        id: undefined, // New slot, no persistent ID
        tempId: crypto.randomUUID(), // New unique temp ID
    };
    setEditedSlots(prev => [...prev, newSlot].sort((a, b) => (
        (DAYS.find(d => d.value === a.day)?.value ?? 0) - (DAYS.find(d => d.value === b.day)?.value ?? 0) || a.start.localeCompare(b.start)
    )));
  };

  const handleCopyDay = (sourceDay: number, targetDay: number) => {
    setEditedSlots(prev => {
      const sourceSlots = prev.filter(s => s.day === sourceDay);
      const otherSlots = prev.filter(s => s.day !== targetDay);
      const newTargetSlots = sourceSlots.map(s => ({
        ...s,
        id: undefined, // It's a new slot, so no persistent ID yet
        tempId: crypto.randomUUID(), // Ensure a new unique temp ID
        day: targetDay,
      }));
      return [...otherSlots, ...newTargetSlots].sort((a, b) => (
        (DAYS.find(d => d.value === a.day)?.value ?? 0) - (DAYS.find(d => d.value === b.day)?.value ?? 0) || a.start.localeCompare(b.start)
      ));
    });
  };

  const handleClearDay = (day: number) => {
    setEditedSlots(prev => prev.filter(s => s.day !== day))
  }

  const handleRevertChanges = () => {
      setEditedSlots([...originalSlots]);
      toast({
          title: "Changes Reverted",
          description: "Your changes have been discarded and the schedule has been restored to its last saved state.",
          variant: "info",
      });
  };

  // Re-validate whenever slots change
  useEffect(() => {
    const errors: Record<string, string> = {};
    const dayGroups = editedSlots.reduce<Record<number, EditableSlot[]>>((acc, slot) => {
        (acc[slot.day] = acc[slot.day] || []).push(slot);
        return acc;
    }, {});

    Object.values(dayGroups).forEach(group => {
        const sortedGroup = [...group].sort((a, b) => a.start.localeCompare(b.start));
        for (let i = 0; i < sortedGroup.length; i++) {
            const slot = sortedGroup[i];
            // Check for incomplete slots
            if (!slot.start || !slot.end) {
                errors[slot.tempId] = "Both start and end times are required.";
                continue;
            }
            // Check start is before end
            if (slot.start >= slot.end) {
                errors[slot.tempId] = "Start time must be before end time.";
                continue;
            }
            // Check for overlaps with the previous slot in the sorted list
            if (i > 0) {
                const prevSlot = sortedGroup[i - 1];
                if (slot.start < prevSlot.end) {
                    errors[slot.tempId] = `Overlaps with the ${prevSlot.start} - ${prevSlot.end} slot.`;
                    if (!errors[prevSlot.tempId]) { // Don't overwrite a more specific error
                       errors[prevSlot.tempId] = `Overlaps with the ${slot.start} - ${slot.end} slot.`;
                    }
                }
            }
        }
    });
    setValidationErrors(errors);
  }, [editedSlots]);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between gap-4">
          <div>
            <CardTitle>Weekly Recurring Availability</CardTitle>
            <CardDescription className="mt-1">
              Set the default hours your team member is available to work each week.
            </CardDescription>
          </div>
          <div className="flex items-center gap-4">
            {isDirty && (
                <div className="flex items-center gap-2 text-yellow-500">
                    <AlertTriangle size={16} />
                    <span className="text-sm font-medium">Unsaved Changes</span>
                </div>
            )}
            {isDirty && (
              <Button variant="outline" onClick={handleRevertChanges} disabled={isLoading}>
                Revert Changes
              </Button>
            )}
            <Button 
              onClick={handleSaveAll} 
              disabled={!isDirty || isLoading || Object.keys(validationErrors).length > 0}
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                'Save All Changes'
              )}
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
            {DAYS.map(day => {
              const daySlots = editedSlots.filter(slot => slot.day === day.value);
              return (
                <div key={day.value} className="p-4 border border-gray-200 rounded-xl bg-white">
                  <div className="flex justify-between items-center mb-3">
                    <h3 className="font-semibold text-lg text-gray-700">{day.label}</h3>
                    <Button variant="ghost" size="sm" onClick={() => handleAddNewSlot(day.value)} disabled={isLoading || isDirty}>
                      <PlusCircle className="h-4 w-4 mr-2" />
                      Add Slot
                    </Button>
                  </div>
                  {daySlots.length > 0 ? (
                    <div className="space-y-2">
                      {daySlots.map(slot => {
                        const originalSlot = originalSlots.find(os => os.tempId === slot.tempId);
                        const isNew = !originalSlot;
                        const isModified = !isNew && JSON.stringify(originalSlot) !== JSON.stringify(slot);

                        return (
                          <TimeSlotRow
                            key={slot.tempId}
                            slot={slot}
                            onUpdate={handleUpdateSlot}
                            onRemove={handleRemoveSlot}
                            onCopy={handleCopySlot}
                            isSaving={isLoading}
                            isNew={isNew}
                            isModified={isModified}
                            error={validationErrors[slot.tempId]}
                          />
                        )
                      })}
                    </div>
                  ) : (
                    <div className="text-center text-sm text-muted-foreground p-4 bg-gray-50/50 rounded-md">
                      No availability set for this day.
                    </div>
                  )}
                </div>
              )
            })}
        </div>
      </CardContent>
    </Card>
  )
} 