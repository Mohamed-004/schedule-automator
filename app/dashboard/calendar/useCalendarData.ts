import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { Job, Worker, Client } from '@/lib/types';

interface UseCalendarDataReturn {
  jobs: Job[];
  workers: Worker[];
  clients: Client[];
  loading: boolean;
  error: Error | null;
}

export function useCalendarData(): UseCalendarDataReturn {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const supabase = createClient();

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const { data: business, error: businessError } = await supabase
        .from('businesses')
        .select('id')
        .eq('user_id', user.id)
        .single();
      
      if (businessError) throw businessError;
      if (!business) throw new Error('No business found for user.');

      const businessId = business.id;

      const [
        { data: jobsData, error: jobsError },
        { data: workersData, error: workersError },
        { data: clientsData, error: clientsError }
      ] = await Promise.all([
        supabase.from('jobs').select('*, worker:workers(name), client:clients(name)').eq('business_id', businessId),
        supabase.from('workers').select('*').eq('business_id', businessId),
        supabase.from('clients').select('*').eq('business_id', businessId)
      ]);

      if (jobsError || workersError || clientsError) {
        console.error({ jobsError, workersError, clientsError });
        throw new Error('Failed to fetch calendar data.');
      }

      setJobs(jobsData || []);
      setWorkers(workersData || []);
      setClients(clientsData || []);

    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to fetch calendar data'));
    } finally {
      setLoading(false);
    }
  }, [supabase]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { jobs, workers, clients, loading, error };
} 