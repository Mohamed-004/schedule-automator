'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { Job } from '@/lib/types'

export function useJobs() {
  const [jobs, setJobs] = useState<Job[] | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)
  const supabase = createClientComponentClient()

  const fetchJobs = useCallback(async () => {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('jobs')
        .select('*')
        .order('scheduled_at', { ascending: true })

      if (error) throw error
      setJobs(data)
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to fetch jobs'))
    } finally {
      setLoading(false)
    }
  }, [supabase])

  useEffect(() => {
    fetchJobs()
  }, [fetchJobs])

  return { jobs, loading, error, refresh: fetchJobs }
} 
 
 