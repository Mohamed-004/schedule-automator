import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { AssignmentForm } from './components/assignment-form';
import { getBusinessId } from '@/lib/getBusinessId';

export const dynamic = 'force-dynamic';

export default async function AssignJobsPage() {
  const cookieStore = cookies() as any;
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
      },
    }
  );

  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    redirect('/login');
  }

  const businessId = await getBusinessId(session.user.id);

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


  return (
    <div className="p-4 sm:p-6 lg:p-8">
        <div className="max-w-7xl mx-auto">
            <div className="mb-8">
                <h1 className="text-2xl md:text-3xl font-bold text-gray-900 tracking-tight">
                    Assign New Job
                </h1>
                <p className="mt-2 text-sm md:text-base text-gray-600">
                    Fill in the details below to schedule a new job and assign it to the best available worker.
                </p>
            </div>
            <AssignmentForm
                clients={clients || []}
                workers={workers || []}
            />
        </div>
    </div>
  );
} 