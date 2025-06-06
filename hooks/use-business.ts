import { useEffect, useState } from 'react'
import { businessOperations } from '@/lib/db-operations'
import type { Business } from '@/lib/types'

export function useBusiness() {
  const [business, setBusiness] = useState<Business | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    async function fetchBusiness() {
      try {
        const data = await businessOperations.get()
        setBusiness(data)
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Failed to fetch business'))
      } finally {
        setLoading(false)
      }
    }

    fetchBusiness()
  }, [])

  return { business, loading, error }
} 