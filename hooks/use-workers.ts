'use client'

import { useState, useEffect, useCallback } from 'react'
import { Worker as DBWorker } from '@/lib/types'

export interface WorkerWithScheduleInfo extends DBWorker {
  utilization?: number
  totalHours?: number
  jobCount?: number
}

interface UseWorkersResult {
  workers: WorkerWithScheduleInfo[] | null
  loading: boolean
  error: Error | null
  refresh: () => void
}

export function useWorkers(): UseWorkersResult {
  const [workers, setWorkers] = useState<WorkerWithScheduleInfo[] | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  const fetchWorkers = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      const response = await fetch('/api/workers')
      if (!response.ok) {
        throw new Error(`Failed to fetch workers: ${response.statusText}`)
      }

      const data = await response.json()
      setWorkers(data)
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Unknown error occurred'))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchWorkers()
  }, [fetchWorkers])

  return {
    workers,
    loading,
    error,
    refresh: fetchWorkers,
  }
} 
 
 