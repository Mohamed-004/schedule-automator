'use client'

import { useState, useEffect, useCallback } from 'react'
import { Worker as DBWorker } from '@/lib/types'

export interface WorkerWithScheduleInfo extends DBWorker {
  utilization?: number
  totalHours?: number
  jobCount?: number
  working_hours?: {
    start: string // Format: "HH:MM"
    end: string // Format: "HH:MM"
    day?: number // 0-6
  }[]
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

      // Fetch workers data
      const response = await fetch('/api/workers')
      if (!response.ok) {
        throw new Error(`Failed to fetch workers: ${response.statusText}`)
      }

      const workersData = await response.json()
      
      // If we have worker data, also try to fetch their availability
      if (workersData && Array.isArray(workersData) && workersData.length > 0) {
        try {
          // For each worker, try to fetch their availability
          const workersWithAvailability = await Promise.all(
            workersData.map(async (worker: WorkerWithScheduleInfo) => {
              try {
                // Try to fetch worker availability from the API
                const availResponse = await fetch(`/api/workers/${worker.id}/availability`)
                
                if (availResponse.ok) {
                  const availData = await availResponse.json()
                  
                  if (availData && Array.isArray(availData) && availData.length > 0) {
                    // Map the availability data to working_hours format
                    worker.working_hours = availData.map(slot => ({
                      start: slot.start_time ? slot.start_time.substring(0, 5) : '09:00',
                      end: slot.end_time ? slot.end_time.substring(0, 5) : '17:00',
                      day: slot.day_of_week
                    }))
                  }
                }
                
                // If no availability data was found or the request failed, provide defaults
                if (!worker.working_hours || !Array.isArray(worker.working_hours) || worker.working_hours.length === 0) {
                  // Default working hours - weekdays 9-5
                  worker.working_hours = [
                    { start: '09:00', end: '17:00', day: 1 }, // Monday
                    { start: '09:00', end: '17:00', day: 2 }, // Tuesday
                    { start: '09:00', end: '17:00', day: 3 }, // Wednesday
                    { start: '09:00', end: '17:00', day: 4 }, // Thursday
                    { start: '09:00', end: '17:00', day: 5 }  // Friday
                  ]
                }
                
                return worker
              } catch (err) {
                console.error(`Error fetching availability for worker ${worker.id}:`, err)
                
                // Provide default working hours if there was an error
                worker.working_hours = [
                  { start: '09:00', end: '17:00', day: 1 }, // Monday
                  { start: '09:00', end: '17:00', day: 2 }, // Tuesday
                  { start: '09:00', end: '17:00', day: 3 }, // Wednesday
                  { start: '09:00', end: '17:00', day: 4 }, // Thursday
                  { start: '09:00', end: '17:00', day: 5 }  // Friday
                ]
                
                return worker
              }
            })
          )
          
          setWorkers(workersWithAvailability)
        } catch (err) {
          console.error("Error processing worker availability:", err)
          
          // Still set the workers even if availability processing failed
          const workersWithDefaults = workersData.map((worker: WorkerWithScheduleInfo) => {
            if (!worker.working_hours || !Array.isArray(worker.working_hours) || worker.working_hours.length === 0) {
              worker.working_hours = [
                { start: '09:00', end: '17:00', day: 1 }, // Monday
                { start: '09:00', end: '17:00', day: 2 }, // Tuesday
                { start: '09:00', end: '17:00', day: 3 }, // Wednesday
                { start: '09:00', end: '17:00', day: 4 }, // Thursday
                { start: '09:00', end: '17:00', day: 5 }  // Friday
              ]
            }
            return worker
          })
          
          setWorkers(workersWithDefaults)
        }
      } else {
        setWorkers(workersData)
      }
    } catch (err) {
      console.error("Error in useWorkers hook:", err)
      setError(err instanceof Error ? err : new Error('Unknown error occurred'))
      // Return empty array instead of null to prevent further errors
      setWorkers([])
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
 
 