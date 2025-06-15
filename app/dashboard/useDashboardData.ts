import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { Business, Job, Worker, Client } from '@/lib/types';

interface UseDashboardDataReturn {
  business: Business | null;
  jobs: Job[];
  workers: Worker[];
  clients: Client[];
  loading: boolean;
  error: Error | null;
  refresh: () => void;
  createBusiness: (businessData: Omit<Business, 'id' | 'created_at' | 'updated_at' | 'user_id'>) => Promise<Business | null>;
  addJob: (job: Omit<Job, 'id' | 'created_at' | 'updated_at' | 'business_id'>) => Promise<Job | null>;
  updateJob: (id: string, updates: Partial<Job>) => Promise<Job | null>;
  deleteJob: (id: string) => Promise<boolean>;
}

export function useDashboardData(): UseDashboardDataReturn {
  const [business, setBusiness] = useState<Business | null>(null);
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
      if (!user) {
        setLoading(false);
        return;
      }

      const { data: businessData, error: businessError } = await supabase
        .from('businesses')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (businessError && businessError.code !== 'PGRST116') { // Ignore 'not found' error
        throw businessError;
      }
      
      setBusiness(businessData);

      if (businessData) {
        const [
          { data: jobsData, error: jobsError },
          { data: workersData, error: workersError },
          { data: clientsData, error: clientsError }
        ] = await Promise.all([
          supabase.from('jobs').select('*, worker:workers(id, name, email, phone, role)').eq('business_id', businessData.id).order('scheduled_at', { ascending: true }),
          supabase.from('workers').select('*').eq('business_id', businessData.id),
          supabase.from('clients').select('*').eq('business_id', businessData.id)
        ]);
        
        if (jobsError || workersError || clientsError) throw new Error('Failed to fetch business data.');
        
        setJobs(jobsData || []);
        setWorkers(workersData || []);
        setClients(clientsData || []);
      }
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to fetch dashboard data'));
    } finally {
      setLoading(false);
    }
  }, [supabase]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const refresh = useCallback(() => {
    fetchData();
  }, [fetchData]);

  const createBusiness = async (businessData: Omit<Business, 'id' | 'created_at' | 'updated_at' | 'user_id'>) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    try {
      const { data, error } = await supabase
        .from('businesses')
        .insert([{ ...businessData, user_id: user.id }])
        .select()
        .single();
      if (error) throw error;
      setBusiness(data);
      return data;
    } catch (err) {
      console.error('Error creating business:', err);
      setError(err instanceof Error ? err : new Error('Failed to create business'));
      return null;
    }
  };

  const addJob = async (job: Omit<Job, 'id' | 'created_at' | 'updated_at' | 'business_id'>) => {
    if (!supabase || !business) return null;
    try {
      const { data, error: insertError } = await supabase
        .from('jobs')
        .insert([{ ...job, business_id: business.id }])
        .select('*, worker:workers(id, name, email, phone, role)')
        .single();
      if (insertError) throw insertError;
      setJobs(prev => [...prev, data]);
      return data;
    } catch (err) {
      console.error('Error adding job:', err);
      setError(err instanceof Error ? err : new Error('Failed to add job'));
      return null;
    }
  };

  const updateJob = async (id: string, updates: Partial<Job>) => {
    if (!supabase) return null;
    try {
      const { data, error: updateError } = await supabase
        .from('jobs')
        .update(updates)
        .eq('id', id)
        .select('*, worker:workers(id, name, email, phone, role)')
        .single();
      if (updateError) throw updateError;
      setJobs(prev => prev.map(j => (j.id === id ? data : j)));
      return data;
    } catch (err) {
      console.error('Error updating job:', err);
      setError(err instanceof Error ? err : new Error('Failed to update job'));
      return null;
    }
  };

  const deleteJob = async (id: string) => {
    if (!supabase) return false;
    try {
      const { error: deleteError } = await supabase.from('jobs').delete().eq('id', id);
      if (deleteError) throw deleteError;
      setJobs(prev => prev.filter(j => j.id !== id));
      return true;
    } catch (err) {
      console.error('Error deleting job:', err);
      setError(err instanceof Error ? err : new Error('Failed to delete job'));
      return false;
    }
  };

  return { business, jobs, workers, clients, loading, error, refresh, createBusiness, addJob, updateJob, deleteJob };
} 