// hooks/use-jobs.ts

import { useState, useEffect, useCallback } from 'react';
import { useSupabase } from '@/lib/SupabaseProvider';
import { useBusiness } from './use-business';
import { Job } from '@/lib/types';

export function useJobs() {
  const { supabase } = useSupabase();
  const { business } = useBusiness();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchJobs = useCallback(async () => {
    if (!business?.id) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const { data, error } = await supabase
        .from('jobs')
        .select('*')
        .eq('business_id', business.id)
        .order('created_at', { ascending: false });

      if (error) {
        throw new Error(error.message);
      }
      
      setJobs(data as Job[]);
    } catch (e: any) {
      setError(e.message);
      console.error('Error fetching jobs:', e);
    } finally {
      setLoading(false);
    }
  }, [supabase, business]);

  useEffect(() => {
    fetchJobs();
  }, [fetchJobs]);

  return { jobs, loading, error, refresh: fetchJobs };
} 