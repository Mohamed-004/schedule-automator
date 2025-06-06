import { useEffect, useState } from 'react'
import { workerOperations } from '@/lib/db-operations'
import type { Worker } from '@/lib/types'

export function useWorkers() {
  const [workers, setWorkers] = useState<Worker[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    async function fetchWorkers() {
      try {
        const data = await workerOperations.getByBusiness()
        setWorkers(data)
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Failed to fetch workers'))
      } finally {
        setLoading(false)
      }
    }

    fetchWorkers()
  }, [])

  return { workers, loading, error }
} 