'use client'

import { useEffect, useState, useCallback } from 'react'
import { useSupabase } from '@/lib/SupabaseProvider'
import { useBusiness } from './use-business'
import type { Worker } from '@/lib/types'

export function useWorkers() {
  const { supabase } = useSupabase()
  const { business } = useBusiness()
  const [workers, setWorkers] = useState<Worker[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  const fetchWorkers = useCallback(async () => {
    if (!business?.id || !supabase) {
      setWorkers([])
      setLoading(false)
      return
    }

    try {
      setLoading(true)
      const { data, error: fetchError } = await supabase
        .from('workers')
        .select('*')
        .eq('business_id', business.id)
        .order('name', { ascending: true })
      
      if (fetchError) {
        throw fetchError
      }
      
      setWorkers(data || [])
    } catch (err) {
      console.error('Error fetching workers:', err)
      setError(err instanceof Error ? err : new Error('Failed to fetch workers'))
    } finally {
      setLoading(false)
    }
  }, [business, supabase])

  useEffect(() => {
    fetchWorkers()
  }, [fetchWorkers])

  const refresh = useCallback(() => {
    fetchWorkers()
  }, [fetchWorkers])

  const addWorker = async (worker: Omit<Worker, 'id' | 'created_at' | 'updated_at' | 'business_id' | 'status'>) => {
    if (!supabase || !business) return null
    
    try {
      setLoading(true)
      const { data, error: insertError } = await supabase
        .from('workers')
        .insert([{ ...worker, business_id: business.id, status: 'active' }])
        .select()
        .single()
      
      if (insertError) throw insertError
      
      setWorkers(prev => [...prev, data])
      return data
    } catch (err) {
      console.error('Error adding worker:', err)
      setError(err instanceof Error ? err : new Error('Failed to add worker'))
      return null
    } finally {
      setLoading(false)
    }
  }

  const updateWorker = async (id: string, updates: Partial<Worker>) => {
    if (!supabase) return null
    
    try {
      setLoading(true)
      const { data, error: updateError } = await supabase
        .from('workers')
        .update(updates)
        .eq('id', id)
        .select()
        .single()
      
      if (updateError) throw updateError
      
      setWorkers(prev => prev.map(w => w.id === id ? data : w))
      return data
    } catch (err) {
      console.error('Error updating worker:', err)
      setError(err instanceof Error ? err : new Error('Failed to update worker'))
      return null
    } finally {
      setLoading(false)
    }
  }

  const deleteWorker = async (id: string) => {
    if (!supabase) return false
    
    try {
      setLoading(true)
      const { error: deleteError } = await supabase
        .from('workers')
        .delete()
        .eq('id', id)
      
      if (deleteError) throw deleteError
      
      setWorkers(prev => prev.filter(w => w.id !== id))
      return true
    } catch (err) {
      console.error('Error deleting worker:', err)
      setError(err instanceof Error ? err : new Error('Failed to delete worker'))
      return false
    } finally {
      setLoading(false)
    }
  }

  return { 
    workers, 
    loading, 
    error,
    refresh,
    addWorker,
    updateWorker,
    deleteWorker
  }
} 
 
 