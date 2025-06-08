'use client'

import { useState, useEffect } from 'react'
import { 
  WeeklyAvailability, 
  AvailabilityException, 
  AvailabilitySlot,
  AvailabilityExceptionInput
} from '@/lib/types'
import { useSupabase } from '@/lib/SupabaseProvider'
import { useToast } from '@/components/ui/use-toast'

export function useWorkerAvailability(workerId: string) {
  const { supabase } = useSupabase()
  const [weeklyAvailability, setWeeklyAvailability] = useState<AvailabilitySlot[]>([]);
  const [exceptions, setExceptions] = useState<AvailabilityException[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<any | null>(null);
  const { toast } = useToast();

  // Load data
  useEffect(() => {
    if (!workerId || !supabase) return;
    loadAvailability();
  }, [workerId, supabase]);

  const loadAvailability = async () => {
    if (!supabase) {
      console.error('❌ Supabase client not available');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      console.log('🔄 Loading availability for worker:', workerId);

      // Fetch weekly availability
      const { data: weeklyData, error: weeklyError } = await supabase
        .from('worker_weekly_availability')
        .select('*')
        .eq('worker_id', workerId);

      console.log('📊 Weekly availability query result:', { weeklyData, weeklyError });

      if (weeklyError) throw weeklyError;

      // Fetch exceptions
      const { data: exceptionData, error: exceptionError } = await supabase
        .from('worker_availability_exceptions')
        .select('*')
        .eq('worker_id', workerId);

      console.log('📊 Exceptions query result:', { exceptionData, exceptionError });

      if (exceptionError) throw exceptionError;

      // Transform data for UI
      setWeeklyAvailability(
        (weeklyData || []).map((item: WeeklyAvailability) => ({
          id: item.id,
          day: item.day_of_week,
          start: item.start_time.substring(0, 5), // HH:MM
          end: item.end_time.substring(0, 5), // HH:MM
        }))
      );

      // Transform exceptions to match the expected format if necessary
      const loadedExceptions = (exceptionData || []).map((ex: any) => ({
        id: ex.id,
        worker_id: ex.worker_id,
        date: ex.date,
        is_available: ex.is_available,
        start_time: ex.start_time,
        end_time: ex.end_time,
        reason: ex.reason,
        created_at: ex.created_at,
        updated_at: ex.updated_at,
      }));
      setExceptions(loadedExceptions);

      console.log('✅ Availability loaded successfully');
    } catch (err) {
      console.error('❌ Error loading availability:', err);
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
    if (!supabase) {
      console.error('❌ Supabase client not available');
      toast({
        title: 'Error',
        description: 'Database connection not available',
        variant: 'destructive',
      });
      return;
    }

    if (!workerId) {
      toast({
        title: 'Error',
        description: 'Worker ID is required',
        variant: 'destructive',
      });
      return;
    }

    setIsLoading(true);
    setError(null);
    
    try {
      console.log('📊 Starting save operation...');
      console.log('Worker ID:', workerId);
      console.log('Slots to save:', slots);

      // Check current user
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      console.log('🔐 Current user:', user?.email, 'Error:', userError);

      if (userError || !user) {
        throw new Error('Authentication required. Please sign in to save availability.');
      }

      // Validate slots
      for (const slot of slots) {
        if (!slot.start || !slot.end || slot.start >= slot.end) {
          throw new Error(`Invalid time range for ${['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][slot.day]}: ${slot.start} to ${slot.end}`);
        }
      }

      console.log('✅ Slot validation passed');

      // First delete all existing slots
      console.log('🗑️ Deleting existing slots...');
      const { error: deleteError } = await supabase
        .from('worker_weekly_availability')
        .delete()
        .eq('worker_id', workerId);
      
      if (deleteError) {
        console.error('❌ Delete operation failed:', deleteError);
        throw deleteError;
      }
      
      let savedSlots: AvailabilitySlot[] = [];
      // Insert new slots and get the saved data back
      if (slots.length > 0) {
        console.log('📝 Inserting new slots...');
        const newSlots = slots.map(slot => ({
          worker_id: workerId,
          day_of_week: slot.day,
          start_time: slot.start,
          end_time: slot.end,
        }));
        
        const { data: insertData, error: insertError } = await supabase
          .from('worker_weekly_availability')
          .insert(newSlots)
          .select();
        
        if (insertError) {
          console.error('❌ Insert operation failed:', insertError);
          throw insertError;
        }
        
        // Transform the returned data to update the local state
        savedSlots = (insertData || []).map((item: WeeklyAvailability) => ({
            id: item.id,
            day: item.day_of_week,
            start: item.start_time.substring(0, 5),
            end: item.end_time.substring(0, 5),
        }));
      }
      
      // Update local state directly instead of reloading
      setWeeklyAvailability(savedSlots);
      
      toast({
        title: 'Success! 🎉',
        description: `Weekly availability saved successfully. ${slots.length} time slots configured.`,
        variant: 'success',
      });

    } catch (err) {
      console.error('❌ Error saving weekly availability:', err);
      console.error('Error type:', typeof err);
      console.error('Error details:', JSON.stringify(err, null, 2));
      console.error('Worker ID:', workerId);
      console.error('Slots being saved:', slots);
      
      let errorMessage = 'Failed to save weekly availability';
      
      // Handle Supabase-specific errors
      if (err && typeof err === 'object') {
        if ('message' in err) {
          errorMessage = err.message as string;
        } else if ('error' in err) {
          errorMessage = (err as any).error;
        } else if ('code' in err) {
          errorMessage = `Database error (${(err as any).code}): ${(err as any).message || 'Unknown error'}`;
        } else {
          errorMessage = `Database operation failed: ${JSON.stringify(err)}`;
        }
      } else if (err instanceof Error) {
        errorMessage = err.message;
      }
      
      const error = new Error(errorMessage);
      setError(error);
      
      toast({
        title: 'Failed to Save ❌',
        description: errorMessage,
        variant: 'destructive',
      });
      
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  // Save an exception
  const saveException = async (exception: AvailabilityExceptionInput) => {
    if (!supabase) {
      console.error('❌ Supabase client not available');
      toast({
        title: 'Error',
        description: 'Database connection not available',
        variant: 'destructive',
      });
      return;
    }

    if (!workerId) {
      toast({
        title: 'Error',
        description: 'Worker ID is required',
        variant: 'destructive',
      });
      return;
    }

    // Validate the exception data
    if (!exception.date) {
      toast({
        title: 'Error',
        description: 'Date is required for the exception',
        variant: 'destructive',
      });
      return;
    }

    if (!exception.allDay && (!exception.startTime || !exception.endTime)) {
      toast({
        title: 'Error',
        description: 'Start and end times are required for timed exceptions',
        variant: 'destructive',
      });
      return;
    }

    if (!exception.allDay && exception.startTime && exception.endTime && exception.startTime >= exception.endTime) {
      toast({
        title: 'Error',
        description: 'End time must be after start time',
        variant: 'destructive',
      });
      return;
    }

    setIsLoading(true);
    setError(null);
    
    try {
      const exceptionData = {
        worker_id: workerId,
        date: exception.date,
        is_available: exception.isAvailable,
        start_time: exception.allDay ? null : exception.startTime,
        end_time: exception.allDay ? null : exception.endTime,
        reason: exception.reason,
      };
      
      const { data: savedException, error } = await (exception.id
        ? supabase
          .from('worker_availability_exceptions')
          .update(exceptionData)
          .eq('id', exception.id)
          .select()
          .single()
        : supabase
          .from('worker_availability_exceptions')
          .insert(exceptionData)
          .select()
          .single());
          
      if (error) throw error;
      
      // Update local state directly
      const newOrUpdatedException: AvailabilityException = {
        id: savedException.id,
        date: savedException.date,
        is_available: savedException.is_available,
        start_time: savedException.start_time,
        end_time: savedException.end_time,
        reason: savedException.reason,
        worker_id: savedException.worker_id,
        created_at: savedException.created_at,
        updated_at: savedException.updated_at,
      };

      if (exception.id) {
        setExceptions(prev => prev.map(e => e.id === exception.id ? newOrUpdatedException : e));
      } else {
        setExceptions(prev => [...prev, newOrUpdatedException]);
      }
      
      const formattedDate = new Date(savedException.date).toLocaleDateString();
      const actionType = exception.id ? 'updated' : 'created';
      const exceptionType = savedException.is_available ? 'special availability' : 'time off';
      
      toast({
        title: `Success! 🎉`,
        description: `${exceptionType.charAt(0).toUpperCase() + exceptionType.slice(1)} ${actionType} for ${formattedDate}`,
        variant: 'success',
      });

      // No longer reloading all data from the server
      return savedException;
    } catch (err) {
      console.error('Error saving exception:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to save exception';
      setError(err instanceof Error ? err : new Error(errorMessage));
      toast({
        title: 'Failed to Save ❌',
        description: errorMessage,
        variant: 'destructive',
      });
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  // Delete an exception
  const deleteException = async (exceptionId: string) => {
    if (!supabase) {
      console.error('❌ Supabase client not available');
      toast({
        title: 'Error',
        description: 'Database connection not available',
        variant: 'destructive',
      });
      return;
    }

    if (!exceptionId) {
      toast({
        title: 'Error',
        description: 'Exception ID is required',
        variant: 'destructive',
      });
      return;
    }

    setIsLoading(true);
    setError(null);
    
    try {
      // Find the exception being deleted for better user feedback
      const exceptionToDelete = exceptions.find(e => e.id === exceptionId);
      
      const { error } = await supabase
        .from('worker_availability_exceptions')
        .delete()
        .eq('id', exceptionId);
        
      if (error) throw error;
      
      // Update local state directly
      setExceptions(prev => prev.filter(e => e.id !== exceptionId));
      
      const formattedDate = exceptionToDelete ? new Date(exceptionToDelete.date).toLocaleDateString() : 'selected date';
      
      toast({
        title: 'Deleted! 🗑️',
        description: `Exception for ${formattedDate} has been removed from your schedule`,
        variant: 'success',
      });

    } catch (err) {
      console.error('Error deleting exception:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete exception';
      setError(err instanceof Error ? err : new Error(errorMessage));
      toast({
        title: 'Failed to Delete ❌',
        description: errorMessage,
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