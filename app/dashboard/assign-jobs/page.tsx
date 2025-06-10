import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { AssignmentForm } from './components/assignment-form';
import { getBusinessId } from '@/lib/getBusinessId';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export default async function AssignJobsPage() {
  const supabase = await createClient();

  // Use getUser() instead of getSession() for security
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  const businessId = await getBusinessId(user.id);

  if (!businessId) {
    return (
      <div className="p-6 bg-gray-50/50">
        <div className="max-w-4xl mx-auto bg-white p-6 rounded-lg shadow-sm border">
            <h1 className="text-xl font-semibold text-gray-800">Cannot Create Job</h1>
            <p className="mt-2 text-sm text-gray-600">
            You must be associated with a business to assign jobs. Please contact your administrator or create a business profile in the settings.
            </p>
        </div>
      </div>
    );
  }

  // Fetch clients and workers for the form dropdowns
  const { data: clients } = await supabase
    .from('clients')
    .select('id, name')
    .eq('business_id', businessId);

  const { data: workers } = await supabase
    .from('workers')
    .select('id, name, role')
    .eq('business_id', businessId)
    .eq('status', 'active');

  // Fetch job types for the form
  const { data: jobTypes } = await supabase
    .from('job_types')
    .select('id, name, description, required_skills');

  return (
    <div className="p-4 sm:p-6 lg:p-8">
        <div className="max-w-7xl mx-auto">
            <div className="mb-8">
                <h1 className="text-3xl font-bold text-gray-900 tracking-tight">
                    Create and Assign a New Job
                </h1>
                <p className="mt-2 text-base text-gray-600 max-w-3xl">
                    Follow the steps to fill in job details, set a schedule, and assign the best available worker.
                </p>
            </div>
            <AssignmentForm
                clients={clients || []}
                workers={workers || []}
                jobTypes={jobTypes || []}
            />
        </div>
    </div>
  );
} 