import { useEffect, useState } from 'react'
import { jobOperations } from '@/lib/db-operations'
import type { Job } from '@/lib/types'

export function useJobs() {
  const [jobs, setJobs] = useState<Job[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    async function fetchJobs() {
      try {
        const today = new Date()
        const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0)
        
        const data = await jobOperations.list(today.toISOString(), endOfMonth.toISOString())
        setJobs(data)
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Failed to fetch jobs'))
      } finally {
        setLoading(false)
      }
    }

    fetchJobs()
  }, [])

  return { jobs, loading, error }
} 