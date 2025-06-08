import { Metadata } from 'next'
import { notFound } from 'next/navigation'
import WorkerAvailabilityManager from '@/components/team/WorkerAvailabilityManager'
import { createServerClient } from '@/lib/supabase-server'

export const metadata: Metadata = {
  title: 'My Availability',
  description: 'Set and manage your availability schedule',
}

export default async function WorkerSelfAvailabilityPage({
  params,
}: {
  params: Promise<{ workerId: string }>
}) {
  const { workerId } = await params
  const supabase = createServerClient()
  
  // Verify the worker exists
  const { data: worker, error } = await supabase
    .from('workers')
    .select('id, name')
    .eq('id', workerId)
    .single()
  
  if (error || !worker) {
    notFound()
  }
  
  return (
    <div className="container py-10">
      <h1 className="text-2xl font-bold mb-6">My Availability</h1>
      <p className="text-muted-foreground mb-6">
        Set your weekly availability and manage time off. Changes may require approval.
      </p>
      <WorkerAvailabilityManager initialWorkerId={workerId} isAdmin={false} />
    </div>
  )
} 