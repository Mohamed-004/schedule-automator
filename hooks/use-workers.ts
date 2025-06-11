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
  addWorker: (worker: Omit<DBWorker, 'id' | 'created_at' | 'updated_at'>) => Promise<WorkerWithScheduleInfo | null>
  deleteWorker: (id: string) => Promise<boolean>
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

  const addWorker = async (worker: Omit<DBWorker, 'id' | 'created_at' | 'updated_at'>): Promise<WorkerWithScheduleInfo | null> => {
    try {
      const response = await fetch('/api/workers', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(worker),
      })

      if (!response.ok) {
        throw new Error(`Failed to add worker: ${response.statusText}`)
      }

      const newWorker = await response.json()
      setWorkers(prev => prev ? [...prev, newWorker] : [newWorker])
      return newWorker
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Unknown error occurred'))
      return null
    }
  }

  const deleteWorker = async (id: string): Promise<boolean> => {
    try {
      const response = await fetch(`/api/workers/${id}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        throw new Error(`Failed to delete worker: ${response.statusText}`)
      }

      setWorkers(prev => prev ? prev.filter(worker => worker.id !== id) : [])
      return true
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Unknown error occurred'))
      return false
    }
  }

  return {
    workers,
    loading,
    error,
    refresh: fetchWorkers,
    addWorker,
    deleteWorker,
  }
} 
 
 