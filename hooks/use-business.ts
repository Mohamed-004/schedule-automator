// hooks/use-business.ts

import { useState, useEffect, useCallback } from 'react';
import { useSupabase } from '@/lib/SupabaseProvider';
import { Business } from '@/lib/types';

export function useBusiness() {
  const { supabase, session } = useSupabase();
  const [business, setBusiness] = useState<Business | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchBusiness = useCallback(async () => {
    if (!session?.user?.id) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const { data, error } = await supabase
        .from('businesses')
        .select('*')
        .eq('user_id', session.user.id)
        .single();

      if (error && error.code !== 'PGRST116') { // Ignore 'PGRST116' (No rows found)
        throw new Error(error.message);
      }
      
      setBusiness(data as Business);
    } catch (e: any) {
      setError(e.message);
      console.error('Error fetching business:', e);
    } finally {
      setLoading(false);
    }
  }, [supabase, session]);

  useEffect(() => {
    fetchBusiness();
  }, [fetchBusiness]);

  const createBusiness = async (businessData: Omit<Business, 'id' | 'user_id' | 'created_at'>) => {
    if (!session?.user?.id) {
      throw new Error("User must be logged in to create a business.");
    }

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('businesses')
        .insert([{ ...businessData, user_id: session.user.id }])
        .select()
        .single();

      if (error) throw new Error(error.message);
      
      setBusiness(data as Business);
      return data;
    } catch (e: any) {
      console.error('Error creating business:', e);
      setError(e.message);
      throw e;
    } finally {
      setLoading(false);
    }
  };

  return { business, loading, error, createBusiness, refresh: fetchBusiness };
} 