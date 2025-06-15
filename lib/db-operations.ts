import { createClient } from './supabase/server'
import type { 
  Business, 
  Worker, 
  Client, 
  Job, 
  Reminder, 
  RescheduleRequest, 
  Notification 
} from './types'

// Business Operations
export const businessOperations = {
  async create(business: Omit<Business, 'id' | 'created_at' | 'updated_at'>) {
    const { data, error } = await supabase
      .from('businesses')
      .insert([business])
      .select()
      .single()
    
    if (error) throw error
    return data
  },

  async get(id: string) {
    const { data, error } = await supabase
      .from('businesses')
      .select('*')
      .eq('id', id)
      .single()
    
    if (error) throw error
    return data
  },

  async update(id: string, updates: Partial<Business>) {
    const { data, error } = await supabase
      .from('businesses')
      .update(updates)
      .eq('id', id)
      .select()
      .single()
    
    if (error) throw error
    return data
  },

  async delete(id: string) {
    const { error } = await supabase
      .from('businesses')
      .delete()
      .eq('id', id)
    
    if (error) throw error
  }
}

// Worker Operations
export const workerOperations = {
  async create(worker: Omit<Worker, 'id' | 'created_at' | 'updated_at'>) {
    const { data, error } = await supabase
      .from('workers')
      .insert([worker])
      .select()
      .single()
    
    if (error) throw error
    return data
  },

  async getByBusiness(businessId: string) {
    console.log('workerOperations.getByBusiness called with businessId:', businessId);
    try {
      // Debug: Check all workers in the database
      const { data: allWorkers, error: allWorkersError } = await supabase
        .from('workers')
        .select('*');
      
      console.log('All workers in database:', allWorkers);
      if (allWorkersError) {
        console.error('Error fetching all workers:', allWorkersError);
      }

      // Debug: Check the specific business
      const { data: business, error: businessError } = await supabase
        .from('businesses')
        .select('*')
        .eq('id', businessId)
        .single();
      
      console.log('Business data:', business);
      if (businessError) {
        console.error('Error fetching business:', businessError);
      }

      // Debug: Check workers for this business
      const { data: workers, error: workersError } = await supabase
        .from('workers')
        .select('*')
        .eq('business_id', businessId);
      
      console.log('Workers for business:', workers);
      if (workersError) {
        console.error('Error fetching workers for business:', workersError);
      }

      // Debug: Check RLS policies
      const { data: policies, error: policiesError } = await supabase
        .from('pg_policies')
        .select('*')
        .eq('tablename', 'workers');
      
      console.log('Worker table policies:', policies);
      if (policiesError) {
        console.error('Error fetching policies:', policiesError);
      }

      return workers || [];
    } catch (err) {
      console.error('Error in getByBusiness:', err);
      throw err;
    }
  },

  async update(id: string, updates: Partial<Worker>) {
    const { data, error } = await supabase
      .from('workers')
      .update(updates)
      .eq('id', id)
      .select()
      .single()
    
    if (error) throw error
    return data
  },

  async delete(id: string) {
    const { error } = await supabase
      .from('workers')
      .delete()
      .eq('id', id)
    
    if (error) throw error
  }
}

// Client Operations
export const clientOperations = {
  async create(client: Omit<Client, 'id' | 'created_at' | 'updated_at'>) {
    const { data, error } = await supabase
      .from('clients')
      .insert([client])
      .select()
      .single()
    
    if (error) throw error
    return data
  },

  async getByBusiness(businessId: string) {
    const { data, error } = await supabase
      .from('clients')
      .select('*')
      .eq('business_id', businessId)
    
    if (error) throw error
    return data
  },

  async update(id: string, updates: Partial<Client>) {
    const { data, error } = await supabase
      .from('clients')
      .update(updates)
      .eq('id', id)
      .select()
      .single()
    
    if (error) throw error
    return data
  },

  async delete(id: string) {
    const { error } = await supabase
      .from('clients')
      .delete()
      .eq('id', id)
    
    if (error) throw error
  }
}

// Job Operations
export const jobOperations = {
  async create(job: Omit<Job, 'id' | 'created_at' | 'updated_at'>) {
    const supabase = await createClient()
    const { data, error } = await supabase
      .from('jobs')
      .insert([job])
      .select()
      .single()
    
    if (error) throw error
    return data
  },

  async getByBusiness(businessId: string, startDate: string, endDate: string) {
    const { data, error } = await supabase
      .from('jobs')
      .select('*')
      .eq('business_id', businessId)
      .gte('start_time', startDate)
      .lte('end_time', endDate)
    
    if (error) throw error
    return data
  },

  async update(id: string, updates: Partial<Job>) {
    const { data, error } = await supabase
      .from('jobs')
      .update(updates)
      .eq('id', id)
      .select()
      .single()
    
    if (error) throw error
    return data
  },

  async delete(id: string) {
    const { error } = await supabase
      .from('jobs')
      .delete()
      .eq('id', id)
    
    if (error) throw error
  }
}

// Reminder Operations
export const reminderOperations = {
  async create(reminder: Omit<Reminder, 'id' | 'created_at' | 'updated_at'>) {
    const { data, error } = await supabase
      .from('reminders')
      .insert([reminder])
      .select()
      .single()
    
    if (error) throw error
    return data
  },

  async getPending() {
    const { data, error } = await supabase
      .from('reminders')
      .select('*')
      .eq('status', 'pending')
      .lte('scheduled_for', new Date().toISOString())
    
    if (error) throw error
    return data
  },

  async update(id: string, updates: Partial<Reminder>) {
    const { data, error } = await supabase
      .from('reminders')
      .update(updates)
      .eq('id', id)
      .select()
      .single()
    
    if (error) throw error
    return data
  },

  async delete(id: string) {
    const { error } = await supabase
      .from('reminders')
      .delete()
      .eq('id', id)
    
    if (error) throw error
  }
}

// Reschedule Request Operations
export const rescheduleOperations = {
  async create(request: Omit<RescheduleRequest, 'id' | 'created_at' | 'updated_at'>) {
    const { data, error } = await supabase
      .from('reschedule_requests')
      .insert([request])
      .select()
      .single()
    
    if (error) throw error
    return data
  },

  async getPendingByJob(jobId: string) {
    const { data, error } = await supabase
      .from('reschedule_requests')
      .select('*')
      .eq('job_id', jobId)
      .eq('status', 'pending')
    
    if (error) throw error
    return data
  },

  async update(id: string, updates: Partial<RescheduleRequest>) {
    const { data, error } = await supabase
      .from('reschedule_requests')
      .update(updates)
      .eq('id', id)
      .select()
      .single()
    
    if (error) throw error
    return data
  },

  async delete(id: string) {
    const { error } = await supabase
      .from('reschedule_requests')
      .delete()
      .eq('id', id)
    
    if (error) throw error
  }
}

// Notification Operations
export const notificationOperations = {
  async create(notification: Omit<Notification, 'id' | 'created_at' | 'updated_at'>) {
    const { data, error } = await supabase
      .from('notifications')
      .insert([notification])
      .select()
      .single()
    
    if (error) throw error
    return data
  },

  async getByBusiness(businessId: string) {
    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('business_id', businessId)
      .order('created_at', { ascending: false })
    
    if (error) throw error
    return data
  },

  async markAsRead(id: string) {
    const { data, error } = await supabase
      .from('notifications')
      .update({ status: 'read' })
      .eq('id', id)
      .select()
      .single()
    
    if (error) throw error
    return data
  },

  async delete(id: string) {
    const { error } = await supabase
      .from('notifications')
      .delete()
      .eq('id', id)
    
    if (error) throw error
  }
} 
 
 