import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import WorkerAvailabilityManager from '@/components/team/WorkerAvailabilityManager';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function WorkerSelfAvailabilityPage({ 
  params 
}: { 
  params: { workerId: string } 
}) {
  const supabase = await createClient();
  const workerId = params.workerId;
  
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    redirect('/login');
  }

  const { data: worker, error } = await supabase
    .from('workers')
    .select('id, name, user_id, business_id')
    .eq('id', workerId)
    .single();

  if (error || !worker) {
    return (
      <div className="container mx-auto py-8">
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <h2 className="text-xl font-semibold text-red-800">Worker Not Found</h2>
          <p className="mt-2 text-red-600">The worker ID '{workerId}' does not exist.</p>
        </div>
      </div>
    );
  }

  // Basic authorization: check if logged-in user is associated with the same business as the worker
  const { data: business } = await supabase
    .from('businesses')
    .select('id')
    .eq('user_id', user.id)
    .single();

  if (!business || business.id !== worker.business_id) {
    return (
      <div className="container mx-auto py-8">
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <h2 className="text-xl font-semibold text-red-800">Access Denied</h2>
          <p className="mt-2 text-red-600">You do not have permission to view this worker's availability.</p>
        </div>
      </div>
    );
  }

  const isOwnProfile = worker.user_id === user.id;

  return (
    <div className="container mx-auto py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">{isOwnProfile ? 'Your Availability' : `${worker.name}'s Availability`}</h1>
        <p className="text-gray-600 mt-2">
          Set your regular weekly schedule and any exceptions for specific dates.
        </p>
      </div>

      <WorkerAvailabilityManager initialWorkerId={workerId} isAdmin={!isOwnProfile} />
    </div>
  );
} 