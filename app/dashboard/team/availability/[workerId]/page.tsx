import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { getBusinessId } from '@/lib/getBusinessId';
import WorkerAvailabilityManager from '@/components/team/WorkerAvailabilityManager';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function WorkerSelfAvailabilityPage({ 
  params 
}: { 
  params: Promise<{ workerId: string }> 
}) {
  const supabase = await createClient();
  const { workerId } = await params;
  
  console.log("Worker ID from params:", workerId);

  // Use getUser() instead of getSession() for security
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    redirect('/login');
  }

  const userId = user.id;
  console.log("Current user ID:", userId);

  // Check if the worker exists - more permissive query first
  const { data: worker, error } = await supabase
    .from('workers')
    .select('id, name, user_id, business_id, email, role')
    .eq('id', workerId)
    .single();

  console.log("Worker query result:", worker, "Error:", error);

  if (!worker) {
    // If first query fails, try a broader search to debug
    const { data: allWorkers } = await supabase
      .from('workers')
      .select('id, name')
      .limit(5);
    
    console.log("Available workers:", allWorkers);
    
    return (
      <div className="container mx-auto py-8">
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <h2 className="text-xl font-semibold text-red-800">Worker Not Found</h2>
          <p className="mt-2 text-red-600">The worker ID '{workerId}' does not exist in the database.</p>
          {error && <p className="mt-2 text-red-600">Error: {error.message}</p>}
        </div>
      </div>
    );
  }

  // Only allow access if this is the worker's own profile or user is a business admin
  const isOwnProfile = worker.user_id === userId;
  const businessId = await getBusinessId(userId);
  const isBusinessAdmin = businessId === worker.business_id;

  if (!isOwnProfile && !isBusinessAdmin) {
    return (
      <div className="container mx-auto py-8">
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <h2 className="text-xl font-semibold text-red-800">Access Denied</h2>
          <p className="mt-2 text-red-600">You do not have permission to view this worker's availability.</p>
        </div>
      </div>
    );
  }

  // Fetch existing weekly availability
  const { data: weeklyAvailability } = await supabase
    .from('worker_weekly_availability')
    .select('*')
    .eq('worker_id', workerId)
    .order('day_of_week', { ascending: true });

  // Fetch existing exceptions
  const { data: exceptions } = await supabase
    .from('worker_availability_exceptions')
    .select('*')
    .eq('worker_id', workerId)
    .gte('date', new Date().toISOString().split('T')[0])
    .order('date', { ascending: true });

  return (
    <div className="container mx-auto py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">{isOwnProfile ? 'Your Availability' : `${worker.name}'s Availability`}</h1>
        <p className="text-gray-600 mt-2">
          Set your regular weekly schedule and any exceptions for specific dates.
        </p>
      </div>

      <WorkerAvailabilityManager initialWorkerId={workerId} isAdmin={isBusinessAdmin} />
    </div>
  );
} 