'use client'

import { useEffect, useState, useCallback } from 'react'
import { useSupabase } from '@/lib/SupabaseProvider'
import { useBusiness } from './use-business'
import type { Job } from '@/lib/types'

export function useJobs() {
  const { supabase } = useSupabase()
  const { business } = useBusiness()
  const [jobs, setJobs] = useState<Job[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  const fetchJobs = useCallback(async () => {
    if (!business?.id || !supabase) {
      setJobs([])
      setLoading(false)
      return
    }

    try {
      setLoading(true)
      const { data, error: fetchError } = await supabase
        .from('jobs')
        .select('*, worker:workers(id, name, email, phone, role)')
        .eq('business_id', business.id)
        .order('scheduled_at', { ascending: true })
      
      if (fetchError) {
        throw fetchError
      }
      
      setJobs(data || [])
    } catch (err) {
      console.error('Error fetching jobs:', err)
      setError(err instanceof Error ? err : new Error('Failed to fetch jobs'))
    } finally {
      setLoading(false)
    }
  }, [business, supabase])

  useEffect(() => {
    fetchJobs()
  }, [fetchJobs])

  const refresh = useCallback(() => {
    fetchJobs()
  }, [fetchJobs])

  const addJob = async (job: Omit<Job, 'id' | 'created_at' | 'updated_at'>) => {
    if (!supabase) return null
    
    try {
      setLoading(true)
      const { data, error: insertError } = await supabase
        .from('jobs')
        .insert([job])
        .select()
        .single()
      
      if (insertError) throw insertError
      
      setJobs(prev => [...prev, data])
      return data
    } catch (err) {
      console.error('Error adding job:', err)
      setError(err instanceof Error ? err : new Error('Failed to add job'))
      return null
    } finally {
      setLoading(false)
    }
  }

  const updateJob = async (id: string, updates: Partial<Job>) => {
    if (!supabase) return null
    
    try {
      setLoading(true)
      const { data, error: updateError } = await supabase
        .from('jobs')
        .update(updates)
        .eq('id', id)
        .select()
        .single()
      
      if (updateError) throw updateError
      
      setJobs(prev => prev.map(job => job.id === id ? data : job))
      return data
    } catch (err) {
      console.error('Error updating job:', err)
      setError(err instanceof Error ? err : new Error('Failed to update job'))
      return null
    } finally {
      setLoading(false)
    }
  }

  const deleteJob = async (id: string) => {
    if (!supabase) return false
    
    try {
      setLoading(true)
      const { error: deleteError } = await supabase
        .from('jobs')
        .delete()
        .eq('id', id)
      
      if (deleteError) throw deleteError
      
      setJobs(prev => prev.filter(job => job.id !== id))
      return true
    } catch (err) {
      console.error('Error deleting job:', err)
      setError(err instanceof Error ? err : new Error('Failed to delete job'))
      return false
    } finally {
      setLoading(false)
    }
  }

  return { 
    jobs, 
    loading, 
    error,
    refresh,
    addJob,
    updateJob,
    deleteJob
  }
} 
 
 