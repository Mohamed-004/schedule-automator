// hooks/use-workers.ts

import { useState, useEffect, useCallback } from 'react';
import { useSupabase } from '@/lib/SupabaseProvider';
import { useBusiness } from './use-business';
import { Worker } from '@/lib/types';

export function useWorkers() {
  const { supabase } = useSupabase();
  const { business } = useBusiness();
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchWorkers = useCallback(async () => {
    if (!business?.id) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const { data, error } = await supabase
        .from('workers')
        .select('*')
        .eq('business_id', business.id)
        .order('created_at', { ascending: false });

      if (error) {
        throw new Error(error.message);
      }
      
      setWorkers(data as Worker[]);
    } catch (e: any) {
      setError(e.message);
      console.error('Error fetching workers:', e);
    } finally {
      setLoading(false);
    }
  }, [supabase, business]);

  useEffect(() => {
    fetchWorkers();
  }, [fetchWorkers]);

  return { workers, loading, error, refresh: fetchWorkers };
} 