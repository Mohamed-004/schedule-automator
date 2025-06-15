'use client'

import { useState, useEffect, useCallback } from 'react'
import { AvailabilitySlot, AvailabilityException } from '@/lib/types'
import { createClient } from '@/lib/supabase/client'
import { useToast } from '@/components/ui/use-toast'

interface UseWorkerAvailabilityReturn {
  weeklyAvailability: AvailabilitySlot[] | null
  exceptions: AvailabilityException[] | null
  isLoading: boolean
  saveWeeklyAvailability: (slots: AvailabilitySlot[]) => Promise<void>
  saveException: (exception: any) => Promise<void>
  deleteException: (id: string) => Promise<void>
}

export function useWorkerAvailability(workerId: string): UseWorkerAvailabilityReturn {
  const [weeklyAvailability, setWeeklyAvailability] = useState<AvailabilitySlot[] | null>(null)
  const [exceptions, setExceptions] = useState<AvailabilityException[] | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const { toast } = useToast()
  const supabase = createClient()

  // Fetch weekly availability
  const fetchWeeklyAvailability = useCallback(async () => {
    if (!workerId) return

    setIsLoading(true)
    try {
      const { data, error } = await supabase
        .from('worker_weekly_availability')
        .select('*')
        .eq('worker_id', workerId)
        .order('day_of_week', { ascending: true })

      if (error) {
        console.error('Error fetching weekly availability:', error)
        toast({
          title: 'Error',
          description: 'Failed to fetch weekly availability',
          variant: 'destructive'
        })
        return
      }

      // Transform database format to component format
      const slots: AvailabilitySlot[] = (data || []).map(item => ({
        id: item.id,
        day: item.day_of_week,
        start: item.start_time.substring(0, 5), // Convert HH:MM:SS to HH:MM
        end: item.end_time.substring(0, 5)
      }))

      setWeeklyAvailability(slots)
    } catch (error) {
      console.error('Error fetching weekly availability:', error)
      toast({
        title: 'Error',
        description: 'Failed to fetch weekly availability',
        variant: 'destructive'
      })
    } finally {
      setIsLoading(false)
    }
  }, [workerId, supabase, toast])

  // Fetch exceptions
  const fetchExceptions = useCallback(async () => {
    if (!workerId) return

    try {
      const { data, error } = await supabase
        .from('worker_availability_exceptions')
        .select('*')
        .eq('worker_id', workerId)
        .order('date', { ascending: true })

      if (error) {
        console.error('Error fetching exceptions:', error)
        return
      }

      setExceptions(data || [])
    } catch (error) {
      console.error('Error fetching exceptions:', error)
    }
  }, [workerId, supabase])

  // Save weekly availability
  const saveWeeklyAvailability = useCallback(async (slots: AvailabilitySlot[]) => {
    if (!workerId) return

    setIsLoading(true)
    try {
      // Delete existing availability for this worker
      const { error: deleteError } = await supabase
        .from('worker_weekly_availability')
        .delete()
        .eq('worker_id', workerId)

      if (deleteError) {
        throw deleteError
      }

      // Insert new availability slots
      if (slots.length > 0) {
        const dbSlots = slots.map(slot => ({
          worker_id: workerId,
          day_of_week: slot.day,
          start_time: `${slot.start}:00`, // Convert HH:MM to HH:MM:SS
          end_time: `${slot.end}:00`
        }))

        const { error: insertError } = await supabase
          .from('worker_weekly_availability')
          .insert(dbSlots)

        if (insertError) {
          throw insertError
        }
      }

      toast({
        title: 'Success',
        description: 'Weekly availability saved successfully',
        variant: 'default'
      })

      // Refresh data
      await fetchWeeklyAvailability()
    } catch (error) {
      console.error('Error saving weekly availability:', error)
      toast({
        title: 'Error',
        description: 'Failed to save weekly availability',
        variant: 'destructive'
      })
    } finally {
      setIsLoading(false)
    }
  }, [workerId, supabase, toast, fetchWeeklyAvailability])

  // Save exception
  const saveException = useCallback(async (exception: any) => {
    if (!workerId) return

    try {
      const dbException = {
        worker_id: workerId,
        date: exception.date,
        is_available: exception.isAvailable,
        start_time: exception.startTime ? `${exception.startTime}:00` : null,
        end_time: exception.endTime ? `${exception.endTime}:00` : null,
        reason: exception.reason || null
      }

      if (exception.id) {
        // Update existing
        const { error } = await supabase
          .from('worker_availability_exceptions')
          .update(dbException)
          .eq('id', exception.id)

        if (error) throw error
      } else {
        // Insert new
        const { error } = await supabase
          .from('worker_availability_exceptions')
          .insert(dbException)

        if (error) throw error
      }

      toast({
        title: 'Success',
        description: 'Exception saved successfully',
        variant: 'default'
      })

      // Refresh exceptions
      await fetchExceptions()
    } catch (error) {
      console.error('Error saving exception:', error)
      toast({
        title: 'Error',
        description: 'Failed to save exception',
        variant: 'destructive'
      })
    }
  }, [workerId, supabase, toast, fetchExceptions])

  // Delete exception
  const deleteException = useCallback(async (id: string) => {
    try {
      const { error } = await supabase
        .from('worker_availability_exceptions')
        .delete()
        .eq('id', id)

      if (error) throw error

      toast({
        title: 'Success',
        description: 'Exception deleted successfully',
        variant: 'default'
      })

      // Refresh exceptions
      await fetchExceptions()
    } catch (error) {
      console.error('Error deleting exception:', error)
      toast({
        title: 'Error',
        description: 'Failed to delete exception',
        variant: 'destructive'
      })
    }
  }, [supabase, toast, fetchExceptions])

  // Initial data fetch
  useEffect(() => {
    if (workerId) {
      fetchWeeklyAvailability()
      fetchExceptions()
    }
  }, [workerId, fetchWeeklyAvailability, fetchExceptions])

  return {
    weeklyAvailability,
    exceptions,
    isLoading,
    saveWeeklyAvailability,
    saveException,
    deleteException
  }
} 