import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { Worker, Business } from '@/lib/types';

interface UseTeamDataReturn {
  business: Business | null;
  workers: Worker[];
  loading: boolean;
  error: Error | null;
  addWorker: (worker: Omit<Worker, 'id' | 'business_id' | 'created_at' | 'updated_at' | 'status'>) => Promise<Worker | null>;
  deleteWorker: (id: string) => Promise<boolean>;
  refresh: () => void;
}

export function useTeamData(): UseTeamDataReturn {
  const [business, setBusiness] = useState<Business | null>(null);
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const supabase = createClient();

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const { data: businessData, error: businessError } = await supabase
        .from('businesses')
        .select('*')
        .eq('user_id', user.id)
        .single();
      
      if (businessError) throw businessError;
      setBusiness(businessData);

      if (businessData) {
        const { data: workersData, error: workersError } = await supabase
          .from('workers')
          .select('*')
          .eq('business_id', businessData.id)
          .order('name', { ascending: true });
        
        if (workersError) throw workersError;
        setWorkers(workersData || []);
      } else {
        setWorkers([]);
      }
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to fetch team data'));
    } finally {
      setLoading(false);
    }
  }, [supabase]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const addWorker = async (worker: Omit<Worker, 'id' | 'business_id' | 'created_at' | 'updated_at' | 'status'>): Promise<Worker | null> => {
    if (!business) return null;
    try {
      const { data, error } = await supabase
        .from('workers')
        .insert([{ ...worker, business_id: business.id, status: 'active' }])
        .select()
        .single();
      if (error) throw error;
      fetchData(); // Refresh data
      return data;
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to add worker'));
      return null;
    }
  };

  const deleteWorker = async (id: string): Promise<boolean> => {
    try {
      const { error } = await supabase.from('workers').delete().eq('id', id);
      if (error) throw error;
      fetchData(); // Refresh data
      return true;
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to delete worker'));
      return false;
    }
  };

  return { business, workers, loading, error, addWorker, deleteWorker, refresh: fetchData };
} 