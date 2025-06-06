'use client'

import { useEffect, useState } from 'react'
import { workerOperations } from '@/lib/db-operations'
import type { Worker } from '@/lib/types'

export function useWorkers(businessId?: string) {
  const [workers, setWorkers] = useState<Worker[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    async function fetchWorkers() {
      if (!businessId) {
        console.log('No businessId provided to useWorkers hook');
        setWorkers([])
        setLoading(false)
        return
      }
      try {
        console.log('Fetching workers for businessId:', businessId);
        const data = await workerOperations.getByBusiness(businessId)
        console.log('Fetched workers:', data);
        setWorkers(data)
      } catch (err) {
        console.error('Error fetching workers:', err);
        setError(err instanceof Error ? err : new Error('Failed to fetch workers'))
      } finally {
        setLoading(false)
      }
    }
    fetchWorkers()
  }, [businessId])

  return { workers, loading, error }
} 
 
 