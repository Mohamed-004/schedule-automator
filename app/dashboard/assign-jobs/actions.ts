'use server';

import { createClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';
import { z } from 'zod';
import { AppSupabaseClient } from '@/lib/supabase/types';
import { revalidatePath } from 'next/cache';

const createJobSchema = z.object({
  title: z.string().min(2, 'Title must be at least 2 characters.'),
  description: z.string().optional(),
  clientId: z.string().uuid('Please select a client.'),
  scheduledAtDate: z.coerce.date({ required_error: 'A date is required.' }),
  scheduledAtTime: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, 'Invalid time format (HH:MM).'),
  duration: z.coerce.number().int().positive('Duration must be a positive number of minutes.'),
  assignedWorkerId: z.string().uuid('Please assign a worker.'),
  workItems: z.array(z.string().min(1)).optional(),
});

const createClientSchema = z.object({
    name: z.string().min(2, "Name is required."),
    email: z.string().email("Invalid email address.").optional().or(z.literal('')),
    phone: z.string().optional(),
    address: z.string().optional(),
});

async function getBusinessId(supabase: AppSupabaseClient, user: any): Promise<string> {
  const { data: business, error } = await supabase
    .from('businesses')
    .select('id')
    .eq('user_id', user.id)
    .single();
  
  if (error || !business) {
    throw new Error('Could not find business for user.');
  }
  return business.id;
}

export async function createNewClient(formData: FormData) {
    const supabase = await createClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: 'Authentication failed.' };

    const businessId = await getBusinessId(supabase, user);
    if (!businessId) return { success: false, error: "Could not find business." };

    const validation = createClientSchema.safeParse(Object.fromEntries(formData.entries()));
    if (!validation.success) {
        return { success: false, error: 'Invalid data provided.', details: validation.error.flatten() };
    }

    const { name, email, phone, address } = validation.data;

    const { data: newClient, error } = await supabase
        .from('clients')
        .insert({
            business_id: businessId,
            name,
            email: email || null,
            phone: phone || null,
            address: address || null,
        })
        .select('id, name, email, phone, address')
        .single();

    if (error) {
        return { success: false, error: 'Database error: Could not create the client.', details: error.message };
    }
    
    revalidatePath('/dashboard/assign-jobs');
    return { success: true, client: newClient };
}


export async function getAvailableWorkersAction(startTime: string, endTime: string) {
    const supabase = await createClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: 'Authentication failed.' };

    const businessId = await getBusinessId(supabase, user);
    if (!businessId) return { success: false, error: "Could not find business." };
    
    const { data, error } = await supabase.rpc('get_available_workers', {
      p_business_id: businessId,
      p_job_start_time: startTime,
      p_job_end_time: endTime,
    });

    if (error) {
      return { success: false, error: 'Failed to fetch workers.', details: error.message };
    }

    return { success: true, workers: data };
}

export async function getWorkerScheduleAction(workerId: string, date: string) {
    const supabase = await createClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: 'Authentication failed.' };

    if (!workerId || !date) {
        return { success: false, error: 'Worker ID and date are required.' };
    }

    const { data, error } = await supabase.rpc('get_worker_schedule_summary', {
      p_worker_id: workerId,
      p_date: date,
    });

    if (error) {
      console.error("Error fetching worker schedule:", error);
      return { success: false, error: 'Failed to fetch worker schedule.', details: error.message };
    }

    return { success: true, schedule: data[0] };
}

export async function createJob(jobData: z.infer<typeof createJobSchema>) {
    const supabase = await createClient();

    const validation = createJobSchema.safeParse(jobData);
    if (!validation.success) {
        return { success: false, error: 'Invalid data provided.', details: validation.error.flatten() };
    }

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
        return { success: false, error: 'Authentication failed. Please log in again.' };
    }
    
    const { 
        title, 
        description, 
        clientId, 
        assignedWorkerId, 
        scheduledAtDate, 
        scheduledAtTime,
        duration,
        workItems
    } = validation.data;
    
    const [hours, minutes] = scheduledAtTime.split(':').map(Number);
    const scheduledAt = new Date(scheduledAtDate);
    scheduledAt.setHours(hours, minutes, 0, 0);

    try {
        const businessId = await getBusinessId(supabase, user);
        if (!businessId) {
            return { success: false, error: "Could not find business associated with your account." };
        }

        const { data: newJob, error } = await supabase
            .from('jobs')
            .insert({
                business_id: businessId,
                client_id: clientId,
                worker_id: assignedWorkerId,
                title,
                description,
                scheduled_at: scheduledAt.toISOString(),
                status: 'scheduled',
                duration_minutes: duration,
                work_items: workItems,
            })
            .select('id')
            .single();

        if (error) {
            console.error('Supabase error:', error);
            return { success: false, error: 'Database error: Could not create the job.', details: error.message };
        }
        
        revalidatePath('/dashboard/jobs');
        revalidatePath('/dashboard/schedule');
        revalidatePath('/dashboard/assign-jobs');

        return { success: true, jobId: newJob.id };
    } catch (e: any) {
        console.error('Server action error:', e);
        return { success: false, error: 'An unexpected server error occurred.', details: e.message };
    }
}

export async function getRecommendedWorkersAction(startTime: string, endTime: string, clientId: string, jobTypeId?: string) {
    const supabase = await createClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: 'Authentication failed.' };

    const businessId = await getBusinessId(supabase, user);
    if (!businessId) return { success: false, error: "Could not find business." };
    
    try {
        const { data, error } = await supabase.rpc('get_recommended_workers', {
            p_business_id: businessId,
            p_job_start_time: startTime,
            p_job_end_time: endTime,
            p_client_id: clientId,
            p_job_type_id: jobTypeId || null
        });

        if (error) {
            console.error("Error fetching recommended workers:", error);
            
            const { data: fallbackData, error: fallbackError } = await supabase.rpc('get_available_workers', {
                p_business_id: businessId,
                p_job_start_time: startTime,
                p_job_end_time: endTime,
            });
            
            if (fallbackError) {
                return { success: false, error: 'Failed to fetch workers.', details: fallbackError.message };
            }
            
            // Clean worker names in fallback data
            const cleanedFallbackData = fallbackData.map((worker: any) => ({
                ...worker,
                worker_name: worker.worker_name.replace(/\s+\d+$/, '')
            }));
            
            return { 
                success: true, 
                workers: cleanedFallbackData,
                warning: 'Recommendation engine unavailable, showing all available workers instead.'
            };
        }

        // Clean worker names in the recommended workers data
        const cleanedData = data.map((worker: any) => ({
            ...worker,
            worker_name: worker.worker_name.replace(/\s+\d+$/, '')
        }));

        return { success: true, workers: cleanedData };
    } catch (e: any) {
        console.error("Error in getRecommendedWorkersAction:", e);
        return { success: false, error: 'An unexpected error occurred.', details: e.message };
    }
} 