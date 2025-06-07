'use client'

import { useEffect, useState } from 'react'
import { useSupabase } from '@/lib/SupabaseProvider'
import type { Business } from '@/lib/types'

export function useBusiness() {
  const { supabase, user } = useSupabase()
  const [business, setBusiness] = useState<Business | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    async function fetchBusiness() {
      if (!supabase || !user) {
        setBusiness(null)
        setLoading(false)
        return
      }

      try {
        setLoading(true)
        const { data, error: businessError } = await supabase
          .from('businesses')
          .select('*')
          .eq('user_id', user.id)
          .single()

        if (businessError) {
          if (businessError.code === 'PGRST116') {
            setBusiness(null) // No business found for this user, a valid state.
          } else {
            throw businessError
          }
        } else {
          setBusiness(data)
        }
      } catch (err) {
        console.error('Error fetching business:', err)
        setError(err instanceof Error ? err : new Error('Failed to fetch business'))
      } finally {
        setLoading(false)
      }
    }

    fetchBusiness()
  }, [supabase, user])

  const createBusiness = async (businessData: Omit<Business, 'id' | 'created_at' | 'updated_at'>) => {
    if (!supabase || !user) return null;
    
    try {
      setLoading(true);
      const { data, error: insertError } = await supabase
        .from('businesses')
        .insert([{ ...businessData, user_id: user.id }])
        .select()
        .single();
      
      if (insertError) throw insertError;
      
      setBusiness(data);
      return data;
    } catch (err) {
      console.error('Error creating business:', err);
      setError(err instanceof Error ? err : new Error('Failed to create business'));
      return null;
    } finally {
      setLoading(false);
    }
  };

  return { business, loading, error, createBusiness }
} 
 
 