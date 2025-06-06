import { createServerComponentClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'

export async function getSession() {
  const supabase = createServerComponentClient({ cookies })
  const { data: { session } } = await supabase.auth.getSession()
  return session
}

export async function requireAuth() {
  const session = await getSession()
  if (!session) {
    redirect('/auth/login')
  }
  return session
}

export async function getBusinessId() {
  const session = await requireAuth()
  return session.user.id
}

export async function checkBusinessAccess(businessId: string) {
  const session = await requireAuth()
  if (session.user.id !== businessId) {
    throw new Error('Unauthorized access to business data')
  }
}

export async function checkJobAccess(jobId: string) {
  const supabase = createServerComponentClient({ cookies })
  const session = await requireAuth()
  
  const { data: job, error } = await supabase
    .from('jobs')
    .select('business_id')
    .eq('id', jobId)
    .single()

  if (error || !job) {
    throw new Error('Job not found')
  }

  if (job.business_id !== session.user.id) {
    throw new Error('Unauthorized access to job data')
  }
}

export async function checkClientAccess(clientId: string) {
  const supabase = createServerComponentClient({ cookies })
  const session = await requireAuth()
  
  const { data: client, error } = await supabase
    .from('clients')
    .select('business_id')
    .eq('id', clientId)
    .single()

  if (error || !client) {
    throw new Error('Client not found')
  }

  if (client.business_id !== session.user.id) {
    throw new Error('Unauthorized access to client data')
  }
}

export async function checkWorkerAccess(workerId: string) {
  const supabase = createServerComponentClient({ cookies })
  const session = await requireAuth()
  
  const { data: worker, error } = await supabase
    .from('workers')
    .select('business_id')
    .eq('id', workerId)
    .single()

  if (error || !worker) {
    throw new Error('Worker not found')
  }

  if (worker.business_id !== session.user.id) {
    throw new Error('Unauthorized access to worker data')
  }
} 
 
 