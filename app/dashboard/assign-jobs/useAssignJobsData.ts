import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';

// Local types for this hook
interface SimpleClient {
  id: string;
  name: string;
}

interface SimpleWorker {
  id: string;
  name: string;
  role: string;
}

interface SimpleJobType {
  id: string;
  name: string;
  description: string;
  required_skills: string[];
}

interface UseAssignJobsDataReturn {
  clients: SimpleClient[];
  workers: SimpleWorker[];
  jobTypes: SimpleJobType[];
  isLoading: boolean;
  error: string | null;
}

export function useAssignJobsData(): UseAssignJobsDataReturn {
  const [clients, setClients] = useState<SimpleClient[]>([]);
  const [workers, setWorkers] = useState<SimpleWorker[]>([]);
  const [jobTypes, setJobTypes] = useState<SimpleJobType[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const supabase = createClient();

  const fetchData = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) throw new Error('You must be logged in to assign jobs.');

      const { data: business, error: businessError } = await supabase
        .from('businesses')
        .select('id')
        .eq('user_id', user.id)
        .single();
      
      if (businessError || !business) throw new Error('Could not find business.');

      const businessId = business.id;

      const [
        { data: clientsData, error: clientsError },
        { data: workersData, error: workersError },
        { data: jobTypesData, error: jobTypesError }
      ] = await Promise.all([
        supabase.from('clients').select('id, name').eq('business_id', businessId),
        supabase.from('workers').select('id, name, role').eq('business_id', businessId).eq('status', 'active'),
        supabase.from('job_types').select('id, name, description, required_skills')
      ]);

      if (clientsError || workersError || jobTypesError) {
        console.error({ clientsError, workersError, jobTypesError });
        throw new Error('Failed to load data for job assignment.');
      }

      setClients(clientsData || []);
      setWorkers(workersData || []);
      setJobTypes(jobTypesData || []);

    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }, [supabase]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { clients, workers, jobTypes, isLoading, error };
} 