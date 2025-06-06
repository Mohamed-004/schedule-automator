'use client'

import { useState, useEffect } from 'react'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { Business } from '@/lib/types'

export function useBusiness() {
  const [business, setBusiness] = useState<Business | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)
  const supabase = createClientComponentClient()

  useEffect(() => {
    async function fetchOrCreateBusiness() {
      try {
        // First, try to fetch the existing business
        const { data: { session } } = await supabase.auth.getSession()
        if (!session) {
          throw new Error('No session found')
        }

        const { data: existingBusiness, error: fetchError } = await supabase
          .from('businesses')
          .select('*')
          .eq('user_id', session.user.id)
          .single()

        if (fetchError && fetchError.code !== 'PGRST116') { // PGRST116 is "no rows returned"
          throw fetchError
        }

        if (!existingBusiness) {
          // If no business exists, create one
          const { data: newBusiness, error: createError } = await supabase
            .from('businesses')
            .insert([
              {
                user_id: session.user.id,
                name: 'My Business',
                email: session.user.email,
              }
            ])
            .select()
            .single()

          if (createError) throw createError
          setBusiness(newBusiness)
        } else {
          setBusiness(existingBusiness)
        }
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Failed to fetch or create business'))
      } finally {
        setLoading(false)
      }
    }

    fetchOrCreateBusiness()
  }, [supabase])

  return { business, loading, error }
} 
 
 