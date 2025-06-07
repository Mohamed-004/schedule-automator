'use client'

import { useState, useEffect } from 'react'
import { 
  WeeklyAvailability, 
  AvailabilityException, 
  AvailabilitySlot,
  AvailabilityExceptionInput
} from '@/lib/types'
import { supabase } from '@/lib/supabase-client'
import { useToast } from '@/components/ui/use-toast'

export function useWorkerAvailability(workerId: string) {
  const [weeklyAvailability, setWeeklyAvailability] = useState<AvailabilitySlot[]>([]);
  const [exceptions, setExceptions] = useState<AvailabilityExceptionInput[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const { toast } = useToast();

  // Load data
  useEffect(() => {
    if (!workerId) return;
    loadAvailability();
  }, [workerId]);

  const loadAvailability = async () => {
    setIsLoading(true);
    setError(null);

    try {
      // Fetch weekly availability
      const { data: weeklyData, error: weeklyError } = await supabase
        .from('worker_weekly_availability')
        .select('*')
        .eq('worker_id', workerId);

      if (weeklyError) throw weeklyError;

      // Fetch exceptions
      const { data: exceptionData, error: exceptionError } = await supabase
        .from('worker_availability_exceptions')
        .select('*')
        .eq('worker_id', workerId);

      if (exceptionError) throw exceptionError;

      // Transform data for UI
      setWeeklyAvailability(
        weeklyData.map((item: WeeklyAvailability) => ({
          id: item.id,
          day: item.day_of_week,
          start: item.start_time.substring(0, 5), // HH:MM
          end: item.end_time.substring(0, 5), // HH:MM
        }))
      );

      setExceptions(
        exceptionData.map((item: AvailabilityException) => ({
          id: item.id,
          date: item.date,
          isAvailable: item.is_available,
          allDay: !item.start_time || !item.end_time,
          startTime: item.start_time ? item.start_time.substring(0, 5) : undefined,
          endTime: item.end_time ? item.end_time.substring(0, 5) : undefined,
          reason: item.reason || undefined,
        }))
      );
    } catch (err) {
      console.error('Error loading availability:', err);
      setError(err instanceof Error ? err : new Error('Failed to load availability'));
      toast({
        title: 'Error',
        description: 'Failed to load availability data',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Save weekly availability
  const saveWeeklyAvailability = async (slots: AvailabilitySlot[]) => {
    setIsLoading(true);
    
    try {
      // First delete all existing slots
      const { error: deleteError } = await supabase
        .from('worker_weekly_availability')
        .delete()
        .eq('worker_id', workerId);
      
      if (deleteError) throw deleteError;
      
      // Insert new slots
      if (slots.length > 0) {
        const { error: insertError } = await supabase
          .from('worker_weekly_availability')
          .insert(
            slots.map(slot => ({
              worker_id: workerId,
              day_of_week: slot.day,
              start_time: slot.start,
              end_time: slot.end,
            }))
          );
          
        if (insertError) throw insertError;
      }
      
      // Update local state
      setWeeklyAvailability(slots);
      
      toast({
        title: 'Success',
        description: 'Weekly availability saved successfully',
      });
    } catch (err) {
      console.error('Error saving weekly availability:', err);
      setError(err instanceof Error ? err : new Error('Failed to save availability'));
      toast({
        title: 'Error',
        description: 'Failed to save weekly availability',
        variant: 'destructive',
      });
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  // Save an exception
  const saveException = async (exception: AvailabilityExceptionInput) => {
    setIsLoading(true);
    
    try {
      const exceptionData = {
        worker_id: workerId,
        date: exception.date,
        is_available: exception.isAvailable,
        start_time: exception.allDay ? null : exception.startTime,
        end_time: exception.allDay ? null : exception.endTime,
        reason: exception.reason,
      };
      
      let result;
      
      if (exception.id) {
        // Update existing exception
        const { data, error } = await supabase
          .from('worker_availability_exceptions')
          .update(exceptionData)
          .eq('id', exception.id)
          .select()
          .single();
          
        if (error) throw error;
        result = data;
      } else {
        // Insert new exception
        const { data, error } = await supabase
          .from('worker_availability_exceptions')
          .insert(exceptionData)
          .select()
          .single();
          
        if (error) throw error;
        result = data;
      }
      
      // Update local state
      setExceptions(prev => {
        const updated = [...prev];
        const index = updated.findIndex(e => e.id === exception.id);
        
        if (index >= 0) {
          updated[index] = {
            ...exception,
            id: result.id,
          };
        } else {
          updated.push({
            ...exception,
            id: result.id,
          });
        }
        
        return updated;
      });
      
      toast({
        title: 'Success',
        description: 'Exception saved successfully',
      });
      
      return result;
    } catch (err) {
      console.error('Error saving exception:', err);
      setError(err instanceof Error ? err : new Error('Failed to save exception'));
      toast({
        title: 'Error',
        description: 'Failed to save exception',
        variant: 'destructive',
      });
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  // Delete an exception
  const deleteException = async (exceptionId: string) => {
    setIsLoading(true);
    
    try {
      const { error } = await supabase
        .from('worker_availability_exceptions')
        .delete()
        .eq('id', exceptionId);
        
      if (error) throw error;
      
      // Update local state
      setExceptions(prev => prev.filter(e => e.id !== exceptionId));
      
      toast({
        title: 'Success',
        description: 'Exception deleted successfully',
      });
    } catch (err) {
      console.error('Error deleting exception:', err);
      setError(err instanceof Error ? err : new Error('Failed to delete exception'));
      toast({
        title: 'Error',
        description: 'Failed to delete exception',
        variant: 'destructive',
      });
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  return {
    weeklyAvailability,
    exceptions,
    isLoading,
    error,
    loadAvailability,
    saveWeeklyAvailability,
    saveException,
    deleteException,
  };
} 